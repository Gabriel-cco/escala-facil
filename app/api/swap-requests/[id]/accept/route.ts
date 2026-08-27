import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToAccounts } from "@/lib/send-push";
import { rotuloData } from "@/lib/datas";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: swapId } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: pRows } = await supabase.rpc("get_account_by_auth_id", { p_auth_id: authUser.id });
  const me = pRows?.[0] as { account_id: string } | undefined;
  if (!me) return NextResponse.json({ error: "Account not found" }, { status: 403 });

  const admin = createAdminClient();

  // Busca o swap antes de aceitar (para ter os dados para notificação)
  const { data: swap } = await admin
    .from("swap_requests")
    .select("id, event_id, role_id, requester_account_id, status")
    .eq("id", swapId)
    .single();

  if (!swap) return NextResponse.json({ error: "Solicitação não encontrada" }, { status: 404 });
  if (swap.status !== "pending") {
    return NextResponse.json({ error: "Solicitação já foi resolvida" }, { status: 409 });
  }
  if (swap.requester_account_id === me.account_id) {
    return NextResponse.json({ error: "Você não pode aceitar a própria solicitação" }, { status: 422 });
  }

  // Chama a RPC atômica
  const { error: rpcErr } = await admin.rpc("accept_swap_request", {
    p_swap_request_id: swapId,
    p_accepter_account_id: me.account_id,
  });

  if (rpcErr) {
    return NextResponse.json({ error: rpcErr.message }, { status: 409 });
  }

  // Busca dados para notificações
  const [{ data: evento }, { data: role }, { data: accepterAcc }] = await Promise.all([
    admin.from("events").select("name, date, group_id").eq("id", swap.event_id).single(),
    admin.from("roles").select("name").eq("id", swap.role_id).single(),
    admin.from("accounts").select("user:users(name)").eq("id", me.account_id).single(),
  ]);

  const dataLabel = rotuloData(evento?.date ?? "");
  const roleName = role?.name ?? "função";
  const accepterName = (() => {
    const u = accepterAcc?.user;
    return (Array.isArray(u) ? u[0] : u)?.name ?? "Membro";
  })();

  // Notifica solicitante e aceitador
  await admin.from("notifications").insert([
    {
      account_id: swap.requester_account_id,
      title: "Troca confirmada",
      body: `${accepterName} assumiu ${roleName} em ${dataLabel}`,
      type: "swap_accepted",
      reference_type: "event",
      reference_id: swap.event_id,
    },
    {
      account_id: me.account_id,
      title: "Você assumiu uma troca",
      body: `Você agora está escalado para ${roleName} em ${dataLabel}`,
      type: "swap_accepted",
      reference_type: "event",
      reference_id: swap.event_id,
    },
  ]);

  // Notifica o restante do grupo (escala atualizada)
  const { data: outros } = await admin
    .from("accounts")
    .select("id")
    .eq("group_id", evento?.group_id ?? "")
    .eq("active", true)
    .not("id", "in", `(${swap.requester_account_id},${me.account_id})`);

  const outrosIds = (outros ?? []).map((a) => a.id);
  if (outrosIds.length > 0) {
    await admin.from("notifications").insert(
      outrosIds.map((accountId) => ({
        account_id: accountId,
        title: "Escala atualizada",
        body: `A escala de ${dataLabel} foi atualizada: ${accepterName} agora está em ${roleName}`,
        type: "schedule",
        reference_type: "event",
        reference_id: swap.event_id,
      }))
    );
    await sendPushToAccounts(outrosIds, {
      title: "Escala atualizada",
      body: `A escala de ${dataLabel} foi atualizada`,
      url: `/eventos/${swap.event_id}`,
    });
  }

  // Push para solicitante e aceitador
  await sendPushToAccounts([swap.requester_account_id, me.account_id], {
    title: "Troca confirmada",
    body: `${roleName} em ${dataLabel} foi trocado`,
    url: `/eventos/${swap.event_id}`,
  });

  // Log fire-and-forget — usa o server client (sessão autenticada via cookie).
  supabase.from("access_logs").insert({
    account_id: me.account_id,
    action: "aceitar_troca",
    path: `/api/swap-requests/${swapId}/accept`,
    metadata: { swap_request_id: swapId },
  }).then(({ error }) => {
    if (error) console.warn("Falha ao registrar log aceitar_troca:", error);
  });

  return NextResponse.json({ ok: true });
}
