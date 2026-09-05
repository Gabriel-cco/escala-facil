import { cookies } from "next/headers";
import { ACTIVE_GROUP_COOKIE, ACTIVE_ACCOUNT_COOKIE } from "./active-group";
import { getAllAccounts } from "./current-user";

/**
 * Grupo ativo para filtrar as queries dos Server Components.
 *
 * - Admin: lê ef_active_group (pode ser null = visão geral)
 * - Não-admin com múltiplas contas: lê ef_active_account → group_id dessa conta
 * - Não-admin com 1 conta: group_id fixo do account
 */
export async function getActiveGroupId(): Promise<string | null> {
  const store = await cookies();

  const accounts = await getAllAccounts();
  if (accounts.length === 0) return null;

  const isAdmin = accounts.some((a) => a.profile === "admin");

  if (isAdmin) {
    // Admin usa ef_active_group (null = visão geral)
    const valor = store.get(ACTIVE_GROUP_COOKIE)?.value;
    return valor && valor.length > 0 ? valor : null;
  }

  if (accounts.length === 1) {
    return accounts[0].group_id;
  }

  // Múltiplas contas não-admin: usa ef_active_account
  const activeAccountId = store.get(ACTIVE_ACCOUNT_COOKIE)?.value;
  if (activeAccountId) {
    const match = accounts.find((a) => a.account_id === activeAccountId);
    if (match) return match.group_id;
  }

  return accounts[0].group_id;
}
