import { cookies } from "next/headers";
import { ACTIVE_GROUP_COOKIE } from "./active-group";

/**
 * Grupo ativo para filtrar as queries dos Server Components.
 * Retorna null em "visão geral" (admin sem grupo selecionado). Para
 * coordinator/member o RLS já restringe ao grupo deles — o filtro é só UX.
 */
export async function getActiveGroupId(): Promise<string | null> {
  const store = await cookies();
  const valor = store.get(ACTIVE_GROUP_COOKIE)?.value;
  return valor && valor.length > 0 ? valor : null;
}
