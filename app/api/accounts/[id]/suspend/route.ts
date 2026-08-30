import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToAccount } from "@/lib/send-push";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: accountId } = await params;
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: pRows } = await supabase.rpc("get_account_by_auth_id", {
    p_auth_id: authUser.id,
  });
  const actor = pRows?.[0] as
    | { account_id: string; profile: string; group_id: string | null }
    | undefined;

  if (!actor || (actor.profile !== "admin" && actor.profile !== "coordinator")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { suspended_until, suspension_reason } = body as {
    suspended_until: string;
    suspension_reason?: string;
  };

  if (!suspended_until) {
    return NextResponse.json({ error: "suspended_until é obrigatório" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: target } = await admin
    .from("accounts")
    .select("id, group_id, user:users(name)")
    .eq("id", accountId)
    .single();

  if (!target) {
    return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });
  }

  if (actor.profile === "coordinator" && actor.group_id !== target.group_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const reason = suspension_reason?.trim() || null;

  await admin
    .from("accounts")
    .update({ suspended_until, suspension_reason: reason })
    .eq("id", accountId);

  const dataFormatada = new Date(suspended_until + "T00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const title = "Suspensão de escala";
  const notifBody = reason
    ? `Você foi suspenso das escalas até ${dataFormatada}. Motivo: ${reason}`
    : `Você foi suspenso das escalas até ${dataFormatada}. Entre em contato com seu coordenador para mais informações.`;

  await admin.from("notifications").insert({
    account_id: accountId,
    title,
    body: notifBody,
    type: "general",
    sender_account_id: actor.account_id,
  });

  await sendPushToAccount(accountId, { title, body: notifBody, url: "/notificacoes" });

  return NextResponse.json({ ok: true });
}
