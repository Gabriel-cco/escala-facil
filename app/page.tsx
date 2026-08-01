import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/active-group-server";
import Header from "./components/shell/Header";
import { rotuloData, rotuloHora } from "@/lib/datas";

// Depende de cookies (grupo ativo) — sempre renderizado sob demanda.
export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const activeGroupId = await getActiveGroupId();

  // Builders das queries (sem await) para rodar em paralelo — dependem só do
  // activeGroupId (cookie), não uma da outra. Sequencial estourava o timeout.
  let eventosQuery = supabase
    .from("events")
    .select("id, name, date, time, group_id, groups(name)")
    .order("date", { ascending: true })
    .order("time", { ascending: true });
  if (activeGroupId) eventosQuery = eventosQuery.eq("group_id", activeGroupId);

  let membrosQuery = supabase
    .from("accounts")
    .select("id", { count: "exact", head: true })
    .eq("profile", "member");
  if (activeGroupId) membrosQuery = membrosQuery.eq("group_id", activeGroupId);

  let funcoesQuery = supabase.from("roles").select("id, group_id");
  if (activeGroupId) funcoesQuery = funcoesQuery.eq("group_id", activeGroupId);

  const atribuicoesQuery = supabase
    .from("assignments")
    .select("event_id, role_id");

  const [
    { data: userData },
    { data: eventos },
    { count: totalMembros },
    { data: funcoes },
    { data: atribuicoes },
  ] = await Promise.all([
    supabase.auth.getUser(),
    eventosQuery,
    membrosQuery,
    funcoesQuery,
    atribuicoesQuery,
  ]);

  const nomeCompleto =
    (userData?.user?.user_metadata?.full_name as string | undefined) ??
    (userData?.user?.user_metadata?.name as string | undefined) ??
    userData?.user?.email ??
    "";
  const primeiroNome = nomeCompleto.trim().split(/\s+/)[0] || "";

  const totalPorGrupo = new Map<string, number>();
  funcoes?.forEach((f) => {
    totalPorGrupo.set(f.group_id, (totalPorGrupo.get(f.group_id) ?? 0) + 1);
  });
  const atribuidasPorEvento = new Map<string, Set<string>>();
  atribuicoes?.forEach((a) => {
    const set = atribuidasPorEvento.get(a.event_id) ?? new Set<string>();
    set.add(a.role_id);
    atribuidasPorEvento.set(a.event_id, set);
  });

  // Funções (total e atribuídas) somando todos os eventos.
  let totalFuncoes = 0;
  let totalAtribuidas = 0;
  eventos?.forEach((e) => {
    totalFuncoes += totalPorGrupo.get(e.group_id) ?? 0;
    totalAtribuidas += atribuidasPorEvento.get(e.id)?.size ?? 0;
  });

  const stats = [
    { value: String(eventos?.length ?? 0), label: "Eventos agendados" },
    { value: String(totalMembros ?? 0), label: "Membros cadastrados" },
    { value: `${totalAtribuidas}/${totalFuncoes}`, label: "Funções atribuídas" },
  ];

  const proximos = (eventos ?? []).slice(0, 5);

  return (
    <>
      <Header variant="home" />
      <main className="flex flex-1 flex-col gap-6 px-[18px] pb-6 pt-1 md:gap-7 md:p-0">
        {/* Saudação + criar evento (desktop) */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-[24px] font-bold tracking-tight text-ink md:text-[28px]">
              {primeiroNome ? `Olá, ${primeiroNome}` : "Olá"}
            </h1>
            <p className="mt-1 text-[13.5px] text-muted md:text-[14px]">
              Aqui está o panorama da sua paróquia.
            </p>
          </div>
          <Link
            href="/eventos/novo"
            className="hidden flex-none items-center gap-2 rounded-[14px] bg-primary px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-primary-hover md:inline-flex"
          >
            + Criar evento
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-black/[0.06] bg-paper shadow-card p-4 md:rounded-[18px] md:p-[22px]"
            >
              <div className="text-[26px] font-bold leading-none text-ink md:text-[34px]">
                {s.value}
              </div>
              <div className="mt-1.5 text-[11.5px] leading-tight text-muted md:mt-2 md:text-[13px]">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Criar evento (mobile, largura total) */}
        <Link
          href="/eventos/novo"
          className="flex items-center justify-center gap-2 rounded-[14px] bg-primary py-3.5 text-[14.5px] font-semibold text-white transition-colors hover:bg-primary-hover md:hidden"
        >
          + Criar evento
        </Link>

        {/* Próximos eventos */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-ink md:text-[19px]">
              Próximos eventos
            </h2>
            <Link
              href="/eventos"
              className="text-[13px] font-semibold text-primary hover:text-primary-hover"
            >
              Ver todos →
            </Link>
          </div>

          <div className="flex flex-col gap-2.5">
            {proximos.length === 0 && (
              <p className="text-[13px] text-muted">
                Nenhum evento agendado ainda.
              </p>
            )}
            {proximos.map((evento) => {
              const grupo = Array.isArray(evento.groups)
                ? evento.groups[0]
                : evento.groups;
              const total = totalPorGrupo.get(evento.group_id) ?? 0;
              const atribuidas = atribuidasPorEvento.get(evento.id)?.size ?? 0;
              const pct = total ? Math.round((atribuidas / total) * 100) : 0;
              const completo = total > 0 && atribuidas >= total;
              return (
                <Link
                  key={evento.id}
                  href={`/eventos/${evento.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-black/[0.06] bg-paper shadow-card px-4 py-3.5 transition-shadow hover:shadow-hover md:rounded-[14px] md:px-5 md:py-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-semibold text-ink">
                      {evento.name}
                    </div>
                    <div className="mt-0.5 text-[12px] text-muted">
                      {grupo?.name ?? "Sem grupo"} · {rotuloHora(evento.time)}
                    </div>
                  </div>
                  <div className="flex flex-none flex-col items-end gap-1.5">
                    <div className="whitespace-nowrap text-[12px] text-muted">
                      {rotuloData(evento.date)}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-track md:w-32">
                        <div
                          className={`h-full rounded-full ${
                            completo ? "bg-success" : "bg-primary"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-9 text-right text-[11.5px] font-semibold text-ink-soft">
                        {atribuidas}/{total}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}
