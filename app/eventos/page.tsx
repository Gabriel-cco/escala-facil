import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/active-group-server";
import { rotuloData, rotuloHora, rotuloMes, chaveMes } from "@/lib/datas";
import DeleteEventoButton from "./DeleteEventoButton";
import CalendarioEventos, { type EventoCal } from "./CalendarioEventos";
import { LiturgicalDot } from "../components/LiturgicalDot";
import { getCurrentAccount } from "@/lib/current-user";
import ScrollToEvento from "./ScrollToEvento";
import MembroSelect from "./MembroSelect";
import EventosHeader from "./EventosHeader";
import { Paginacao } from "../components/Paginacao";

const PP_DEFAULT = 25;

const iconeLapis = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export default async function EventosPage({
  searchParams,
}: {
  searchParams: Promise<{
    passados?: string;
    grupo?: string;
    vista?: string;
    mes?: string;
    membro?: string;
    p?: string;
    pp?: string;
  }>;
}) {
  const { passados, grupo, vista, mes, membro, p: pParam, pp: ppParam } = await searchParams;

  const mostrarPassados = passados === "1";
  const vistaCalendario = vista === "calendario";
  const mesFiltro = mes ?? null;
  const membroFiltro = membro ?? null;
  const pp = Math.max(10, Math.min(50, Number(ppParam ?? PP_DEFAULT)));
  const p = Math.max(1, Number(pParam ?? 1));

  const supabase = await createClient();
  const activeGroupId = await getActiveGroupId();

  const conta = await getCurrentAccount();
  const perfil = conta?.profile;
  const accountIdLogado = conta?.account_id ?? null;
  const podeGerenciar = perfil === "admin" || perfil === "coordinator";

  const agora = new Date();
  const hojeStr = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;

  // ── Dados auxiliares sempre necessários ─────────────────────────────────
  let gruposQuery = supabase.from("groups").select("id, name").order("name");
  if (activeGroupId) gruposQuery = gruposQuery.eq("id", activeGroupId);
  const { data: grupos } = await gruposQuery;

  const grupoFiltro = grupo && grupos?.some((g) => g.id === grupo) ? grupo : null;

  // Membros para o seletor de filtro
  const membrosParaFiltro: { id: string; nome: string }[] = [];
  if (activeGroupId) {
    const { data: membrosData } = await supabase
      .from("accounts")
      .select("id, user:users(name)")
      .eq("group_id", activeGroupId)
      .eq("profile", "member")
      .eq("active", true);
    (membrosData ?? []).forEach((a) => {
      const u = Array.isArray(a.user) ? a.user[0] : a.user;
      if (u?.name) membrosParaFiltro.push({ id: a.id, nome: u.name });
    });
    membrosParaFiltro.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }

  // Atribuições do membro filtrado (usadas para filtrar eventos E exibir função)
  let membroFuncaoPorEvento: Map<string, string> | null = null;
  let eventIdsParaMembro: string[] | null = null;
  if (membroFiltro) {
    const { data: memAtrib } = await supabase
      .from("assignments")
      .select("event_id, role:roles(name)")
      .eq("account_id", membroFiltro);
    if (memAtrib) {
      membroFuncaoPorEvento = new Map(
        memAtrib.map((a) => {
          const role = Array.isArray(a.role) ? a.role[0] : a.role;
          return [a.event_id, (role as { name?: string } | null)?.name ?? "—"];
        })
      );
      eventIdsParaMembro = memAtrib.map((a) => a.event_id);
    }
  }

  // Monta hrefs preservando filtros, sempre resetando para p=1
  function montarHref(over: {
    passados?: boolean;
    grupo?: string | null;
    vista?: string | null;
    mes?: string | null;
    membro?: string | null;
  }) {
    const params = new URLSearchParams();
    const passadosFinal = over.passados ?? mostrarPassados;
    const grupoFinal = over.grupo === undefined ? grupoFiltro : over.grupo;
    const vistaFinal =
      over.vista === undefined ? (vistaCalendario ? "calendario" : null) : over.vista;
    const mesFinal = over.mes === undefined ? mesFiltro : over.mes;
    const membroFinal = over.membro === undefined ? membroFiltro : over.membro;
    if (passadosFinal && !mesFinal) params.set("passados", "1");
    if (grupoFinal) params.set("grupo", grupoFinal);
    if (vistaFinal === "calendario") params.set("vista", "calendario");
    if (mesFinal) params.set("mes", mesFinal);
    if (membroFinal) params.set("membro", membroFinal);
    // Preserva pp se customizado; sempre reseta p para 1 ao mudar filtro
    if (pp !== PP_DEFAULT) params.set("pp", String(pp));
    const qs = params.toString();
    return qs ? `/eventos?${qs}` : "/eventos";
  }

  // Navegador de mês
  const prevMes = mesFiltro
    ? (() => {
        const [y, m] = mesFiltro.split("-").map(Number);
        const d = new Date(y, m - 2, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      })()
    : null;
  const nextMes = mesFiltro
    ? (() => {
        const [y, m] = mesFiltro.split("-").map(Number);
        const d = new Date(y, m, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      })()
    : null;
  const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;

  const selectStr =
    "id, name, date, time, group_id, liturgical_name, liturgical_color, ministerio_id, ministerio:ministerios(name), groups(name)";

  // ── Vista Calendário: carrega todos os eventos sem paginação ─────────────
  if (vistaCalendario) {
    let calQuery = supabase.from("events").select(selectStr).order("date").order("time");
    if (activeGroupId) calQuery = calQuery.eq("group_id", activeGroupId);
    else if (grupoFiltro) calQuery = calQuery.eq("group_id", grupoFiltro);

    const { data: eventos, error } = await calQuery;
    const todos = eventos ?? [];

    const eventoIds = todos.map((e) => e.id);
    const [{ data: erRows }, { data: atribRows }] = eventoIds.length
      ? await Promise.all([
          supabase.from("event_roles").select("event_id").in("event_id", eventoIds),
          supabase.from("assignments").select("event_id, role_id").in("event_id", eventoIds),
        ])
      : [{ data: [] }, { data: [] }];

    const totalPorEvento = new Map<string, number>();
    (erRows ?? []).forEach((er) => {
      totalPorEvento.set(er.event_id, (totalPorEvento.get(er.event_id) ?? 0) + 1);
    });
    const atribuidasPorEvento = new Map<string, Set<string>>();
    (atribRows ?? []).forEach((a) => {
      const s = atribuidasPorEvento.get(a.event_id) ?? new Set<string>();
      s.add(a.role_id);
      atribuidasPorEvento.set(a.event_id, s);
    });

    const eventosCal: EventoCal[] = todos.map((e) => {
      const g = Array.isArray(e.groups) ? e.groups[0] : e.groups;
      return {
        id: e.id,
        nome: e.name,
        date: e.date,
        time: e.time,
        grupoNome: g?.name ?? "Sem grupo",
        atribuidas: atribuidasPorEvento.get(e.id)?.size ?? 0,
        total: totalPorEvento.get(e.id) ?? 0,
      };
    });

    return (
      <>
        <EventosHeader podeGerenciar={podeGerenciar} />
        <main className="flex flex-1 flex-col gap-3 px-[18px] pb-6 pt-0.5 md:gap-4 md:p-0">
          {error && <p className="text-[13px] text-danger">Erro: {error.message}</p>}

          {/* Chips de grupo */}
          {!activeGroupId && todos.length > 0 && grupos && grupos.length > 0 && (
            <div className="ef-scroll -mx-[18px] flex gap-2 overflow-x-auto px-[18px] md:mx-0 md:flex-wrap md:px-0">
              <Link href={montarHref({ grupo: null })} scroll={false}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-medium ${grupoFiltro === null ? "border-primary bg-primary text-paper" : "border-black/10 bg-transparent text-ink"}`}>
                Todos
              </Link>
              {grupos.map((g) => (
                <Link key={g.id} href={montarHref({ grupo: g.id })} scroll={false}
                  className={`whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-medium ${grupoFiltro === g.id ? "border-primary bg-primary text-paper" : "border-black/10 bg-transparent text-ink"}`}>
                  {g.name}
                </Link>
              ))}
            </div>
          )}

          {/* Alternador Lista/Calendário */}
          <div className="flex">
            <div className="inline-flex rounded-full border border-black/10 bg-paper p-0.5">
              <Link href={montarHref({ vista: null })} scroll={false}
                className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold ${vistaCalendario ? "text-ink-soft" : "bg-primary text-paper"}`}>
                Lista
              </Link>
              <Link href={montarHref({ vista: "calendario" })} scroll={false}
                className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold ${vistaCalendario ? "bg-primary text-paper" : "text-ink-soft"}`}>
                Calendário
              </Link>
            </div>
          </div>

          <CalendarioEventos eventos={eventosCal} accountId={accountIdLogado ?? undefined} />
        </main>
      </>
    );
  }

  // ── Vista Lista: paginada com filtros server-side ─────────────────────────
  let listQuery = supabase
    .from("events")
    .select(selectStr, { count: "exact" })
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  if (activeGroupId) listQuery = listQuery.eq("group_id", activeGroupId);
  else if (grupoFiltro) listQuery = listQuery.eq("group_id", grupoFiltro);

  if (!mesFiltro && !mostrarPassados) {
    listQuery = listQuery.gte("date", hojeStr);
  }
  if (mesFiltro) {
    const [y, m] = mesFiltro.split("-").map(Number);
    const prox = new Date(y, m, 1);
    const proxStr = `${prox.getFullYear()}-${String(prox.getMonth() + 1).padStart(2, "0")}-01`;
    listQuery = listQuery.gte("date", `${mesFiltro}-01`).lt("date", proxStr);
  }

  type RawEvento = {
    id: string;
    name: string;
    date: string;
    time: string;
    group_id: string;
    liturgical_name: string | null;
    liturgical_color: string | null;
    ministerio_id: string | null;
    ministerio: { name: string }[] | { name: string } | null;
    groups: { name: string }[] | { name: string } | null;
  };

  let totalEventos = 0;
  let eventos: RawEvento[] | null = [];

  if (membroFiltro && eventIdsParaMembro !== null) {
    if (eventIdsParaMembro.length === 0) {
      eventos = [];
      totalEventos = 0;
    } else {
      listQuery = listQuery.in("id", eventIdsParaMembro);
      const de = (p - 1) * pp;
      const { data, count } = await listQuery.range(de, de + pp - 1);
      eventos = data;
      totalEventos = count ?? 0;
    }
  } else {
    const de = (p - 1) * pp;
    const { data, count, error: listError } = await listQuery.range(de, de + pp - 1);
    if (listError) {
      eventos = [];
    } else {
      eventos = data;
    }
    totalEventos = count ?? 0;
  }

  const paginaAtual = Math.max(1, Math.min(p, Math.ceil(totalEventos / pp) || 1));
  const visiveis = (eventos ?? []) as RawEvento[];

  // Auxiliares scoped à página atual
  const pageIds = visiveis.map((e) => e.id);

  const [{ data: erRows }, { data: atribRows }, { data: minhasAtrib }] =
    pageIds.length
      ? await Promise.all([
          supabase.from("event_roles").select("event_id").in("event_id", pageIds),
          supabase.from("assignments").select("event_id, role_id").in("event_id", pageIds),
          accountIdLogado
            ? supabase.from("assignments").select("event_id").eq("account_id", accountIdLogado).in("event_id", pageIds)
            : Promise.resolve({ data: null }),
        ])
      : [{ data: [] }, { data: [] }, { data: null }];

  const totalPorEvento = new Map<string, number>();
  (erRows ?? []).forEach((er) => {
    totalPorEvento.set(er.event_id, (totalPorEvento.get(er.event_id) ?? 0) + 1);
  });
  const atribuidasPorEvento = new Map<string, Set<string>>();
  (atribRows ?? []).forEach((a) => {
    const s = atribuidasPorEvento.get(a.event_id) ?? new Set<string>();
    s.add(a.role_id);
    atribuidasPorEvento.set(a.event_id, s);
  });
  const meusEventoIds = new Set((minhasAtrib ?? []).map((a) => a.event_id));

  // Conta eventos passados (para mensagem de empty state no modo "próximos")
  let totalPassados = 0;
  if (!mostrarPassados && !mesFiltro && totalEventos === 0) {
    let passadosQ = supabase.from("events").select("id", { count: "exact", head: true }).lt("date", hojeStr);
    if (activeGroupId) passadosQ = passadosQ.eq("group_id", activeGroupId);
    else if (grupoFiltro) passadosQ = passadosQ.eq("group_id", grupoFiltro);
    const { count: cp } = await passadosQ;
    totalPassados = cp ?? 0;
  }

  // Total de eventos sem filtro de data (para detectar "nenhum cadastrado")
  let totalBase = 0;
  {
    let baseQ = supabase.from("events").select("id", { count: "exact", head: true });
    if (activeGroupId) baseQ = baseQ.eq("group_id", activeGroupId);
    else if (grupoFiltro) baseQ = baseQ.eq("group_id", grupoFiltro);
    const { count: cb } = await baseQ;
    totalBase = cb ?? 0;
  }

  const proximoMeuEvento = visiveis.find(
    (e) => e.date >= hojeStr && meusEventoIds.has(e.id)
  );
  const scrollTargetId = proximoMeuEvento?.id ?? null;

  const gruposPorMes: { chave: string; rotulo: string; eventos: RawEvento[] }[] = [];
  const indiceMes = new Map<string, number>();
  visiveis.forEach((e) => {
    const chave = chaveMes(e.date);
    let i = indiceMes.get(chave);
    if (i === undefined) {
      i = gruposPorMes.length;
      indiceMes.set(chave, i);
      gruposPorMes.push({ chave, rotulo: rotuloMes(e.date), eventos: [] });
    }
    gruposPorMes[i].eventos.push(e);
  });

  function renderEventoCard(evento: RawEvento, roleName?: string) {
    const g = Array.isArray(evento.groups) ? evento.groups[0] : evento.groups;
    const total = totalPorEvento.get(evento.id) ?? 0;
    const atribuidas = atribuidasPorEvento.get(evento.id)?.size ?? 0;
    const pct = total ? Math.round((atribuidas / total) * 100) : 0;

    const eventoExt = evento as RawEvento & { ministerio?: { name?: string } | null };
    const ministerioNome = eventoExt.ministerio?.name ?? null;

    const subtituloMobile = roleName ? `${g?.name ?? "Sem grupo"} · ${roleName}` : g?.name ?? "Sem grupo";
    const subtituloDesktop = roleName
      ? `${g?.name ?? "Sem grupo"} · ${roleName}`
      : [g?.name ?? "Sem grupo", evento.liturgical_name].filter(Boolean).join(" · ");

    return (
      <div key={evento.id} id={`evento-${evento.id}`} className="scroll-mt-20 rounded-[18px] border border-black/[0.06] bg-paper shadow-card md:rounded-2xl">
        {/* Mobile */}
        <div className="flex items-stretch md:hidden">
          <Link href={`/eventos/${evento.id}`} className="flex min-w-0 flex-1 flex-col gap-2.5 py-4 pl-[18px] pr-3">
            <div className="flex items-start justify-between gap-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[18px] font-semibold leading-tight text-ink">
                  <LiturgicalDot color={evento.liturgical_color} />
                  {evento.name}
                </div>
                {evento.liturgical_name && !roleName && (
                  <div className="mt-0.5 text-[12px] text-muted">{evento.liturgical_name}</div>
                )}
                {ministerioNome && (
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-black/[0.08] bg-surface px-2.5 py-0.5 text-[11px] font-medium text-ink-soft">
                    ♪ {ministerioNome}
                  </div>
                )}
              </div>
              <div className="whitespace-nowrap pt-0.5 text-[12px] font-semibold text-ink-soft">
                {rotuloData(evento.date)} · {rotuloHora(evento.time)}
              </div>
            </div>
            <div className="text-[12px] text-muted">{subtituloMobile}</div>
            {!roleName && (
              <div className="flex items-center gap-2.5">
                <div className="h-[5px] flex-1 overflow-hidden rounded-[3px] bg-surface">
                  <div className="h-full rounded-[3px] bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-[11.5px] font-semibold text-ink-soft">{atribuidas}/{total}</div>
              </div>
            )}
          </Link>
          {podeGerenciar && (
            <div className="flex flex-none items-center gap-0.5 pr-2">
              <Link href={`/eventos/editar/${evento.id}`} className="flex h-9 w-9 items-center justify-center rounded-full text-faint hover:bg-black/[0.04] hover:text-ink" title="Editar evento">
                {iconeLapis}
              </Link>
              <DeleteEventoButton eventId={evento.id} titulo={evento.name} accountId={accountIdLogado ?? undefined} />
            </div>
          )}
        </div>

        {/* Desktop */}
        <div className="hidden items-center gap-3 py-[18px] pl-[22px] pr-3 md:flex">
          <Link href={`/eventos/${evento.id}`} className="flex min-w-0 flex-1 items-center gap-6">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[18px] font-semibold text-ink">
                <LiturgicalDot color={evento.liturgical_color} />
                {evento.name}
              </div>
              <div className="mt-1 text-[12.5px] text-muted">{subtituloDesktop}</div>
              {ministerioNome && (
                <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-black/[0.08] bg-surface px-2.5 py-0.5 text-[11px] font-medium text-ink-soft">
                  ♪ {ministerioNome}
                </div>
              )}
            </div>
            <div className="w-[120px] flex-none text-[13px] font-semibold text-ink-soft">
              {rotuloData(evento.date)} · {rotuloHora(evento.time)}
            </div>
            {!roleName && (
              <div className="flex w-[170px] flex-none items-center gap-2.5">
                <div className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-surface">
                  <div className="h-full rounded-[3px] bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <div className="whitespace-nowrap text-[12px] font-semibold text-ink-soft">{atribuidas}/{total}</div>
              </div>
            )}
            <div className="flex-none text-[20px] text-[#9ca3af]">›</div>
          </Link>
          {podeGerenciar && (
            <div className="flex items-center gap-0.5">
              <Link href={`/eventos/editar/${evento.id}`} className="flex h-9 w-9 items-center justify-center rounded-full text-faint hover:bg-black/[0.04] hover:text-ink" title="Editar evento">
                {iconeLapis}
              </Link>
              <DeleteEventoButton eventId={evento.id} titulo={evento.name} accountId={accountIdLogado ?? undefined} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <EventosHeader podeGerenciar={podeGerenciar} />
      <main className="flex flex-1 flex-col gap-3 px-[18px] pb-6 pt-0.5 md:gap-4 md:p-0">
        {/* Chips de grupo */}
        {!activeGroupId && totalBase > 0 && grupos && grupos.length > 0 && (
          <div className="ef-scroll -mx-[18px] flex gap-2 overflow-x-auto px-[18px] md:mx-0 md:flex-wrap md:px-0">
            <Link href={montarHref({ grupo: null })} scroll={false}
              className={`whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-medium ${grupoFiltro === null ? "border-primary bg-primary text-paper" : "border-black/10 bg-transparent text-ink"}`}>
              Todos
            </Link>
            {grupos.map((g) => (
              <Link key={g.id} href={montarHref({ grupo: g.id })} scroll={false}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-medium ${grupoFiltro === g.id ? "border-primary bg-primary text-paper" : "border-black/10 bg-transparent text-ink"}`}>
                {g.name}
              </Link>
            ))}
          </div>
        )}

        {/* Alternador Lista/Calendário */}
        {totalBase > 0 && (
          <div className="flex">
            <div className="inline-flex rounded-full border border-black/10 bg-paper p-0.5">
              <Link href={montarHref({ vista: null })} scroll={false}
                className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold ${vistaCalendario ? "text-ink-soft" : "bg-primary text-paper"}`}>
                Lista
              </Link>
              <Link href={montarHref({ vista: "calendario" })} scroll={false}
                className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold ${vistaCalendario ? "bg-primary text-paper" : "text-ink-soft"}`}>
                Calendário
              </Link>
            </div>
          </div>
        )}

        {/* Filtros de mês e membro */}
        {totalBase > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {mesFiltro ? (
              <div className="flex items-center gap-0.5">
                <Link href={montarHref({ mes: prevMes })} scroll={false} aria-label="Mês anterior"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-[16px] text-ink-soft hover:bg-black/[0.04]">
                  ‹
                </Link>
                <span className="min-w-[148px] px-1 text-center text-[13.5px] font-semibold text-ink">
                  {rotuloMes(`${mesFiltro}-01`)}
                </span>
                <Link href={montarHref({ mes: nextMes })} scroll={false} aria-label="Próximo mês"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-[16px] text-ink-soft hover:bg-black/[0.04]">
                  ›
                </Link>
                <Link href={montarHref({ mes: null })} scroll={false} aria-label="Ver todos os meses"
                  className="ml-1 flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-[13px] text-ink-soft hover:bg-black/[0.04]">
                  ×
                </Link>
              </div>
            ) : (
              <Link href={montarHref({ mes: mesAtual })} scroll={false}
                className="flex items-center gap-1 rounded-full border border-black/10 px-3.5 py-1.5 text-[13px] font-medium text-ink-soft hover:bg-black/[0.04]">
                Por mês <span className="text-[11px]">›</span>
              </Link>
            )}

            {membrosParaFiltro.length > 0 && (
              <MembroSelect membros={membrosParaFiltro} membroId={membroFiltro} />
            )}
          </div>
        )}

        {totalBase === 0 && (
          <p className="text-[13px] text-muted">Nenhum evento cadastrado ainda.</p>
        )}

        {totalBase > 0 && totalEventos === 0 && (
          <p className="text-[13px] text-muted">
            {membroFiltro
              ? "Este membro não está escalado em nenhum evento."
              : mesFiltro
              ? "Nenhum evento neste mês."
              : `Nenhum evento próximo.${
                  totalPassados > 0
                    ? ` Há ${totalPassados} evento${totalPassados > 1 ? "s" : ""} passado${totalPassados > 1 ? "s" : ""} — use o botão abaixo para mostrá-${totalPassados > 1 ? "los" : "lo"}.`
                    : ""
                }`}
          </p>
        )}

        {totalEventos > 0 && (
          <>
            {scrollTargetId && <ScrollToEvento targetId={scrollTargetId} />}

            {/* Toggle de passados — oculto quando mês selecionado */}
            {!mesFiltro && (
              <div className="flex items-center justify-between gap-3 px-0.5 md:px-0">
                <div className="text-[12px] text-muted">
                  {mostrarPassados ? "Mostrando todos os eventos" : "Apenas próximos eventos"}
                </div>
                <Link href={montarHref({ passados: !mostrarPassados })} scroll={false}
                  className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-soft">
                  <span className={`relative h-[18px] w-[30px] flex-none rounded-full transition-colors ${mostrarPassados ? "bg-primary" : "bg-black/15"}`}>
                    <span className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-paper transition-all ${mostrarPassados ? "left-[14px]" : "left-[2px]"}`} />
                  </span>
                  Mostrar passados
                </Link>
              </div>
            )}

            <div className="flex flex-col gap-5 md:gap-6">
              {gruposPorMes.map((g) => (
                <div key={g.chave} className="flex flex-col gap-2.5">
                  {!mesFiltro && (
                    <div className="px-1 text-[11px] font-semibold uppercase tracking-[1.2px] text-faint md:px-0">
                      {g.rotulo}
                    </div>
                  )}
                  {g.eventos.map((e) =>
                    renderEventoCard(e, membroFuncaoPorEvento?.get(e.id))
                  )}
                </div>
              ))}
            </div>

            {totalEventos > pp && (
              <Paginacao
                paginaAtual={paginaAtual}
                totalItens={totalEventos}
                itensPorPagina={pp}
              />
            )}
          </>
        )}
      </main>
    </>
  );
}
