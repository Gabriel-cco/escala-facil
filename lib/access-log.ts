import { createClient } from "@/lib/supabase/client";

export function logAccess(
  accountId: string,
  action: string,
  metadata?: Record<string, unknown>
) {
  const supabase = createClient();
  supabase
    .from("access_logs")
    .insert({
      account_id: accountId,
      action,
      path: typeof window !== "undefined" ? window.location.pathname : null,
      metadata: metadata ?? null,
    })
    .then(({ error }) => {
      if (error) console.warn("Falha ao registrar log de acesso:", error);
    });
}

export function logPublicScheduleView(groupId: string) {
  const supabase = createClient();
  supabase
    .from("access_logs")
    .insert({
      account_id: null,
      group_id: groupId,
      action: "view_public_schedule",
      path: typeof window !== "undefined" ? window.location.pathname : null,
    })
    .then(({ error }) => {
      if (error) console.warn("Falha ao registrar view pública:", error);
    });
}
