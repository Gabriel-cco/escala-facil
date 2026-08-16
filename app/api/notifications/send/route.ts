import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToAccount, sendPushToAll } from "@/lib/send-push";

export async function POST(request: NextRequest) {
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
  const account = pRows?.[0] as
    | { account_id: string; profile: string; group_id: string | null }
    | undefined;

  if (!account || (account.profile !== "admin" && account.profile !== "coordinator")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { title, body: bodyText, groupId } = body as {
    title: string;
    body: string;
    groupId: string | "all";
  };

  if (!title?.trim() || !bodyText?.trim()) {
    return NextResponse.json({ error: "title e body são obrigatórios" }, { status: 400 });
  }

  const targetGroupId =
    account.profile === "coordinator" ? account.group_id : groupId;

  const supabaseAdmin = createAdminClient();

  let recipientsQuery = supabaseAdmin
    .from("accounts")
    .select("id")
    .eq("active", true);

  if (targetGroupId && targetGroupId !== "all") {
    recipientsQuery = recipientsQuery.eq("group_id", targetGroupId);
  }

  const { data: recipients } = await recipientsQuery;

  if (!recipients?.length) {
    return NextResponse.json({ count: 0 });
  }

  const rows = recipients.map((r) => ({
    account_id: r.id,
    title,
    body: bodyText,
    type: "general",
    sender_account_id: account.account_id,
  }));

  await supabaseAdmin.from("notifications").insert(rows);

  const pushPayload = { title, body: bodyText, url: "/notificacoes" };
  if (targetGroupId && targetGroupId !== "all") {
    const { data: accs } = await supabaseAdmin
      .from("accounts")
      .select("id")
      .eq("group_id", targetGroupId)
      .eq("active", true);
    await Promise.allSettled(
      (accs ?? []).map((a) => sendPushToAccount(a.id, pushPayload))
    );
  } else {
    await sendPushToAll(pushPayload);
  }

  return NextResponse.json({ count: recipients.length });
}
