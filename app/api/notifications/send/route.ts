import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToAccounts } from "@/lib/send-push";
import { resolverDestinatarios } from "@/lib/resolve-destinatarios";

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
  const {
    title,
    body: bodyText,
    groupId,
    groupIds,
    categoriaId,
    ministerioId,
    accountIds,
    scheduledFor,
  } = body as {
    title: string;
    body: string;
    groupId?: string | "all";
    groupIds?: string[];
    categoriaId?: string;
    ministerioId?: string;
    accountIds?: string[];
    scheduledFor?: string; // YYYY-MM-DD
  };

  if (!title?.trim() || !bodyText?.trim()) {
    return NextResponse.json({ error: "title e body são obrigatórios" }, { status: 400 });
  }

  // Resolve grupo(s) efetivo(s)
  let targetGroupIds: string[] | "all";
  if (account.profile === "coordinator") {
    targetGroupIds = account.group_id ? [account.group_id] : [];
  } else if (Array.isArray(groupIds) && groupIds.length > 0) {
    targetGroupIds = groupIds;
  } else if (!groupId || groupId === "all") {
    targetGroupIds = "all";
  } else {
    targetGroupIds = [groupId];
  }

  // Grupo único em escopo (para segmentação por categoria/ministério)
  const grupoUnico =
    !accountIds?.length &&
    targetGroupIds !== "all" &&
    targetGroupIds.length === 1
      ? targetGroupIds[0]
      : undefined;

  const supabaseAdmin = createAdminClient();

  // ── Agendamento ─────────────────────────────────────────────────────────
  if (scheduledFor) {
    const row: Record<string, unknown> = {
      title: title.trim(),
      body: bodyText.trim(),
      type: "general",
      sender_account_id: account.account_id,
      scheduled_for: scheduledFor,
      target_group_id: grupoUnico ?? (targetGroupIds !== "all" && targetGroupIds.length === 1 ? targetGroupIds[0] : null),
      target_categoria_id: categoriaId ?? null,
      target_ministerio_id: ministerioId ?? null,
      target_account_ids: accountIds?.length ? accountIds : null,
    };

    const { error } = await supabaseAdmin.from("scheduled_notifications").insert(row);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ scheduled: true });
  }

  // ── Envio imediato ───────────────────────────────────────────────────────
  let recipientIds: string[];

  if (accountIds?.length) {
    recipientIds = accountIds;
  } else if (categoriaId || ministerioId) {
    recipientIds = await resolverDestinatarios({
      groupId: grupoUnico,
      categoriaId,
      ministerioId,
    });
  } else if (targetGroupIds === "all") {
    const { data } = await supabaseAdmin
      .from("accounts")
      .select("id")
      .eq("active", true);
    recipientIds = (data ?? []).map((r) => r.id);
  } else {
    if (targetGroupIds.length === 0) return NextResponse.json({ count: 0 });
    const { data } = await supabaseAdmin
      .from("accounts")
      .select("id")
      .eq("active", true)
      .in("group_id", targetGroupIds);
    recipientIds = (data ?? []).map((r) => r.id);
  }

  if (!recipientIds.length) return NextResponse.json({ count: 0 });

  await supabaseAdmin.from("notifications").insert(
    recipientIds.map((id) => ({
      account_id: id,
      title: title.trim(),
      body: bodyText.trim(),
      type: "general",
      sender_account_id: account.account_id,
    }))
  );

  await sendPushToAccounts(recipientIds, {
    title: title.trim(),
    body: bodyText.trim(),
    url: "/notificacoes",
  });

  return NextResponse.json({ count: recipientIds.length });
}
