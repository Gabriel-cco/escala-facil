import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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

  const { data, error } = await supabase
    .from("scheduled_notifications")
    .select("id, title, body, scheduled_for, target_group_id, target_account_ids, created_at")
    .eq("sent", false)
    .order("scheduled_for", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
