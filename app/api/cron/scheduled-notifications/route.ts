import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToAccounts } from "@/lib/send-push";
import { resolverDestinatarios } from "@/lib/resolve-destinatarios";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const admin = createAdminClient();

  const { data: pendentes, error } = await admin
    .from("scheduled_notifications")
    .select("*")
    .eq("sent", false)
    .lte("scheduled_for", hoje);

  if (error) {
    console.error("[cron/scheduled-notifications] erro:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[cron/scheduled-notifications] ${pendentes?.length ?? 0} pendente(s) para ${hoje}`);

  let processadas = 0;

  for (const notif of pendentes ?? []) {
    const destinatarios = await resolverDestinatarios({
      groupId: notif.target_group_id,
      categoriaId: notif.target_categoria_id,
      ministerioId: notif.target_ministerio_id,
      accountIds: notif.target_account_ids,
    });

    if (!destinatarios.length) {
      await admin.from("scheduled_notifications").update({ sent: true }).eq("id", notif.id);
      continue;
    }

    await admin.from("notifications").insert(
      destinatarios.map((accountId: string) => ({
        account_id: accountId,
        title: notif.title,
        body: notif.body,
        type: notif.type,
        sender_account_id: notif.sender_account_id,
      }))
    );

    await sendPushToAccounts(destinatarios, {
      title: notif.title,
      body: notif.body,
      url: "/notificacoes",
    });

    await admin.from("scheduled_notifications").update({ sent: true }).eq("id", notif.id);
    processadas++;

    console.log(
      `[cron/scheduled-notifications] "${notif.title}" → ${destinatarios.length} destinatário(s)`
    );
  }

  return NextResponse.json({ processadas });
}
