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

  const admin = createAdminClient();

  const body = await request.json() as {
    assignmentId?: string;
    eventId: string;
    roleId?: string;
    ministerioId?: string;
    reason?: string;
  };
  const { eventId, reason } = body;
  if (!eventId) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const hoje = new Date().toISOString().slice(0, 10);

  const { data: evento } = await admin
    .from("events")
    .select("id, name, date, group_id")
    .eq("id", eventId)
    .single();
  if (!evento) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
  if (evento.date < hoje) {
    return NextResponse.json({ error: "Não é possível solicitar troca de evento já realizado" }, { status: 422 });
  }

  // ── TROCA MINISTERIAL ──────────────────────────────────────────────────────
  if (body.ministerioId) {
    const { ministerioId } = body;

    if (me.profile === "admin") {
      // Admin pode solicitar por qualquer ministério
    } else if (me.profile === "coordinator") {
      // Coordinator deve pertencer ao mesmo grupo do ministério
      const [{ data: minRow }, { data: myAcc }] = await Promise.all([
        admin.from("ministerios").select("group_id").eq("id", ministerioId).single(),
        admin.from("accounts").select("group_id").eq("id", me.account_id).single(),
      ]);
      if (!minRow || minRow.group_id !== myAcc?.group_id) {
        return NextResponse.json(
          { error: "Este ministério não pertence ao seu grupo" },
          { status: 403 }
        );
      }
    } else {
      // Membro: deve ser coordenador desse ministério específico
      const { data: minCoord } = await admin
        .from("ministerio_members")
        .select("account_id")
        .eq("account_id", me.account_id)
        .eq("ministerio_id", ministerioId)
        .eq("is_coordinator", true)
        .maybeSingle();
      if (!minCoord) {
        return NextResponse.json(
          { error: "Você não é coordenador deste ministério" },
          { status: 403 }
        );
      }
    }

    // Sem swap pendente para o mesmo evento + ministério
    const { data: existente } = await admin
      .from("swap_requests")
      .select("id")
      .eq("event_id", eventId)
      .eq("ministerio_id", ministerioId)
      .eq("status", "pending")
      .maybeSingle();
    if (existente) {
      return NextResponse.json(
        { error: "Já existe uma solicitação pendente para este evento e ministério" },
        { status: 409 }
      );
    }

    const { data: swap, error: swapErr } = await admin
      .from("swap_requests")
      .insert({
        event_id: eventId,
        ministerio_id: ministerioId,
        requester_account_id: me.account_id,
        reason: reason?.trim() || null,
      })
      .select("id")
      .single();
    if (swapErr || !swap) {
      return NextResponse.json({ error: swapErr?.message ?? "Erro ao criar solicitação" }, { status: 500 });
    }

    // Notifica coordenadores de outros ministérios do grupo
    const { data: outrosCoords } = await admin
      .from("ministerio_members")
      .select("account_id, ministerio:ministerios(group_id)")
      .eq("is_coordinator", true)
      .neq("ministerio_id", ministerioId)
      .neq("account_id", me.account_id);

    const outrosCoordsIds = (outrosCoords ?? [])
      .filter((r) => {
        const m = Array.isArray(r.ministerio) ? r.ministerio[0] : r.ministerio;
        return (m as { group_id?: string } | null)?.group_id === evento.group_id;
      })
      .map((r) => r.account_id);

    const { data: ministerioRow } = await admin
      .from("ministerios")
      .select("name")
      .eq("id", ministerioId)
      .single();
    const ministerioNome = (ministerioRow as { name?: string } | null)?.name ?? "Ministério";
    const dataLabel = rotuloData(evento.date);
    const { data: requesterUser } = await admin.from("accounts").select("user:users(name)").eq("id", me.account_id).single();
    const requesterName = (() => { const u = requesterUser?.user; return (Array.isArray(u) ? u[0] : u)?.name ?? "Coordenador"; })();

    if (outrosCoordsIds.length > 0) {
      await admin.from("notifications").insert(
        outrosCoordsIds.map((accountId) => ({
          account_id: accountId,
          title: "Troca de ministério solicitada",
          body: `${ministerioNome} precisa de cobertura em ${evento.name} — ${dataLabel}`,
          type: "swap_request",
          reference_type: "swap_request",
          reference_id: swap.id,
          sender_account_id: me.account_id,
        }))
      );
      await sendPushToAccounts(outrosCoordsIds, {
        title: "Troca de ministério",
        body: `${requesterName} (${ministerioNome}) precisa de cobertura em ${dataLabel}`,
        url: `/trocas`,
      });
    }

    return NextResponse.json({ id: swap.id });
  }

  // ── TROCA INDIVIDUAL (role-based) ──────────────────────────────────────────
  const { assignmentId, roleId } = body;
  if (!assignmentId || !roleId) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const { data: existente } = await admin
    .from("swap_requests")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("status", "pending")
    .maybeSingle();
  if (existente) {
    return NextResponse.json({ error: "Já existe uma solicitação pendente para esta atribuição" }, { status: 409 });
  }

  const [{ data: role }, { data: requesterUser }] = await Promise.all([
    admin.from("roles").select("name, required_qualification_id").eq("id", roleId).single(),
    admin.from("accounts").select("user:users(name)").eq("id", me.account_id).single(),
  ]);
  const roleName = (role as { name?: string } | null)?.name ?? "função";
  const requesterName = (() => {
    const u = requesterUser?.user;
    return (Array.isArray(u) ? u[0] : u)?.name ?? "Membro";
  })();

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

  const { data: eligible } = await admin
    .from("accounts")
    .select("id")
    .eq("group_id", evento.group_id)
    .eq("active", true)
    .neq("id", me.account_id)
    .or(`suspended_until.is.null,suspended_until.lt.${evento.date}`);

  let eligibleIds = (eligible ?? []).map((a) => a.id);

  const requiredQualId = (role as { required_qualification_id?: string | null } | null)?.required_qualification_id;
  if (requiredQualId) {
    const { data: qualified } = await admin
      .from("account_qualifications")
      .select("account_id")
      .eq("qualification_id", requiredQualId);
    const qualifiedSet = new Set((qualified ?? []).map((q) => q.account_id));
    eligibleIds = eligibleIds.filter((id) => qualifiedSet.has(id));
  }
  const dataLabel = rotuloData(evento.date);

  if (eligibleIds.length > 0) {
    await admin.from("notifications").insert(
      eligibleIds.map((accountId) => ({
        account_id: accountId,
        title: "Solicitação de troca",
        body: `${requesterName} precisa de alguém para ${roleName} em ${dataLabel}`,
        type: "swap_request",
        reference_type: "swap_request",
        reference_id: swap.id,
        sender_account_id: me.account_id,
      }))
    );
    await sendPushToAccounts(eligibleIds, {
      title: "Solicitação de troca",
      body: `${requesterName} precisa de alguém para ${roleName} em ${dataLabel}`,
      url: `/trocas`,
    });
  }

  return NextResponse.json({ id: swap.id });
}
