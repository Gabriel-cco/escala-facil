import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: swapId } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: pRows } = await supabase.rpc("get_account_by_auth_id", { p_auth_id: authUser.id });
  const me = pRows?.[0] as { account_id: string; profile: string } | undefined;
  if (!me) return NextResponse.json({ error: "Account not found" }, { status: 403 });

  const admin = createAdminClient();

  const { data: swap } = await admin
    .from("swap_requests")
    .select("id, requester_account_id, status, event_id")
    .eq("id", swapId)
    .single();

  if (!swap) return NextResponse.json({ error: "Solicitação não encontrada" }, { status: 404 });
  if (swap.status !== "pending") {
    return NextResponse.json({ error: "Solicitação já foi resolvida" }, { status: 409 });
  }

  // Apenas o solicitante, admin ou coordinator do grupo pode cancelar
  const isOwner = swap.requester_account_id === me.account_id;
  const isPrivileged = me.profile === "admin" || me.profile === "coordinator";
  if (!isOwner && !isPrivileged) {
    return NextResponse.json({ error: "Sem permissão para cancelar" }, { status: 403 });
  }

  const { error } = await admin
    .from("swap_requests")
    .update({ status: "cancelled", resolved_at: new Date().toISOString() })
    .eq("id", swapId)
    .eq("status", "pending");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
