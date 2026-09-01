import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/active-group-server";
import { rotuloData, rotuloHora, rotuloMes, chaveMes } from "@/lib/datas";
import DeleteEventoButton from "./DeleteEventoButton";
import CalendarioEventos, { type EventoCal } from "./CalendarioEventos";
import { LiturgicalDot } from "../components/LiturgicalDot";
import { getCurrentAccount, getAuthUser } from "@/lib/current-user";
import ScrollToEvento from "./ScrollToEvento";
import MembroSelect from "./MembroSelect";
import EventosHeader from "./EventosHeader";

const iconeLapis = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export default async function EventosPage({
  searchParams,
}: {
  searchParams: Promise<{ passados?: string; grupo?: string; vista?: string; mes?: string; membro?: string }>;
}) {
  const { passados, grupo, vista, mes, membro } = await searchParams;

  const mostrarPassados = passados === "1";
  const vistaCalendario = vista === "calendario";
  const mesFiltro = mes ?? null;       // "AAAA-MM" ou null
  const membroFiltro = membro ?? null; // account_id ou null

  const supabase = await createClient();
  const activeGroupId = await getActiveGroupId();

  // Perfil do usuário logado para controle de botões (cache por request).
  const conta = await getCurrentAccount();
  const perfil = conta?.profile;
  const accountIdLogado = conta?.account_id ?? null;
  const podeGerenciar = perfil === "admin" || perfil === "coordinator";

  // TEMPORÁRIO: link "Gerenciar ministérios" visível só para o dono da plataforma.
  // Revisitar quando decidirmos como abrir essa capacidade para outros coordenadores.
  const authUser = await getAuthUser();
  const podeGerenciarMinisterios = authUser?.email === "gabrielbatista1551@gmail.com";

  let eventosQuery = supabase
    .from("events")
    .select(
      "id, name, date, time, group_id, liturgical_name, liturgical_color, ministerio_id, ministerio:ministerios(name), groups(name)"
    )
    .order("date", { ascending: true })
    .order("time", { ascending: true });
  if (activeGroupId) eventosQuery = eventosQuery.eq("group_id", activeGroupId);
  const { data: eventos, error } = await eventosQuery;

  type Evento = NonNullable<typeof eventos>[number];

  // Grupos para o filtro (chips).
  let gruposQuery = supabase
    .from("groups")
    .select("id, name")
    .order("name", { ascending: true });
  if (activeGroupId) gruposQuery = gruposQuery.eq("id", activeGroupId);
  const { data: grupos } = await gruposQuery;

  // Grupo selecionado no filtro (null = todos). Valida contra os grupos reais.
  const grupoFiltro =
    grupo && grupos?.some((g) => g.id === grupo) ? grupo : null;

  // Monta hrefs preservando os filtros atuais, com sobrescritas pontuais.
  function montarHref(over: {
    passados?: boolean;
    grupo?: string | null;
    vista?: string | null;
    mes?: string | null;
    membro?: string | null;
  }) {
    const p = new URLSearchParams();
    const passadosFinal = over.passados ?? mostrarPassados;
    const grupoFinal = over.grupo === undefined ? grupoFiltro : over.grupo;
    const vistaFinal =
      over.vista === undefined ? (vistaCalendario ? "calendario" : null) : over.vista;
    const mesFinal = over.mes === undefined ? mesFiltro : over.mes;
    const membroFinal = over.membro === undefined ? membroFiltro : over.membro;
    // passados não faz sentido quando mês está selecionado (mostramos o mês todo)
    if (passadosFinal && !mesFinal) p.set("passados", "1");
    if (grupoFinal) p.set("grupo", grupoFinal);
    if (vistaFinal === "calendario") p.set("vista", "calendario");
    if (mesFinal) p.set("mes", mesFinal);
    if (membroFinal) p.set("membro", membroFinal);
    const qs = p.toString();
    return qs ? `/eventos?${qs}` : "/eventos";
  }

  // Total de funções por evento (denominador do progresso, via event_roles).
  const { data: eventRolesCount } = await supabase
    .from("event_roles")
    .select("event_id");
  const totalPorEvento = new Map<string, number>();
  eventRolesCount?.forEach((er) => {
    totalPorEvento.set(er.event_id, (totalPorEvento.get(er.event_id) ?? 0) + 1);
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

  // Eventos em que o usuário logado está escalado (para rolar até o próximo).
  const { data: minhasAtribuicoes } = accountIdLogado
    ? await supabase
        .from("assignments")
        .select("event_id")
        .eq("account_id", accountIdLogado)
    : { data: null };
  const meusEventoIds = new Set(
    (minhasAtribuicoes ?? []).map((a) => a.event_id)
  );

  // Membros ativos do grupo para o seletor de filtro (C.2).
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

  // Atribuições do membro selecionado: eventId → nomeFunção (C.2).
  let membroFuncaoPorEvento: Map<string, string> | null = null;
  if (membroFiltro) {
    const { data: memAtrib } = await supabase
      .from("assignments")
      .select("event_id, role:roles(name)")
      .eq("account_id", membroFiltro);
    membroFuncaoPorEvento = new Map(
      (memAtrib ?? []).map((a) => {
        const role = Array.isArray(a.role) ? a.role[0] : a.role;
        return [a.event_id, (role as { name?: string } | null)?.name ?? "—"];
      })
    );
  }

  // Data de hoje como "AAAA-MM-DD" (local) para comparar com events.date.
  const agora = new Date();
  const hojeStr = `${agora.getFullYear()}-${String(
    agora.getMonth() + 1
  ).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;

  const todos = eventos ?? [];
  const filtrados = grupoFiltro
    ? todos.filter((e) => e.group_id === grupoFiltro)
    : todos;

  // Filtro por mês (C.1).
  const filtradosMes = mesFiltro
    ? filtrados.filter((e) => e.date.startsWith(mesFiltro))
    : filtrados;

  const ehFuturo = (e: Evento) => e.date >= hojeStr;
  const totalPassados = filtradosMes.filter((e) => !ehFuturo(e)).length;

  // Quando mês está selecionado, mostramos todos os eventos daquele mês.
  const visiveisBase = mesFiltro
    ? filtradosMes
    : mostrarPassados
    ? filtradosMes
    : filtradosMes.filter(ehFuturo);

  // Filtro por membro (C.2): restringe aos eventos em que esse membro está escalado.
  const visiveis = membroFuncaoPorEvento
    ? visiveisBase.filter((e) => membroFuncaoPorEvento!.has(e.id))
    : visiveisBase;

  // Próximo evento futuro (na lista visível) onde o usuário está escalado.
  const proximoMeuEvento = visiveis.find(
    (e) => ehFuturo(e) && meusEventoIds.has(e.id)
  );
  const scrollTargetId = proximoMeuEvento?.id ?? null;

  // O calendário mostra todos os eventos do grupo filtrado (passados inclusos).
  const eventosCal: EventoCal[] = filtrados.map((e) => {
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

  // Navegador de mês: calcula mês anterior e próximo para os Links (C.1).
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

  // Agrupa por mês mantendo a ordem cronológica (a query já vem ascendente).
  const gruposPorMes: { chave: string; rotulo: string; eventos: Evento[] }[] =
    [];
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

  function renderEventoCard(evento: Evento, roleName?: string) {
    const g = Array.isArray(evento.groups) ? evento.groups[0] : evento.groups;
    const total = totalPorEvento.get(evento.id) ?? 0;
    const atribuidas = atribuidasPorEvento.get(evento.id)?.size ?? 0;
    const pct = total ? Math.round((atribuidas / total) * 100) : 0;

    const eventoExt = evento as Evento & { ministerio?: { name?: string } | null };
    const ministerioNome = eventoExt.ministerio?.name ?? null;

    // Subtítulo: quando filtro por membro ativo, destaca a função escalada.
    const subtituloMobile = roleName
      ? `${g?.name ?? "Sem grupo"} · ${roleName}`
      : g?.name ?? "Sem grupo";
    const subtituloDesktop = roleName
      ? `${g?.name ?? "Sem grupo"} · ${roleName}`
      : [g?.name ?? "Sem grupo", evento.liturgical_name].filter(Boolean).join(" · ");

    return (
      <div
        key={evento.id}
        id={`evento-${evento.id}`}
        className="scroll-mt-20 rounded-[18px] border border-black/[0.06] bg-paper shadow-card md:rounded-2xl"
      >
        {/* Mobile: cartão empilhado */}
        <div className="flex items-stretch md:hidden">
          <Link
            href={`/eventos/${evento.id}`}
            className="flex min-w-0 flex-1 flex-col gap-2.5 py-4 pl-[18px] pr-3"
          >
            <div className="flex items-start justify-between gap-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[18px] font-semibold leading-tight text-ink">
                  <LiturgicalDot color={evento.liturgical_color} />
                  {evento.name}
                </div>
                {evento.liturgical_name && !roleName && (
                  <div className="mt-0.5 text-[12px] text-muted">
                    {evento.liturgical_name}
                  </div>
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
                  <div
                    className="h-full rounded-[3px] bg-primary"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-[11.5px] font-semibold text-ink-soft">
                  {atribuidas}/{total}
                </div>
              </div>
            )}
          </Link>
          {podeGerenciar && (
            <div className="flex flex-none items-center gap-0.5 pr-2">
              <Link
                href={`/eventos/editar/${evento.id}`}
                className="flex h-9 w-9 items-center justify-center rounded-full text-faint hover:bg-black/[0.04] hover:text-ink"
                title="Editar evento"
              >
                {iconeLapis}
              </Link>
              <DeleteEventoButton eventId={evento.id} titulo={evento.name} accountId={accountIdLogado ?? undefined} />
            </div>
          )}
        </div>

        {/* Web: linha larga */}
        <div className="hidden items-center gap-3 py-[18px] pl-[22px] pr-3 md:flex">
          <Link
            href={`/eventos/${evento.id}`}
            className="flex min-w-0 flex-1 items-center gap-6"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[18px] font-semibold text-ink">
                <LiturgicalDot color={evento.liturgical_color} />
                {evento.name}
              </div>
              <div className="mt-1 text-[12.5px] text-muted">
                {subtituloDesktop}
              </div>
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
                  <div
                    className="h-full rounded-[3px] bg-primary"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="whitespace-nowrap text-[12px] font-semibold text-ink-soft">
                  {atribuidas}/{total}
                </div>
              </div>
            )}
            <div className="flex-none text-[20px] text-[#9ca3af]">›</div>
          </Link>
          {podeGerenciar && (
            <div className="flex items-center gap-0.5">
              <Link
                href={`/eventos/editar/${evento.id}`}
                className="flex h-9 w-9 items-center justify-center rounded-full text-faint hover:bg-black/[0.04] hover:text-ink"
                title="Editar evento"
              >
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
        {/* TEMPORÁRIO: visível só para gabrielbatista1551@gmail.com */}
        {podeGerenciarMinisterios && (
          <>
            <Link
              href="/ministerios"
              className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-black/20 p-3.5 text-[13.5px] font-semibold text-ink-soft md:hidden"
            >
              Gerenciar ministérios
            </Link>
            <div className="hidden md:flex md:justify-end">
              <Link
                href="/ministerios"
                className="rounded-[11px] border border-black/10 px-4 py-2.5 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-black/[0.03]"
              >
                Gerenciar ministérios
              </Link>
            </div>
          </>
        )}

        {error && (
          <p className="text-[13px] text-danger">Erro: {error.message}</p>
        )}

        {/* Filtro por grupo (chips, dirigido por ?grupo=<id>). Escondido quando
            já há um grupo ativo no shell — aí o escopo é só aquele grupo e o
            chip "Todos" não faria sentido. */}
        {!activeGroupId && todos.length > 0 && grupos && grupos.length > 0 && (
          <div className="ef-scroll -mx-[18px] flex gap-2 overflow-x-auto px-[18px] md:mx-0 md:flex-wrap md:px-0">
            <Link
              href={montarHref({ grupo: null })}
              scroll={false}
              className={`whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-medium ${
                grupoFiltro === null
                  ? "border-primary bg-primary text-paper"
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
                      ? "border-primary bg-primary text-paper"
                      : "border-black/10 bg-transparent text-ink"
                  }`}
                >
                  {g.name}
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
                  vistaCalendario ? "text-ink-soft" : "bg-primary text-paper"
                }`}
              >
                Lista
              </Link>
              <Link
                href={montarHref({ vista: "calendario" })}
                scroll={false}
                className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold ${
                  vistaCalendario ? "bg-primary text-paper" : "text-ink-soft"
                }`}
              >
                Calendário
              </Link>
            </div>
          </div>
        )}

        {/* Filtros C.1 (mês) e C.2 (membro) — somente na vista lista */}
        {!vistaCalendario && todos.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {mesFiltro ? (
              <div className="flex items-center gap-0.5">
                <Link
                  href={montarHref({ mes: prevMes })}
                  scroll={false}
                  aria-label="Mês anterior"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-[16px] text-ink-soft hover:bg-black/[0.04]"
                >
                  ‹
                </Link>
                <span className="min-w-[148px] px-1 text-center text-[13.5px] font-semibold text-ink">
                  {rotuloMes(`${mesFiltro}-01`)}
                </span>
                <Link
                  href={montarHref({ mes: nextMes })}
                  scroll={false}
                  aria-label="Próximo mês"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-[16px] text-ink-soft hover:bg-black/[0.04]"
                >
                  ›
                </Link>
                <Link
                  href={montarHref({ mes: null })}
                  scroll={false}
                  aria-label="Ver todos os meses"
                  className="ml-1 flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-[13px] text-ink-soft hover:bg-black/[0.04]"
                >
                  ×
                </Link>
              </div>
            ) : (
              <Link
                href={montarHref({ mes: mesAtual })}
                scroll={false}
                className="flex items-center gap-1 rounded-full border border-black/10 px-3.5 py-1.5 text-[13px] font-medium text-ink-soft hover:bg-black/[0.04]"
              >
                Por mês
                <span className="text-[11px]">›</span>
              </Link>
            )}

            {membrosParaFiltro.length > 0 && (
              <MembroSelect membros={membrosParaFiltro} membroId={membroFiltro} />
            )}
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
          <CalendarioEventos eventos={eventosCal} accountId={accountIdLogado ?? undefined} />
        )}

        {/* Vista lista */}
        {!vistaCalendario && filtrados.length > 0 && (
          <>
            {scrollTargetId && <ScrollToEvento targetId={scrollTargetId} />}

            {/* Toggle de eventos passados — oculto quando mês está selecionado */}
            {!mesFiltro && (
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
                      mostrarPassados ? "bg-primary" : "bg-black/15"
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
            )}

            {visiveis.length === 0 && (
              <p className="text-[13px] text-muted">
                {membroFiltro
                  ? "Este membro não está escalado em nenhum evento."
                  : mesFiltro
                  ? "Nenhum evento neste mês."
                  : `Nenhum evento próximo.${
                      totalPassados > 0
                        ? ` Há ${totalPassados} evento${
                            totalPassados > 1 ? "s" : ""
                          } passado${
                            totalPassados > 1 ? "s" : ""
                          } — use o botão acima para mostrá-${
                            totalPassados > 1 ? "los" : "lo"
                          }.`
                        : ""
                    }`}
              </p>
            )}

            <div className="flex flex-col gap-5 md:gap-6">
              {gruposPorMes.map((g) => (
                <div key={g.chave} className="flex flex-col gap-2.5">
                  {/* Oculta o cabeçalho de mês quando o filtro já delimita o mês */}
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
          </>
        )}
      </main>
    </>
  );
}
