import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  // RLS garante que só o sender_account_id do mesmo grupo pode excluir
  const { error } = await supabase
    .from("scheduled_notifications")
    .delete()
    .eq("id", id)
    .eq("sent", false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
