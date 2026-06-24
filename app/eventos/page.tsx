import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Header from "../components/shell/Header";
import { rotuloData, rotuloHora } from "@/lib/datas";

export default async function EventosPage() {
  const supabase = await createClient();

  const { data: eventos, error } = await supabase
    .from("events")
    .select("id, titulo, data_hora, group_id, groups(nome)")
    .order("data_hora", { ascending: true });

  // Total de funções por grupo (para o denominador do progresso).
  const { data: funcoes } = await supabase.from("roles").select("id, group_id");
  const totalPorGrupo = new Map<string, number>();
  funcoes?.forEach((f) => {
    totalPorGrupo.set(f.group_id, (totalPorGrupo.get(f.group_id) ?? 0) + 1);
  });

  // Funções já atribuídas por evento (distintas por função).
  const { data: atribuicoes } = await supabase
    .from("assignments")
    .select("event_id, role_id");
  const atribuidasPorEvento = new Map<string, Set<string>>();
  atribuicoes?.forEach((a) => {
    const set = atribuidasPorEvento.get(a.event_id) ?? new Set<string>();
    set.add(a.role_id);
    atribuidasPorEvento.set(a.event_id, set);
  });

  return (
    <>
      <Header
        variant="root"
        title="Eventos"
        actionLabel="+ Criar evento"
        actionHref="/eventos/novo"
      />
      <main className="flex flex-1 flex-col gap-3 px-[18px] pb-6 pt-0.5 md:gap-2.5 md:p-0">
        <Link
          href="/eventos/novo"
          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-black/20 p-3.5 text-[13.5px] font-semibold text-ink md:hidden"
        >
          + Criar evento
        </Link>

        {error && (
          <p className="text-[13px] text-danger">Erro: {error.message}</p>
        )}

        {eventos && eventos.length === 0 && (
          <p className="text-[13px] text-muted">Nenhum evento cadastrado ainda.</p>
        )}

        {eventos?.map((evento) => {
          // O join groups pode vir como objeto ou array; normalizamos.
          const grupo = Array.isArray(evento.groups)
            ? evento.groups[0]
            : evento.groups;
          const total = totalPorGrupo.get(evento.group_id) ?? 0;
          const atribuidas = atribuidasPorEvento.get(evento.id)?.size ?? 0;
          const pct = total ? Math.round((atribuidas / total) * 100) : 0;

          return (
            <Link
              key={evento.id}
              href={`/eventos/${evento.id}`}
              className="rounded-[18px] border border-black/[0.06] bg-paper px-[18px] py-4 md:rounded-2xl md:px-[22px] md:py-[18px]"
            >
              {/* Mobile: cartão empilhado */}
              <div className="flex flex-col gap-2.5 md:hidden">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="font-serif text-[18px] font-semibold leading-tight text-ink">
                    {evento.titulo}
                  </div>
                  <div className="whitespace-nowrap pt-0.5 text-[12px] font-semibold text-ink-soft">
                    {rotuloData(evento.data_hora)} ·{" "}
                    {rotuloHora(evento.data_hora)}
                  </div>
                </div>
                <div className="text-[12px] text-muted">
                  {grupo?.nome ?? "Sem grupo"}
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="h-[5px] flex-1 overflow-hidden rounded-[3px] bg-surface">
                    <div
                      className="h-full rounded-[3px] bg-ink"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-[11.5px] font-semibold text-ink-soft">
                    {atribuidas}/{total}
                  </div>
                </div>
              </div>

              {/* Web: linha larga */}
              <div className="hidden items-center gap-6 md:flex">
                <div className="min-w-0 flex-1">
                  <div className="font-serif text-[18px] font-semibold text-ink">
                    {evento.titulo}
                  </div>
                  <div className="mt-1 text-[12.5px] text-muted">
                    {grupo?.nome ?? "Sem grupo"}
                  </div>
                </div>
                <div className="w-[120px] flex-none text-[13px] font-semibold text-ink-soft">
                  {rotuloData(evento.data_hora)} · {rotuloHora(evento.data_hora)}
                </div>
                <div className="flex w-[170px] flex-none items-center gap-2.5">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-surface">
                    <div
                      className="h-full rounded-[3px] bg-ink"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="whitespace-nowrap text-[12px] font-semibold text-ink-soft">
                    {atribuidas}/{total}
                  </div>
                </div>
                <div className="flex-none text-[20px] text-[#bdbdb9]">›</div>
              </div>
            </Link>
          );
        })}
      </main>
    </>
  );
}
