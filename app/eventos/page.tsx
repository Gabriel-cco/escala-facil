import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Header from "../components/shell/Header";
import { rotuloData, rotuloHora, rotuloMes, chaveMes } from "@/lib/datas";
import DeleteEventoButton from "./DeleteEventoButton";
import CalendarioEventos, { type EventoCal } from "./CalendarioEventos";

export default async function EventosPage({
  searchParams,
}: {
  searchParams: Promise<{ passados?: string; grupo?: string; vista?: string }>;
}) {
  const { passados, grupo, vista } = await searchParams;
  const mostrarPassados = passados === "1";
  const vistaCalendario = vista === "calendario";

  const supabase = await createClient();

  const { data: eventos, error } = await supabase
    .from("events")
    .select("id, titulo, data_hora, group_id, groups(nome)")
    .order("data_hora", { ascending: true });

  type Evento = NonNullable<typeof eventos>[number];

  // Grupos para o filtro (chips).
  const { data: grupos } = await supabase
    .from("groups")
    .select("id, nome")
    .order("nome", { ascending: true });

  // Grupo selecionado no filtro (null = todos). Valida contra os grupos reais.
  const grupoFiltro =
    grupo && grupos?.some((g) => g.id === grupo) ? grupo : null;

  // Monta hrefs preservando os filtros atuais, com sobrescritas pontuais.
  function montarHref(over: {
    passados?: boolean;
    grupo?: string | null;
    vista?: string | null;
  }) {
    const p = new URLSearchParams();
    const passadosFinal = over.passados ?? mostrarPassados;
    const grupoFinal = over.grupo === undefined ? grupoFiltro : over.grupo;
    const vistaFinal =
      over.vista === undefined ? (vistaCalendario ? "calendario" : null) : over.vista;
    if (passadosFinal) p.set("passados", "1");
    if (grupoFinal) p.set("grupo", grupoFinal);
    if (vistaFinal === "calendario") p.set("vista", "calendario");
    const qs = p.toString();
    return qs ? `/eventos?${qs}` : "/eventos";
  }

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

  // Eventos cuja data já passou ficam ocultos por padrão (a partir da
  // meia-noite de hoje — eventos de hoje permanecem visíveis o dia todo).
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);
  const todos = eventos ?? [];
  const filtrados = grupoFiltro
    ? todos.filter((e) => e.group_id === grupoFiltro)
    : todos;
  const ehFuturo = (e: Evento) => new Date(e.data_hora) >= inicioHoje;
  const totalPassados = filtrados.filter((e) => !ehFuturo(e)).length;
  const visiveis = mostrarPassados ? filtrados : filtrados.filter(ehFuturo);

  // O calendário mostra todos os eventos do grupo filtrado (passados inclusos).
  const eventosCal: EventoCal[] = filtrados.map((e) => {
    const g = Array.isArray(e.groups) ? e.groups[0] : e.groups;
    return {
      id: e.id,
      titulo: e.titulo,
      dataHora: e.data_hora,
      grupoNome: g?.nome ?? "Sem grupo",
      atribuidas: atribuidasPorEvento.get(e.id)?.size ?? 0,
      total: totalPorGrupo.get(e.group_id) ?? 0,
    };
  });

  // Agrupa por mês mantendo a ordem cronológica (a query já vem ascendente).
  const gruposPorMes: { chave: string; rotulo: string; eventos: Evento[] }[] =
    [];
  const indiceMes = new Map<string, number>();
  visiveis.forEach((e) => {
    const chave = chaveMes(e.data_hora);
    let i = indiceMes.get(chave);
    if (i === undefined) {
      i = gruposPorMes.length;
      indiceMes.set(chave, i);
      gruposPorMes.push({ chave, rotulo: rotuloMes(e.data_hora), eventos: [] });
    }
    gruposPorMes[i].eventos.push(e);
  });

  function renderEventoCard(evento: Evento) {
    // O join groups pode vir como objeto ou array; normalizamos.
    const grupo = Array.isArray(evento.groups)
      ? evento.groups[0]
      : evento.groups;
    const total = totalPorGrupo.get(evento.group_id) ?? 0;
    const atribuidas = atribuidasPorEvento.get(evento.id)?.size ?? 0;
    const pct = total ? Math.round((atribuidas / total) * 100) : 0;

    return (
      <div
        key={evento.id}
        className="rounded-[18px] border border-black/[0.06] bg-paper md:rounded-2xl"
      >
        {/* Mobile: cartão empilhado */}
        <div className="flex items-stretch md:hidden">
          <Link
            href={`/eventos/${evento.id}`}
            className="flex min-w-0 flex-1 flex-col gap-2.5 py-4 pl-[18px] pr-3"
          >
            <div className="flex items-start justify-between gap-2.5">
              <div className="font-serif text-[18px] font-semibold leading-tight text-ink">
                {evento.titulo}
              </div>
              <div className="whitespace-nowrap pt-0.5 text-[12px] font-semibold text-ink-soft">
                {rotuloData(evento.data_hora)} · {rotuloHora(evento.data_hora)}
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
          </Link>
          <div className="flex flex-none items-center pr-2">
            <DeleteEventoButton eventId={evento.id} titulo={evento.titulo} />
          </div>
        </div>

        {/* Web: linha larga */}
        <div className="hidden items-center gap-3 py-[18px] pl-[22px] pr-3 md:flex">
          <Link
            href={`/eventos/${evento.id}`}
            className="flex min-w-0 flex-1 items-center gap-6"
          >
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
          </Link>
          <DeleteEventoButton eventId={evento.id} titulo={evento.titulo} />
        </div>
      </div>
    );
  }

  return (
    <>
      <Header
        variant="root"
        title="Eventos"
        actionLabel="+ Criar evento"
        actionHref="/eventos/novo"
      />
      <main className="flex flex-1 flex-col gap-3 px-[18px] pb-6 pt-0.5 md:gap-4 md:p-0">
        <Link
          href="/eventos/novo"
          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-black/20 p-3.5 text-[13.5px] font-semibold text-ink md:hidden"
        >
          + Criar evento
        </Link>

        {error && (
          <p className="text-[13px] text-danger">Erro: {error.message}</p>
        )}

        {/* Filtro por grupo (chips, dirigido por ?grupo=<id>) */}
        {todos.length > 0 && grupos && grupos.length > 0 && (
          <div className="ef-scroll -mx-[18px] flex gap-2 overflow-x-auto px-[18px] md:mx-0 md:flex-wrap md:px-0">
            <Link
              href={montarHref({ grupo: null })}
              scroll={false}
              className={`whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-medium ${
                grupoFiltro === null
                  ? "border-ink bg-ink text-paper"
                  : "border-black/10 bg-transparent text-ink"
              }`}
            >
              Todos
            </Link>
            {grupos.map((g) => {
              const sel = grupoFiltro === g.id;
              return (
                <Link
                  key={g.id}
                  href={montarHref({ grupo: g.id })}
                  scroll={false}
                  className={`whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-medium ${
                    sel
                      ? "border-ink bg-ink text-paper"
                      : "border-black/10 bg-transparent text-ink"
                  }`}
                >
                  {g.nome}
                </Link>
              );
            })}
          </div>
        )}

        {/* Alternador de vista: Lista | Calendário */}
        {todos.length > 0 && (
          <div className="flex">
            <div className="inline-flex rounded-full border border-black/10 bg-paper p-0.5">
              <Link
                href={montarHref({ vista: null })}
                scroll={false}
                className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold ${
                  vistaCalendario ? "text-ink-soft" : "bg-ink text-paper"
                }`}
              >
                Lista
              </Link>
              <Link
                href={montarHref({ vista: "calendario" })}
                scroll={false}
                className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold ${
                  vistaCalendario ? "bg-ink text-paper" : "text-ink-soft"
                }`}
              >
                Calendário
              </Link>
            </div>
          </div>
        )}

        {todos.length === 0 && (
          <p className="text-[13px] text-muted">Nenhum evento cadastrado ainda.</p>
        )}

        {todos.length > 0 && filtrados.length === 0 && (
          <p className="text-[13px] text-muted">
            Nenhum evento neste grupo.{" "}
            <Link href={montarHref({ grupo: null })} className="underline">
              Limpar filtro
            </Link>
          </p>
        )}

        {/* Vista calendário */}
        {vistaCalendario && filtrados.length > 0 && (
          <CalendarioEventos eventos={eventosCal} />
        )}

        {/* Vista lista */}
        {!vistaCalendario && filtrados.length > 0 && (
          <>
            {/* Toggle de eventos passados (dirigido por ?passados=1) */}
            <div className="flex items-center justify-between gap-3 px-0.5 md:px-0">
              <div className="text-[12px] text-muted">
                {mostrarPassados
                  ? "Mostrando todos os eventos"
                  : "Apenas próximos eventos"}
              </div>
              <Link
                href={montarHref({ passados: !mostrarPassados })}
                scroll={false}
                className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-soft"
              >
                <span
                  className={`relative h-[18px] w-[30px] flex-none rounded-full transition-colors ${
                    mostrarPassados ? "bg-ink" : "bg-black/15"
                  }`}
                >
                  <span
                    className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-paper transition-all ${
                      mostrarPassados ? "left-[14px]" : "left-[2px]"
                    }`}
                  />
                </span>
                Mostrar passados
              </Link>
            </div>

            {visiveis.length === 0 && (
              <p className="text-[13px] text-muted">
                Nenhum evento próximo.
                {totalPassados > 0 &&
                  ` Há ${totalPassados} evento${
                    totalPassados > 1 ? "s" : ""
                  } passado${
                    totalPassados > 1 ? "s" : ""
                  } — use o botão acima para mostrá-${
                    totalPassados > 1 ? "los" : "lo"
                  }.`}
              </p>
            )}

            <div className="flex flex-col gap-5 md:gap-6">
              {gruposPorMes.map((g) => (
                <div key={g.chave} className="flex flex-col gap-2.5">
                  <div className="px-1 text-[11px] font-semibold uppercase tracking-[1.2px] text-faint md:px-0">
                    {g.rotulo}
                  </div>
                  {g.eventos.map((e) => renderEventoCard(e))}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
