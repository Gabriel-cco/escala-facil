import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

if (
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY &&
  process.env.VAPID_SUBJECT
) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendPushToAccount(accountId: string, payload: PushPayload) {
  if (!process.env.VAPID_PRIVATE_KEY) return;

  const supabase = createAdminClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("account_id", accountId);

  if (!subs?.length) return;

  await Promise.allSettled(
    subs.map((sub) =>
      webpush
        .sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        )
        .catch((err: { statusCode?: number }) => {
          if (err.statusCode === 410) {
            supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
        })
    )
  );
}

export async function sendPushToGroup(groupId: string, payload: PushPayload) {
  if (!process.env.VAPID_PRIVATE_KEY) return;

  const supabase = createAdminClient();
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id")
    .eq("group_id", groupId)
    .eq("active", true);

  if (!accounts?.length) return;

  await Promise.allSettled(accounts.map((a) => sendPushToAccount(a.id, payload)));
}

export async function sendPushToAll(payload: PushPayload) {
  if (!process.env.VAPID_PRIVATE_KEY) return;

  const supabase = createAdminClient();
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id")
    .eq("active", true);

  if (!accounts?.length) return;

  await Promise.allSettled(accounts.map((a) => sendPushToAccount(a.id, payload)));
}
