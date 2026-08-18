import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Busca o usuário autenticado uma única vez por request. `getUser()` é um
 * round-trip de rede ao servidor de auth do Supabase; sem esse cache, o layout
 * e a página o repetem na mesma navegação. `cache()` deduplica dentro do mesmo
 * render server-side (mesmo request).
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export type CurrentAccount = {
  account_id: string;
  profile: "admin" | "coordinator" | "member";
  group_id: string | null;
} | null;

/**
 * Account do usuário logado (profile/group), também deduplicado por request.
 * Usa a RPC SECURITY DEFINER get_account_by_auth_id (contorna RLS).
 */
export const getCurrentAccount = cache(async (): Promise<CurrentAccount> => {
  const user = await getAuthUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_account_by_auth_id", {
    p_auth_id: user.id,
  });
  return (data?.[0] as CurrentAccount) ?? null;
});
