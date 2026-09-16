import { createAdminClient } from "@/lib/supabase/admin";

export type CriteriosDestinatario = {
  groupId?: string | null;
  categoriaId?: string | null;
  ministerioId?: string | null;
  accountIds?: string[] | null;
  eventoId?: string;
};

export async function resolverDestinatarios(
  criterios: CriteriosDestinatario
): Promise<string[]> {
  if (criterios.accountIds?.length) return criterios.accountIds;

  const supabase = createAdminClient();

  if (criterios.eventoId) {
    const [{ data: assignments }, { data: evento }] = await Promise.all([
      supabase.from("assignments").select("account_id").eq("event_id", criterios.eventoId),
      supabase.from("events").select("ministerio_id").eq("id", criterios.eventoId).single(),
    ]);
    const diretos = (assignments ?? []).map((a) => a.account_id as string);
    let doMinisterio: string[] = [];
    if (evento?.ministerio_id) {
      const { data: minMembers } = await supabase
        .from("ministerio_members")
        .select("account_id")
        .eq("ministerio_id", evento.ministerio_id);
      doMinisterio = (minMembers ?? []).map((m) => m.account_id as string);
    }
    return [...new Set([...diretos, ...doMinisterio])];
  }

  let idsQualificados: string[] | null = null;
  if (criterios.categoriaId) {
    const { data } = await supabase
      .from("account_qualifications")
      .select("account_id")
      .eq("qualification_id", criterios.categoriaId);
    idsQualificados = (data ?? []).map((d) => d.account_id);
    if (!idsQualificados.length) return [];
  }

  let idsMinisterio: string[] | null = null;
  if (criterios.ministerioId) {
    const { data } = await supabase
      .from("ministerio_members")
      .select("account_id")
      .eq("ministerio_id", criterios.ministerioId);
    idsMinisterio = (data ?? []).map((d) => d.account_id);
    if (!idsMinisterio.length) return [];
  }

  let query = supabase.from("accounts").select("id").eq("active", true);

  if (criterios.groupId) query = query.eq("group_id", criterios.groupId);
  if (idsQualificados) query = query.in("id", idsQualificados);
  if (idsMinisterio) query = query.in("id", idsMinisterio);

  const { data: contas } = await query;
  return (contas ?? []).map((c) => c.id);
}
