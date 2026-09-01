"use server";

import { createClient } from "@/lib/supabase/server";

export async function markTourCompletedAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("users")
    .update({ tour_completed: true })
    .eq("auth_id", user.id);
}
