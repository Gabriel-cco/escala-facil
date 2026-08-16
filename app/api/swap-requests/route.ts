import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToAccounts } from "@/lib/send-push";
import { rotuloData } from "@/lib/datas";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: pRows } = await supabase.rpc("get_account_by_auth_id", { p_auth_id: authUser.id });
  const me = pRows?.[0] as { account_id: string; profile: string } | undefined;
  if (!me) return NextResponse.json({ error: "Account not found" }, { status: 403 });

  const body = await request.json() as {
    assignmentId: string;
    eventId: string;
    roleId: string;
    reason?: string;
  };
  const { assignmentId, eventId, roleId, reason } = body;
  if (!assignmentId || !eventId || !roleId) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Valida que o evento não é passado
  const { data: evento } = await admin
    .from("events")
    .select("id, name, date, group_id")
    .eq("id", eventId)
    .single();
  if (!evento) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });

  const hoje = new Date().toISOString().slice(0, 10);
  if (evento.date < hoje) {
    return NextResponse.json({ error: "Não é possível solicitar troca de evento já realizado" }, { status: 422 });
  }

  // Valida que não existe solicitação pendente para esta atribuição
  const { data: existente } = await admin
    .from("swap_requests")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("status", "pending")
    .maybeSingle();
  if (existente) {
    return NextResponse.json({ error: "Já existe uma solicitação pendente para esta atribuição" }, { status: 409 });
  }

  // Busca nome da função e do solicitante
  const [{ data: role }, { data: requesterUser }] = await Promise.all([
    admin.from("roles").select("name").eq("id", roleId).single(),
    admin.from("accounts").select("user:users(name)").eq("id", me.account_id).single(),
  ]);
  const roleName = role?.name ?? "função";
  const requesterName = (() => {
    const u = requesterUser?.user;
    return (Array.isArray(u) ? u[0] : u)?.name ?? "Membro";
  })();

  // Cria a solicitação
  const { data: swap, error: swapErr } = await admin
    .from("swap_requests")
    .insert({
      assignment_id: assignmentId,
      event_id: eventId,
      role_id: roleId,
      requester_account_id: me.account_id,
      reason: reason?.trim() || null,
    })
    .select("id")
    .single();

  if (swapErr || !swap) {
    return NextResponse.json({ error: swapErr?.message ?? "Erro ao criar solicitação" }, { status: 500 });
  }

  // Membros elegíveis para receber a notificação (exceto o próprio solicitante)
  const { data: eligible } = await admin
    .from("accounts")
    .select("id")
    .eq("group_id", evento.group_id)
    .eq("active", true)
    .neq("id", me.account_id)
    .or(`suspended_until.is.null,suspended_until.lt.${evento.date}`);

  const eligibleIds = (eligible ?? []).map((a) => a.id);
  const dataLabel = rotuloData(evento.date);

  if (eligibleIds.length > 0) {
    const notificationRows = eligibleIds.map((accountId) => ({
      account_id: accountId,
      title: "Solicitação de troca",
      body: `${requesterName} precisa de alguém para ${roleName} em ${dataLabel}`,
      type: "swap_request",
      reference_type: "swap_request",
      reference_id: swap.id,
      sender_account_id: me.account_id,
    }));
    await admin.from("notifications").insert(notificationRows);

    await sendPushToAccounts(eligibleIds, {
      title: "Solicitação de troca",
      body: `${requesterName} precisa de alguém para ${roleName} em ${dataLabel}`,
      url: `/trocas`,
    });
  }

  return NextResponse.json({ id: swap.id });
}
