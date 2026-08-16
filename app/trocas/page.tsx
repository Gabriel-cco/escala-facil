import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Header from "@/app/components/shell/Header";
import TrocasCliente from "./TrocasCliente";
import { rotuloData } from "@/lib/datas";

const SELECT_SWAP = [
  "id", "assignment_id", "event_id", "role_id",
  "requester_account_id", "accepter_account_id",
  "status", "reason", "created_at", "resolved_at",
  "event:events(name, date, group_id)",
  "role:roles(name)",
  "requester:accounts!swap_requests_requester_account_id_fkey(user:users(name))",
  "accepter:accounts!swap_requests_accepter_account_id_fkey(user:users(name))",
].join(", ");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseName(acc: any): string | null {
  if (!acc) return null;
  const a = Array.isArray(acc) ? acc[0] : acc;
  if (!a) return null;
  const u = Array.isArray(a.user) ? a.user[0] : a.user;
  return u?.name ?? null;
}

export default async function TrocasPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;

  const { data: pRows } = await supabase.rpc("get_account_by_auth_id", { p_auth_id: authUser.id });
  const meRaw = pRows?.[0] as {
    account_id: string;
    profile: string;
    group_id: string | null;
  } | undefined;
  if (!meRaw) return null;

  const accountId = meRaw.account_id;
  const profile = meRaw.profile;
  const groupId = meRaw.group_id;

  const admin = createAdminClient();

  // Buscar event_ids do grupo para filtrar (não-admin)
  let eventIdsDoGrupo: string[] | null = null;
  if (profile !== "admin" && groupId) {
    const { data: evts } = await admin
      .from("events")
      .select("id")
      .eq("group_id", groupId);
    eventIdsDoGrupo = (evts ?? []).map((e) => e.id);
  }

  async function fetchSwaps(statusList: string[], ascending: boolean) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (admin as any)
      .from("swap_requests")
      .select(SELECT_SWAP)
      .in("status", statusList)
      .order("created_at", { ascending });

    if (eventIdsDoGrupo !== null) {
      if (eventIdsDoGrupo.length === 0) return [];
      q = q.in("event_id", eventIdsDoGrupo);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await q.limit(50) as any;
    return (data ?? []) as unknown[];
  }

  const [pendingRows, resolvedRows, myAssignmentResult] = await Promise.all([
    fetchSwaps(["pending"], false),
    fetchSwaps(["accepted", "cancelled"], false),
    admin.from("assignments").select("event_id").eq("account_id", accountId),
  ]);

  const myEventIds = new Set((myAssignmentResult.data ?? []).map((a) => a.event_id));
  const hoje = new Date().toISOString().slice(0, 10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function parseRow(r: any) {
    const evt = Array.isArray(r.event) ? r.event[0] : r.event;
    const role = Array.isArray(r.role) ? r.role[0] : r.role;
    const canAccept =
      r.status === "pending" &&
      r.requester_account_id !== accountId &&
      !myEventIds.has(r.event_id) &&
      (evt?.date ?? "") >= hoje;

    return {
      id: r.id as string,
      assignmentId: r.assignment_id as string,
      eventId: r.event_id as string,
      roleId: r.role_id as string,
      requesterAccountId: r.requester_account_id as string,
      accepterAccountId: (r.accepter_account_id as string | null) ?? null,
      status: r.status as "pending" | "accepted" | "cancelled",
      reason: (r.reason as string | null) ?? null,
      createdAt: r.created_at as string,
      resolvedAt: (r.resolved_at as string | null) ?? null,
      eventName: evt?.name ?? "Evento",
      eventDate: evt?.date ?? "",
      dataLabel: rotuloData(evt?.date ?? ""),
      roleName: role?.name ?? "Função",
      requesterName: parseName(r.requester) ?? "Membro",
      accepterName: parseName(r.accepter),
      isOwn: r.requester_account_id === accountId,
      canAccept,
    };
  }

  return (
    <>
      <Header variant="root" title="Trocas" />
      <TrocasCliente
        accountId={accountId}
        profile={profile as "admin" | "coordinator" | "member"}
        pending={pendingRows.map(parseRow)}
        resolved={resolvedRows.map(parseRow)}
      />
    </>
  );
}
