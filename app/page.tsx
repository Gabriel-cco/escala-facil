import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/active-group-server";
import { getAuthUser, getCurrentAccount } from "@/lib/current-user";
import Header from "./components/shell/Header";
import { LiturgicalDot } from "./components/LiturgicalDot";
import Avatar from "./components/Avatar";

export const dynamic = "force-dynamic";

const DIAS_SEMANA = [
  "Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado",
];
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function formatarDataCompleta(dateStr: string, time: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${DIAS_SEMANA[date.getDay()]}, ${d} de ${MESES[m - 1]} · ${time.slice(0, 2)}h`;
}

export default async function Home() {
  const supabase = await createClient();
  const activeGroupId = await getActiveGroupId();

  const agora = new Date();
  const hojeStr = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
  const em7DiasStr = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // ── Queries paralelas ─────────────────────────────────────────────────────

  // Todos os eventos do escopo (count stat + base para X/Y e filtro de trocas)
  let eventosQuery = supabase
    .from("events")
    .select("id, date, group_id");
  if (activeGroupId) eventosQuery = eventosQuery.eq("group_id", activeGroupId);

  // Membros ativos
  let membrosQuery = supabase
    .from("accounts")
    .select("id", { count: "exact", head: true })
    .eq("profile", "member")
    .eq("active", true);
  if (activeGroupId) membrosQuery = membrosQuery.eq("group_id", activeGroupId);

  // Funções ativas (para calcular totalPorGrupo → X/Y stat + barra do próximo evento)
  let funcoesQuery = supabase
    .from("roles")
    .select("id, group_id")
    .eq("active", true);
  if (activeGroupId) funcoesQuery = funcoesQuery.eq("group_id", activeGroupId);

  // Atribuições (para X/Y stat)
  const atribuicoesQuery = supabase
    .from("assignments")
    .select("event_id, role_id");

  // Próximo evento rico (card de destaque)
  let proximoBase = supabase
    .from("events")
    .select(
      "id, name, date, time, group_id, liturgical_name, liturgical_color, groups(name), assignments(id)"
    )
    .gte("date", hojeStr)
    .order("date", { ascending: true })
    .order("time", { ascending: true })
    .limit(1);
  if (activeGroupId) proximoBase = proximoBase.eq("group_id", activeGroupId);
  const proximoQuery = proximoBase.maybeSingle();

  // Nome do grupo ativo (para o subtítulo da saudação)
  const grupoAtivoNomeQuery = activeGroupId
    ? supabase.from("groups").select("name").eq("id", activeGroupId).maybeSingle()
    : Promise.resolve({ data: null, error: null });

  // Eventos com funções vagas (RPC)
  const gapsQuery = supabase.rpc("count_events_with_gaps", {
    p_group_id: activeGroupId ?? null,
  });

  // Trocas pendentes (sem filtro de grupo — filtramos client-side via event IDs)
  const swapsQuery = supabase
    .from("swap_requests")
    .select("id, event_id")
    .eq("status", "pending");

  // Suspensões terminando nos próximos 7 dias
  let suspensoesQuery = supabase
    .from("accounts")
    .select("id", { count: "exact", head: true })
    .not("suspended_until", "is", null)
    .gte("suspended_until", hojeStr)
    .lte("suspended_until", em7DiasStr)
    .eq("active", true);
  if (activeGroupId) suspensoesQuery = suspensoesQuery.eq("group_id", activeGroupId);

  // Última chamada de presença (widget frequência)
  const ultimaChamadaQuery = activeGroupId
    ? supabase.rpc("get_last_attendance_summary", { p_group_id: activeGroupId })
    : Promise.resolve({ data: null, error: null });

  const [authUser, conta] = await Promise.all([getAuthUser(), getCurrentAccount()]);

  const userRowQuery = authUser?.id
    ? supabase.from("users").select("avatar_url").eq("auth_id", authUser.id).maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const [
    { data: eventos },
    { count: totalMembros },
    { data: funcoes },
    { data: atribuicoes },
    { data: proximoEvento },
    { data: grupoAtivoData },
    { data: gapsCount },
    { data: swaps },
    { count: suspensoesCount },
    { data: ultimaChamadaData },
    { data: userRow },
  ] = await Promise.all([
    eventosQuery,
    membrosQuery,
    funcoesQuery,
    atribuicoesQuery,
    proximoQuery,
    grupoAtivoNomeQuery,
    gapsQuery,
    swapsQuery,
    suspensoesQuery,
    ultimaChamadaQuery,
    userRowQuery,
  ]);

  // ── Dados derivados ───────────────────────────────────────────────────────

  const nomeCompleto =
    (authUser?.user_metadata?.full_name as string | undefined) ??
    (authUser?.user_metadata?.name as string | undefined) ??
    authUser?.email ??
    "";
  const primeiroNome = nomeCompleto.trim().split(/\s+/)[0] || "";
  const grupoAtivoNome = (grupoAtivoData as { name?: string } | null)?.name ?? "";
  const avatarUrl = (userRow as { avatar_url?: string | null } | null)?.avatar_url ?? null;

  // Roles ativas por grupo_id (para X/Y stat e barra do próximo evento)
  const totalPorGrupo = new Map<string, number>();
  funcoes?.forEach((f) => {
    totalPorGrupo.set(f.group_id, (totalPorGrupo.get(f.group_id) ?? 0) + 1);
  });

  // X/Y stat: atribuições / slots em eventos futuros
  const upcomingIds = new Set(
    (eventos ?? []).filter((e) => e.date >= hojeStr).map((e) => e.id)
  );
  const assignmentsPorEvento = new Map<string, number>();
  atribuicoes?.forEach((a) => {
    if (upcomingIds.has(a.event_id)) {
      assignmentsPorEvento.set(
        a.event_id,
        (assignmentsPorEvento.get(a.event_id) ?? 0) + 1
      );
    }
  });
  let totalAssignmentsUpcoming = 0;
  let totalSlotsUpcoming = 0;
  (eventos ?? [])
    .filter((e) => e.date >= hojeStr)
    .forEach((e) => {
      totalAssignmentsUpcoming += assignmentsPorEvento.get(e.id) ?? 0;
      totalSlotsUpcoming += totalPorGrupo.get(e.group_id) ?? 0;
    });

  // Próximo evento
  const grupoDoProximo = Array.isArray(proximoEvento?.groups)
    ? (proximoEvento.groups as { name?: string }[])[0]
    : (proximoEvento?.groups as unknown as { name?: string } | null);
  const grupoNomeDoProximo = grupoDoProximo?.name ?? "";
  const assignmentsCount =
    (proximoEvento?.assignments as { id: string }[] | null)?.length ?? 0;
  const totalRolesProximo = proximoEvento
    ? (totalPorGrupo.get(proximoEvento.group_id) ?? 0)
    : 0;
  const pctProximo =
    totalRolesProximo > 0
      ? Math.round((assignmentsCount / totalRolesProximo) * 100)
      : 0;
  const completoProximo =
    totalRolesProximo > 0 && assignmentsCount >= totalRolesProximo;

  // Trocas: filtrar pelo escopo (event IDs do grupo se houver grupo ativo)
  const eventIdsSet = new Set((eventos ?? []).map((e) => e.id));
  const swapCount = (swaps ?? []).filter(
    (s) => !activeGroupId || eventIdsSet.has(s.event_id)
  ).length;

  const eventsWithGaps = (gapsCount as number | null) ?? 0;
  const suspensoesTotal = suspensoesCount ?? 0;

  // Widget de frequência
  const mostraFrequencia = conta?.profile !== "member";
  type UltimaChamadaRow = {
    list_id: string;
    list_name: string;
    list_date: string;
    present_count: number;
    total_count: number;
  };
  const ultimaChamada =
    ((ultimaChamadaData as UltimaChamadaRow[] | null) ?? [])[0] ?? null;

  // Ações pendentes — apenas as com contagem > 0
  const acoesPendentes = [
    {
      label:
        eventsWithGaps === 1
          ? "evento com função vaga"
          : "eventos com funções vagas",
      sublabel: "Eventos",
      count: eventsWithGaps,
      href: "/eventos",
      icon: "list" as const,
    },
    {
      label:
        swapCount === 1
          ? "solicitação de troca pendente"
          : "solicitações de troca pendentes",
      sublabel: "Trocas",
      count: swapCount,
      href: "/trocas",
      icon: "swap" as const,
    },
    {
      label:
        suspensoesTotal === 1
          ? "suspensão terminando essa semana"
          : "suspensões terminando essa semana",
      sublabel: "Membros",
      count: suspensoesTotal,
      href: "/membros",
      icon: "person" as const,
    },
  ].filter((a) => a.count > 0);

  const iniciais = primeiroNome ? primeiroNome.slice(0, 1).toUpperCase() : "?";

  return (
    <>
      <Header variant="home" />
      <main className="flex flex-1 flex-col gap-5 px-[18px] pb-8 pt-2 md:gap-6 md:p-0">

        {/* ── Saudação ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <Avatar url={avatarUrl} iniciais={iniciais} size={52} />
          <div>
            <h1 className="font-serif text-[26px] font-semibold leading-tight text-ink md:text-[30px]">
              {primeiroNome ? `Olá, ${primeiroNome}` : "Olá"}
            </h1>
            <p className="mt-0.5 text-[13px] text-muted">
              {activeGroupId
                ? `Panorama do grupo ${grupoAtivoNome}`
                : "Panorama de todos os grupos da paróquia"}
            </p>
          </div>
          <Link
            href="/eventos/novo"
            className="ml-auto hidden flex-none items-center gap-2 rounded-[14px] bg-primary px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-primary-hover md:inline-flex"
          >
            + Criar evento
          </Link>
        </div>

        {/* ── Stats — 3 colunas com ícone ─────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2.5 md:gap-4">
          {/* Eventos agendados */}
          <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-black/[0.06] bg-paper p-3.5 shadow-card md:rounded-[18px] md:p-[22px]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <div className="text-[22px] font-bold leading-none text-ink md:text-[28px]">
              {eventos?.length ?? 0}
            </div>
            <div className="text-center text-[10.5px] leading-tight text-muted md:text-[12px]">
              Eventos agendados
            </div>
          </div>

          {/* Membros ativos */}
          <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-black/[0.06] bg-paper p-3.5 shadow-card md:rounded-[18px] md:p-[22px]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <div className="text-[22px] font-bold leading-none text-ink md:text-[28px]">
              {totalMembros ?? 0}
            </div>
            <div className="text-center text-[10.5px] leading-tight text-muted md:text-[12px]">
              Membros ativos
            </div>
          </div>

          {/* Funções atribuídas */}
          <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-black/[0.06] bg-paper p-3.5 shadow-card md:rounded-[18px] md:p-[22px]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
              <circle cx="19" cy="11" r="2" />
              <line x1="19" y1="9" x2="19" y2="8" />
              <line x1="19" y1="13" x2="19" y2="14" />
              <line x1="17" y1="11" x2="16" y2="11" />
              <line x1="21" y1="11" x2="22" y2="11" />
            </svg>
            <div className="text-[22px] font-bold leading-none text-ink md:text-[28px]">
              {totalAssignmentsUpcoming}/{totalSlotsUpcoming}
            </div>
            <div className="text-center text-[10.5px] leading-tight text-muted md:text-[12px]">
              Funções atribuídas
            </div>
          </div>
        </div>

        {/* ── Próximos eventos ─────────────────────────────────────────── */}
        <div data-tour="proximo-evento" className="flex flex-col gap-3">
          <h2 className="text-[18px] font-bold text-ink">Próximos eventos</h2>

          {proximoEvento ? (
            <div className="flex flex-col rounded-[18px] border border-black/[0.06] bg-paper shadow-card p-5">
              {proximoEvento.liturgical_name && (
                <div className="mb-2 flex items-center gap-1.5 text-[12px] text-muted">
                  <LiturgicalDot color={proximoEvento.liturgical_color} />
                  {proximoEvento.liturgical_name}
                </div>
              )}
              <div className="font-serif text-[20px] font-bold leading-tight text-ink">
                {proximoEvento.name}
              </div>
              <div className="mt-1 text-[13px] text-muted">
                {formatarDataCompleta(proximoEvento.date, proximoEvento.time)}
              </div>
              {!activeGroupId && grupoNomeDoProximo && (
                <div className="mt-2">
                  <span className="rounded-full bg-surface px-2.5 py-1 text-[12px] font-semibold text-ink-soft">
                    {grupoNomeDoProximo}
                  </span>
                </div>
              )}
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
                  <span className="text-muted">Funções preenchidas</span>
                  <span className="font-semibold text-ink-soft">
                    {assignmentsCount}/{totalRolesProximo}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-track">
                  <div
                    className={`h-full rounded-full transition-all ${completoProximo ? "bg-success" : "bg-primary"}`}
                    style={{ width: `${pctProximo}%` }}
                  />
                </div>
              </div>
              <Link
                href={`/eventos/${proximoEvento.id}`}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-[14px] bg-ink py-3.5 text-[14px] font-semibold text-paper transition-colors hover:bg-primary-hover"
              >
                Ver escala <span>→</span>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center rounded-[18px] border border-black/[0.06] bg-paper shadow-card px-5 py-7 text-center">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className="text-[15px] font-semibold text-ink">Nenhum evento agendado</div>
              <div className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
                Gere os eventos fixos do mês a partir do molde.
              </div>
              <div className="mt-5 flex w-full flex-col gap-2">
                <Link href="/eventos/gerar" className="flex items-center justify-center rounded-[14px] bg-ink py-3.5 text-[14px] font-semibold text-paper hover:bg-primary-hover">
                  Gerar escala do mês
                </Link>
                <Link href="/eventos/novo" className="flex items-center justify-center rounded-[14px] border border-black/10 py-3 text-[14px] font-semibold text-ink hover:bg-surface">
                  Criar evento
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ── Frequência ───────────────────────────────────────────────── */}
        {mostraFrequencia && (
          <div className="flex flex-col gap-3">
            <h2 className="text-[18px] font-bold text-ink">Frequência</h2>

            <div className="flex flex-col rounded-[18px] border border-black/[0.06] bg-paper p-5 shadow-card">
              <div className="mb-4 flex items-start gap-3.5">
                <div className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-[12px] bg-surface text-[20px] text-muted">
                  ✓
                </div>
                <div>
                  {ultimaChamada ? (
                    <>
                      <div className="text-[12px] font-semibold uppercase tracking-[0.05em] text-muted">
                        Última chamada
                      </div>
                      <div className="mt-0.5 text-[15px] font-semibold leading-tight text-ink">
                        {ultimaChamada.list_name}
                      </div>
                      <div className="mt-0.5 text-[13.5px] text-muted">
                        <strong className="text-ink">{ultimaChamada.present_count} de {ultimaChamada.total_count}</strong> presentes
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-[15px] font-semibold text-ink">
                        Nenhuma chamada registrada
                      </div>
                      <div className="mt-1 text-[13px] leading-snug text-muted">
                        Registre a presença de um encontro, missa ou reunião
                      </div>
                    </>
                  )}
                </div>
              </div>

              <Link
                href="/frequencia/nova"
                className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-ink py-3.5 text-[14px] font-semibold text-paper transition-colors hover:bg-primary-hover"
              >
                Fazer chamada <span>→</span>
              </Link>

              {ultimaChamada && (
                <div className="mt-3 text-center">
                  <Link href="/frequencia" className="text-[13px] font-semibold text-primary hover:underline">
                    Ver histórico e relatório
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Ações Pendentes ──────────────────────────────────────────── */}
        {acoesPendentes.length > 0 && (
          <div data-tour="acoes-pendentes" className="flex flex-col gap-3">
            <h2 className="text-[18px] font-bold text-ink">Ações pendentes</h2>
            <div className="overflow-hidden rounded-[18px] border border-black/[0.06] bg-paper shadow-card">
              {acoesPendentes.map((acao, i) => (
                <Link
                  key={i}
                  href={acao.href}
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface [&:not(:last-child)]:border-b [&:not(:last-child)]:border-black/[0.05]"
                >
                  <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-surface">
                    {acao.icon === "list" && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-soft">
                        <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                      </svg>
                    )}
                    {acao.icon === "swap" && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-soft">
                        <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                      </svg>
                    )}
                    {acao.icon === "person" && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-soft">
                        <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold leading-tight text-ink">
                      {acao.count} {acao.label}
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-muted">{acao.sublabel}</div>
                  </div>
                  <div className="flex flex-none items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[12px] font-bold text-primary">{acao.count}</span>
                    <span className="text-[18px] leading-none text-faint">›</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
