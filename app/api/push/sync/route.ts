import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const account = pRows?.[0] as { account_id: string } | undefined;
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 403 });
  }

  const body = await request.json();
  const { endpoint, p256dh, auth, userAgent } = body as {
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent: string;
  };

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Missing subscription fields" }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
    {
      account_id: account.account_id,
      endpoint,
      p256dh,
      auth,
      user_agent: userAgent ?? "",
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    console.error("[push/sync] Erro ao upsert:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { endpoint } = await request.json() as { endpoint: string };
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });

  const supabaseAdmin = createAdminClient();
  await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", endpoint);

  return NextResponse.json({ ok: true });
}
