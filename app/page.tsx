import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/active-group-server";
import Header from "./components/shell/Header";
import { rotuloData, rotuloHora } from "@/lib/datas";

const pillEscuro =
  "inline-flex items-center justify-center gap-2 rounded-full bg-primary px-[18px] py-[11px] text-[13px] font-semibold text-paper";

export default async function Home() {
  const supabase = await createClient();
  const activeGroupId = await getActiveGroupId();

  let gruposQuery = supabase
    .from("groups")
    .select("id, name")
    .order("name", { ascending: true });
  if (activeGroupId) gruposQuery = gruposQuery.eq("id", activeGroupId);
  const { data: grupos } = await gruposQuery;

  // Dados para o dashboard web (stats + próximos eventos).
  let eventosQuery = supabase
    .from("events")
    .select("id, name, date, time, group_id, groups(name)")
    .order("date", { ascending: true })
    .order("time", { ascending: true });
  if (activeGroupId) eventosQuery = eventosQuery.eq("group_id", activeGroupId);
  const { data: eventos } = await eventosQuery;

  let membrosQuery = supabase
    .from("accounts")
    .select("id", { count: "exact", head: true })
    .eq("profile", "member");
  if (activeGroupId) membrosQuery = membrosQuery.eq("group_id", activeGroupId);
  const { count: totalMembros } = await membrosQuery;

  let funcoesQuery = supabase.from("roles").select("id, group_id");
  if (activeGroupId) funcoesQuery = funcoesQuery.eq("group_id", activeGroupId);
  const { data: funcoes } = await funcoesQuery;
  const totalPorGrupo = new Map<string, number>();
  funcoes?.forEach((f) => {
    totalPorGrupo.set(f.group_id, (totalPorGrupo.get(f.group_id) ?? 0) + 1);
  });

  const { data: atribuicoes } = await supabase
    .from("assignments")
    .select("event_id, role_id");
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
    {
      value: `${totalAtribuidas}/${totalFuncoes}`,
      label: "Funções atribuídas",
    },
  ];

  const proximos = (eventos ?? []).slice(0, 5);

  return (
    <>
      <Header variant="home" />

      {/* ===== Mobile: hub de cartões ===== */}
      <main className="flex flex-1 flex-col gap-3.5 px-[18px] pb-6 pt-1 md:hidden">
        {/* Cartão intro */}
        <section className="rounded-[22px] bg-surface p-5">
          <p className="mb-4 text-[13.5px] leading-relaxed text-[#6b7280]">
            Organize as escalas de serviço dos grupos da paróquia em um só
            lugar. Comece criando um evento e atribuindo os membros às funções.
          </p>
          <Link href="/eventos" className={pillEscuro}>
            Ir para eventos →
          </Link>
        </section>

        {/* Cartão Eventos */}
        <section className="rounded-[22px] bg-surface px-5 py-6 text-center">
          <div className="mb-1.5 text-[11px] tracking-[1.5px] text-faint">
            AGENDA
          </div>
          <div className="mb-4 font-serif text-2xl font-semibold text-ink">
            Eventos
          </div>
          <div className="flex flex-wrap justify-center gap-2.5">
            <Link href="/eventos/novo" className={pillEscuro}>
              Criar evento
            </Link>
            <Link href="/eventos" className={pillEscuro}>
              Montar escalas
            </Link>
          </div>
        </section>

        {/* Cartão Membros */}
        <section className="rounded-[22px] bg-surface px-5 py-6 text-center">
          <div className="mb-1.5 text-[11px] tracking-[1.5px] text-faint">
            PESSOAS
          </div>
          <div className="mb-4 font-serif text-2xl font-semibold text-ink">
            Membros
          </div>
          <div className="flex flex-wrap justify-center gap-2.5">
            <Link href="/membros/novo" className={pillEscuro}>
              Cadastrar membro
            </Link>
            <Link href="/membros" className={pillEscuro}>
              Gerir participantes
            </Link>
          </div>
        </section>

        {/* Cartão Grupos */}
        <section className="rounded-[22px] bg-surface px-5 py-6 text-center">
          <div className="mb-1.5 text-[11px] tracking-[1.5px] text-faint">
            EQUIPES
          </div>
          <div className="mb-4 font-serif text-2xl font-semibold text-ink">
            Grupos
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {grupos?.map((grupo) => (
              <Link
                key={grupo.id}
                href={`/grupos/${grupo.id}`}
                className="rounded-full border border-black/10 px-[15px] py-[9px] text-[12.5px] font-medium text-ink"
              >
                {grupo.name}
              </Link>
            ))}
            {(!grupos || grupos.length === 0) && (
              <Link
                href="/grupos"
                className="rounded-full border border-black/10 px-[15px] py-[9px] text-[12.5px] font-medium text-muted"
              >
                Cadastrar grupos →
              </Link>
            )}
          </div>
        </section>

        {/* Cartão Funções (escuro) */}
        <Link
          href="/funcoes"
          className="rounded-[22px] bg-primary px-5 py-6 text-center transition-colors hover:bg-primary-hover"
        >
          <div className="mb-1.5 text-[11px] tracking-[1.5px] text-white/70">
            PAPÉIS
          </div>
          <div className="mb-1.5 font-serif text-2xl font-semibold text-white">
            Funções
          </div>
          <div className="text-[12.5px] text-white/60">
            Papéis dentro de cada grupo
          </div>
        </Link>
      </main>

      {/* ===== Web: dashboard ===== */}
      <main className="hidden flex-1 flex-col gap-[26px] md:flex">
        <div className="grid grid-cols-3 gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-[18px] border border-black/[0.06] bg-paper shadow-card p-[22px]"
            >
              <div className="font-serif text-[38px] font-semibold leading-none text-ink">
                {s.value}
              </div>
              <div className="mt-2 text-[13px] text-muted">{s.label}</div>
            </div>
          ))}
        </div>

        <div>
          <div className="mb-3.5 flex items-center justify-between">
            <div className="font-serif text-[20px] font-semibold text-ink">
              Próximos eventos
            </div>
            <Link
              href="/eventos"
              className="text-[13px] font-semibold text-ink-soft"
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
              return (
                <Link
                  key={evento.id}
                  href={`/eventos/${evento.id}`}
                  className="flex items-center gap-5 rounded-[14px] border border-black/[0.06] bg-paper shadow-card px-5 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-serif text-[17px] font-semibold text-ink">
                      {evento.name}
                    </div>
                    <div className="mt-0.5 text-[12.5px] text-muted">
                      {rotuloData(evento.date)} · {rotuloHora(evento.time)} —{" "}
                      {grupo?.name ?? "Sem grupo"}
                    </div>
                  </div>
                  <div className="flex w-40 flex-none items-center gap-2.5">
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
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}
