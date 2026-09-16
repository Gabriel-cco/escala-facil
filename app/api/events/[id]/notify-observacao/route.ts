import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToAccounts } from "@/lib/send-push";
import { resolverDestinatarios } from "@/lib/resolve-destinatarios";
import { rotuloData } from "@/lib/datas";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: pRows } = await supabase.rpc("get_account_by_auth_id", {
    p_auth_id: authUser.id,
  });
  const account = pRows?.[0] as
    | { account_id: string; profile: string; group_id: string | null }
    | undefined;

  if (!account || (account.profile !== "admin" && account.profile !== "coordinator")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const observacoes = typeof body.observacoes === "string" ? body.observacoes.trim() : "";
  if (!observacoes) {
    return NextResponse.json({ error: "Observações não fornecidas" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: evento } = await admin
    .from("events")
    .select("id, name, date, group_id")
    .eq("id", eventId)
    .single();

  if (!evento) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });

  if (account.profile === "coordinator" && account.group_id !== evento.group_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const destinatarios = await resolverDestinatarios({ eventoId: eventId });
  if (!destinatarios.length) return NextResponse.json({ count: 0 });

  const dataLabel = rotuloData(evento.date);
  const title = `Aviso — ${evento.name}`;
  const msgBody = `${dataLabel}\n\n${observacoes}`;

  await admin.from("notifications").insert(
    destinatarios.map((accountId) => ({
      account_id: accountId,
      title,
      body: msgBody,
      type: "aviso",
      reference_type: "event",
      reference_id: eventId,
      sender_account_id: account.account_id,
    }))
  );

  await sendPushToAccounts(destinatarios, { title, body: msgBody, url: "/notificacoes" });

  return NextResponse.json({ count: destinatarios.length });
}
