import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_ACCOUNT_COOKIE } from "@/lib/active-group";

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
 * Retorna todas as contas do usuário logado (pode ser mais de uma no modelo
 * multi-perfil). A RPC não tem LIMIT — retorna admin primeiro, depois
 * coordinator, depois member, ordenado por created_at dentro de cada perfil.
 */
export const getAllAccounts = cache(async (): Promise<NonNullable<CurrentAccount>[]> => {
  const user = await getAuthUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_account_by_auth_id", {
    p_auth_id: user.id,
  });
  return (data ?? []) as NonNullable<CurrentAccount>[];
});

/**
 * Conta ativa do usuário logado.
 *
 * - 0 contas → null (sem acesso)
 * - 1 conta  → essa conta (comportamento idêntico ao antigo)
 * - 2+ contas → lê o cookie `ef_active_account` para saber qual foi selecionada;
 *   se não houver cookie, usa a conta admin (se existir) ou a primeira da lista.
 */
export const getCurrentAccount = cache(async (): Promise<CurrentAccount> => {
  const accounts = await getAllAccounts();
  if (accounts.length === 0) return null;
  if (accounts.length === 1) return accounts[0];

  // Múltiplas contas: tenta o cookie de seleção
  const store = await cookies();
  const activeAccountId = store.get(ACTIVE_ACCOUNT_COOKIE)?.value;
  if (activeAccountId) {
    const match = accounts.find((a) => a.account_id === activeAccountId);
    if (match) return match;
  }

  // Admin não usa ef_active_account para escolher grupo — tem ef_active_group
  const adminAccount = accounts.find((a) => a.profile === "admin");
  if (adminAccount) return adminAccount;

  // Fallback: primeira conta
  return accounts[0];
});
