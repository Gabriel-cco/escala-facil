import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/current-user";
import Header from "@/app/components/shell/Header";
import FiltrosMes from "./FiltrosMes";
import GraficoAtividade, { type DiaAtividade } from "./GraficoAtividade";

// TEMPORÁRIO: acesso restrito ao dono da plataforma pelo e-mail.
// Revisitar quando existir conceito real de superadmin (ver access_logs_select no banco).
const OWNER_EMAIL = "gabrielbatista1551@gmail.com";

export const metadata = { title: "Relatório de Uso — Escala Fácil" };

type LogRow = {
  account_id: string | null;
  action: string;
  created_at: string;
};

function cartao(titulo: string, valor: string | number, sub?: string) {
  return (
    <div className="flex flex-col gap-1 rounded-[16px] border border-black/[0.06] bg-paper px-5 py-4 shadow-card">
      <div className="text-[11.5px] font-semibold uppercase tracking-[1px] text-muted">
        {titulo}
      </div>
      <div className="font-serif text-[26px] font-semibold text-ink">
        {valor}
      </div>
      {sub && <div className="text-[11.5px] text-faint">{sub}</div>}
    </div>
  );
}

function rotuloDataHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function RelatorioUsoPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; grupo?: string }>;
}) {
  const authUser = await getAuthUser();

  // Verifica identidade — redireciona qualquer outro usuário sem revelar que a rota existe.
  if (!authUser || authUser.email !== OWNER_EMAIL) {
    redirect("/");
  }

  const { mes: mesParam, grupo: grupoParam } = await searchParams;

  // Período
  let ano: number, mes: number;
  if (mesParam && /^\d{4}-\d{2}$/.test(mesParam)) {
    [ano, mes] = mesParam.split("-").map(Number);
  } else {
    const now = new Date();
    ano = now.getFullYear();
    mes = now.getMonth() + 1;
  }

  const from = new Date(ano, mes - 1, 1);
  const to = new Date(ano, mes, 0, 23, 59, 59, 999);
  const fromISO = from.toISOString();
  const toISO = to.toISOString();

  const supabase = await createClient();

  // Lista de grupos para o seletor
  const { data: grupos } = await supabase
    .from("groups")
    .select("id, name")
    .eq("active", true)
    .order("name");

  const gruposLista = grupos ?? [];
  const grupoId = grupoParam ?? "";

  // Conta ids de accounts no escopo (para filtrar logs autenticados por grupo)
  let accountIdsNoEscopo: string[] | null = null;
  if (grupoId) {
    const { data: contas } = await supabase
      .from("accounts")
      .select("id")
      .eq("group_id", grupoId);
    accountIdsNoEscopo = (contas ?? []).map((a) => a.id);
  }

  // Busca todos os logs do período (agregação acontece em JS)
  let query = supabase
    .from("access_logs")
    .select("account_id, action, created_at")
    .gte("created_at", fromISO)
    .lte("created_at", toISO);

  if (accountIdsNoEscopo !== null) {
    // Inclui logs do grupo E visitas anônimas públicas desse grupo
    const ids = accountIdsNoEscopo;
    if (ids.length > 0) {
      query = query.or(
        `account_id.in.(${ids.join(",")}),and(action.eq.view_public_schedule,group_id.eq.${grupoId})`
      );
    } else {
      // Nenhuma conta no grupo → só visitas públicas
      query = query
        .is("account_id", null)
        .eq("action", "view_public_schedule");
    }
  }

  const { data: logs } = await query;
  const todosLogs: LogRow[] = (logs ?? []) as LogRow[];

  // ── Cards de resumo ──────────────────────────────────────────────────────
  const totalAcoes = todosLogs.length;

  const usuariosAtivos = new Set(
    todosLogs
      .filter((l) => l.account_id !== null)
      .map((l) => l.account_id)
  ).size;

  const viewsPublicas = todosLogs.filter(
    (l) => l.action === "view_public_schedule"
  ).length;

  const loginRecente = todosLogs
    .filter((l) => l.action === "login")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.created_at;

  // ── Atividade por dia (para gráfico) ────────────────────────────────────
  const porDia = new Map<string, number>();
  const diasNoMes = to.getDate();
  for (let d = 1; d <= diasNoMes; d++) {
    porDia.set(String(d).padStart(2, "0"), 0);
  }
  for (const log of todosLogs) {
    const dia = new Date(log.created_at).getDate();
    const key = String(dia).padStart(2, "0");
    porDia.set(key, (porDia.get(key) ?? 0) + 1);
  }
  const dadosGrafico: DiaAtividade[] = Array.from(porDia.entries()).map(
    ([dia, total]) => ({ dia, total })
  );

  // ── Ranking por pessoa (via RPC) ─────────────────────────────────────────
  const { data: rankingPessoas } = await supabase.rpc("get_usage_ranking", {
    p_group_id: grupoId || null,
    p_from_date: fromISO,
    p_to_date: toISO,
  });

  // ── Ranking por tipo de ação ─────────────────────────────────────────────
  const porAcao = new Map<string, number>();
  for (const log of todosLogs) {
    porAcao.set(log.action, (porAcao.get(log.action) ?? 0) + 1);
  }
  const rankingAcoes = Array.from(porAcao.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([action, count]) => ({ action, count }));
  const rankingAcoesSemPage = rankingAcoes.filter(
    (r) => r.action !== "view_page"
  );

  return (
    <>
      <Header variant="back" title="Relatório de Uso" />
      <main className="flex flex-1 flex-col gap-6 px-[18px] pb-8 pt-2 md:p-0">
        {/* Filtros */}
        <Suspense>
          <FiltrosMes
            ano={ano}
            mes={mes}
            grupos={gruposLista}
            grupoId={grupoId}
          />
        </Suspense>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {cartao("Total de ações", totalAcoes)}
          {cartao("Usuários ativos", usuariosAtivos)}
          {cartao("Views link público", viewsPublicas)}
          {cartao(
            "Último acesso",
            loginRecente ? rotuloDataHora(loginRecente) : "—"
          )}
        </div>

        {/* Gráfico de atividade */}
        <section>
          <div className="mb-3 text-[12px] font-semibold uppercase tracking-[1px] text-muted">
            Atividade por dia
          </div>
          <div className="rounded-[16px] border border-black/[0.06] bg-paper px-4 py-4 shadow-card">
            <GraficoAtividade dados={dadosGrafico} />
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Ranking por pessoa */}
          <section>
            <div className="mb-3 text-[12px] font-semibold uppercase tracking-[1px] text-muted">
              Ranking por pessoa
            </div>
            <div className="rounded-[16px] border border-black/[0.06] bg-paper shadow-card overflow-hidden">
              {!rankingPessoas || rankingPessoas.length === 0 ? (
                <p className="px-5 py-4 text-[13px] text-muted">
                  Sem dados no período.
                </p>
              ) : (
                <table className="w-full">
                  <tbody>
                    {(rankingPessoas as { member_name: string; total_acoes: number }[]).map(
                      (r, i) => (
                        <tr
                          key={i}
                          className="border-b border-black/[0.04] last:border-0"
                        >
                          <td className="px-5 py-2.5 text-[13px] text-muted w-6">
                            {i + 1}
                          </td>
                          <td className="py-2.5 text-[13.5px] font-medium text-ink flex-1">
                            {r.member_name}
                          </td>
                          <td className="px-5 py-2.5 text-right text-[13px] font-semibold text-ink-soft">
                            {r.total_acoes}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Ranking por tipo de ação */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[12px] font-semibold uppercase tracking-[1px] text-muted">
                Ações mais usadas
              </div>
            </div>
            <div className="rounded-[16px] border border-black/[0.06] bg-paper shadow-card overflow-hidden">
              <RankingAcoes
                todas={rankingAcoes}
                semPage={rankingAcoesSemPage}
              />
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

function RankingAcoes({
  todas,
  semPage,
}: {
  todas: { action: string; count: number }[];
  semPage: { action: string; count: number }[];
}) {
  // Este componente renderiza server-side mas precisamos do toggle "excluir view_page"
  // — resolvido com um client component separado apenas para o toggle.
  if (todas.length === 0) {
    return (
      <p className="px-5 py-4 text-[13px] text-muted">Sem dados no período.</p>
    );
  }
  return <RankingAcoesToggle todas={todas} semPage={semPage} />;
}

// Inline client component para o toggle — mantém tudo no mesmo arquivo
import RankingAcoesToggle from "./RankingAcoesToggle";
