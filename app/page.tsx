import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/active-group-server";
import { getAuthUser } from "@/lib/current-user";
import Header from "./components/shell/Header";
import { rotuloHora } from "@/lib/datas";
import { liturgicalEmoji } from "./components/LiturgicalDot";

// Depende de cookies (grupo ativo) — sempre renderizado sob demanda.
export const dynamic = "force-dynamic";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function formatarData(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${DIAS[date.getDay()]}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

export default async function Home() {
  const supabase = await createClient();
  const activeGroupId = await getActiveGroupId();

  // Builders das queries (sem await) para rodar em paralelo — dependem só do
  // activeGroupId (cookie), não uma da outra. Sequencial estourava o timeout.
  let eventosQuery = supabase
    .from("events")
    .select("id, name, date, time, group_id, liturgical_name, liturgical_color, groups(name)")
    .order("date", { ascending: true })
    .order("time", { ascending: true });
  if (activeGroupId) eventosQuery = eventosQuery.eq("group_id", activeGroupId);

  let membrosQuery = supabase
    .from("accounts")
    .select("id", { count: "exact", head: true })
    .eq("profile", "member");
  if (activeGroupId) membrosQuery = membrosQuery.eq("group_id", activeGroupId);

  let funcoesQuery = supabase.from("roles").select("id, name, group_id").eq("active", true);
  if (activeGroupId) funcoesQuery = funcoesQuery.eq("group_id", activeGroupId);

  const atribuicoesQuery = supabase
    .from("assignments")
    .select("event_id, role_id, account:accounts(user:users(name))");

  const [
    authUser,
    { data: eventos },
    { count: totalMembros },
    { data: funcoes },
    { data: atribuicoes },
  ] = await Promise.all([
    getAuthUser(),
    eventosQuery,
    membrosQuery,
    funcoesQuery,
    atribuicoesQuery,
  ]);

  const nomeCompleto =
    (authUser?.user_metadata?.full_name as string | undefined) ??
    (authUser?.user_metadata?.name as string | undefined) ??
    authUser?.email ??
    "";
  const primeiroNome = nomeCompleto.trim().split(/\s+/)[0] || "";

  // Roles agrupadas por grupo para montar a lista de cada card
  const funcoesPorGrupo = new Map<string, { id: string; name: string }[]>();
  funcoes?.forEach((f) => {
    const list = funcoesPorGrupo.get(f.group_id) ?? [];
    list.push({ id: f.id, name: f.name });
    funcoesPorGrupo.set(f.group_id, list);
  });

  // Membro escalado por (event_id, role_id)
  const memberPorEventoRole = new Map<string, string>();
  atribuicoes?.forEach((a) => {
    const acc = Array.isArray(a.account) ? a.account[0] : a.account;
    const u = acc && (Array.isArray(acc.user) ? acc.user[0] : acc.user);
    const name = (u as { name?: string } | null)?.name ?? "—";
    memberPorEventoRole.set(`${a.event_id}:${a.role_id}`, name);
  });

  const stats = [
    { value: String(eventos?.length ?? 0), label: "Eventos agendados" },
    { value: String(totalMembros ?? 0), label: "Membros cadastrados" },
  ];

  // "Próximos" = a partir de hoje (eventos de hoje seguem visíveis). A query já
  // vem ordenada por data crescente, então basta filtrar os passados e cortar.
  const agora = new Date();
  const hojeStr = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
  const proximos = (eventos ?? []).filter((e) => e.date >= hojeStr).slice(0, 5);
  const proximoId = proximos[0]?.id ?? null;

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
        <div className="grid grid-cols-2 gap-3 md:gap-4">
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

          <div className="flex flex-col gap-3">
            {proximos.length === 0 && (
              <p className="text-[13px] text-muted">
                Nenhum evento agendado ainda.
              </p>
            )}
            {proximos.map((evento) => {
              const grupo = Array.isArray(evento.groups)
                ? evento.groups[0]
                : evento.groups;
              const ehProximo = evento.id === proximoId;

              const funcoesDoGrupo = (funcoesPorGrupo.get(evento.group_id) ?? [])
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

              const atribuicoesDoEvento = funcoesDoGrupo.map((f) => ({
                roleName: f.name,
                memberName: memberPorEventoRole.get(`${evento.id}:${f.id}`) ?? null,
              }));

              return (
                <Link
                  key={evento.id}
                  href={`/eventos/${evento.id}`}
                  className={`block rounded-[18px] border bg-paper px-[18px] py-4 transition-colors hover:shadow-hover ${
                    ehProximo ? "border-[#c9b98a]" : "border-black/[0.06]"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-serif text-[17px] font-semibold leading-tight text-ink">
                        {evento.name}
                      </div>
                      <div className="mt-0.5 text-[12.5px] text-muted">
                        {formatarData(evento.date)} · {rotuloHora(evento.time)}
                      </div>
                      {evento.liturgical_name && (
                        <div className="mt-0.5 text-[12px] text-muted">
                          {liturgicalEmoji(evento.liturgical_color)}{" "}
                          {evento.liturgical_name}
                        </div>
                      )}
                      {grupo?.name && (
                        <div className="mt-0.5 text-[12px] text-faint">{grupo.name}</div>
                      )}
                    </div>
                    {ehProximo && (
                      <span className="flex-none rounded-full bg-[#efe6cc] px-2.5 py-1 text-[11px] font-semibold text-[#7a6420]">
                        Próximo
                      </span>
                    )}
                  </div>

                  {atribuicoesDoEvento.length === 0 ? (
                    <p className="text-[12.5px] text-faint">
                      Nenhuma função definida ainda.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1.5 border-t border-black/[0.06] pt-3">
                      {atribuicoesDoEvento.map((a, i) => (
                        <div
                          key={i}
                          className="flex items-baseline justify-between gap-3 text-[13.5px]"
                        >
                          <span className="text-muted">{a.roleName}</span>
                          <span className="text-right font-medium text-ink">
                            {a.memberName ?? "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}
