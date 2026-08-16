import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "../components/shell/Header";
import { iniciais } from "@/lib/iniciais";
import { LiturgicalDot } from "../components/LiturgicalDot";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const DIAS_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES_CURTO = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

function prevMes(ano: number, mes: number): string {
  if (mes === 1) return `${ano - 1}-12`;
  return `${ano}-${String(mes - 1).padStart(2, "0")}`;
}

function nextMes(ano: number, mes: number): string {
  if (mes === 12) return `${ano + 1}-01`;
  return `${ano}-${String(mes + 1).padStart(2, "0")}`;
}

function formatarDataEvento(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${DIAS_CURTO[date.getDay()]}, ${d} ${MESES_CURTO[m - 1]}`;
}

export default async function MinhaEscalaPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  // Busca account via join (RPC só retorna profile)
  const { data: userRow } = await supabase
    .from("users")
    .select("id, name, accounts(id, profile, group_id, suspended_until)")
    .eq("auth_id", authUser.id)
    .single();

  type AccRow = { id: string; profile: string; group_id: string | null; suspended_until: string | null };
  const rawAcc = (userRow as { accounts?: AccRow[] | AccRow | null } | null)?.accounts;
  const acc = (Array.isArray(rawAcc) ? rawAcc[0] : rawAcc) as AccRow | null;

  if (!acc) redirect("/acesso-pendente");

  const accountId = acc.id;
  const groupId = acc.group_id;

  if (!groupId) {
    return (
      <>
        <Header variant="root" title="Minha Escala" />
        <main className="flex flex-1 flex-col px-[18px] pb-6 pt-2 md:p-0">
          <p className="text-[13px] text-muted">Você ainda não está vinculado a nenhum grupo.</p>
        </main>
      </>
    );
  }

  // Mês selecionado (default: mês atual)
  let ano: number, mesNum: number;
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    [ano, mesNum] = mes.split("-").map(Number);
  } else {
    const now = new Date();
    ano = now.getFullYear();
    mesNum = now.getMonth() + 1;
  }

  const firstDay = `${ano}-${String(mesNum).padStart(2, "0")}-01`;
  const lastDay = `${ano}-${String(mesNum).padStart(2, "0")}-${new Date(ano, mesNum, 0).getDate()}`;

  // Grupo
  const { data: grupo } = await supabase
    .from("groups")
    .select("name")
    .eq("id", groupId)
    .single();

  // Eventos do mês com atribuições
  const { data: rawEventos } = await supabase
    .from("events")
    .select(`
      id, name, date, time, liturgical_name, liturgical_color,
      assignments(
        id,
        account_id,
        role:roles(id, name),
        account:accounts(id, user:users(name))
      )
    `)
    .eq("group_id", groupId)
    .gte("date", firstDay)
    .lte("date", lastDay)
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  type Assignment = {
    id: string;
    account_id: string;
    role: { id: string; name: string } | { id: string; name: string }[] | null;
    account: { id: string; user: { name: string } | { name: string }[] | null } | null;
  };
  type Evento = {
    id: string; name: string; date: string; time: string;
    liturgical_name: string | null; liturgical_color: string | null;
    assignments: Assignment[] | null;
  };

  const eventos = (rawEventos ?? []) as unknown as Evento[];

  // Suspensão
  const hoje = new Date().toISOString().split("T")[0];
  const estaSuspenso = acc.suspended_until && acc.suspended_until >= hoje;

  const membroNome = (userRow as { name?: string } | null)?.name ?? "Membro";

  return (
    <>
      <Header variant="root" title="Minha Escala" />
      <main className="flex flex-1 flex-col gap-4 px-[18px] pb-6 pt-0.5 md:gap-5 md:p-0">
        {/* Cabeçalho com grupo */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-ink">{membroNome}</div>
            <div className="text-[12.5px] text-muted">{grupo?.name ?? "Grupo"}</div>
          </div>
        </div>

        {/* Aviso de suspensão */}
        {estaSuspenso && (
          <div className="rounded-[14px] border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-[13px] text-[#92400e]">
            Você está suspenso até{" "}
            {new Date(acc.suspended_until! + "T00:00").toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
            })}
            .
          </div>
        )}

        {/* Navegação entre meses */}
        <div className="flex items-center justify-between">
          <Link
            href={`/minha-escala?mes=${prevMes(ano, mesNum)}`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-[18px] text-ink-soft hover:bg-black/[0.04]"
          >
            ‹
          </Link>
          <span className="text-[15px] font-semibold text-ink">
            {MESES[mesNum - 1]} {ano}
          </span>
          <Link
            href={`/minha-escala?mes=${nextMes(ano, mesNum)}`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-[18px] text-ink-soft hover:bg-black/[0.04]"
          >
            ›
          </Link>
        </div>

        {/* Lista de eventos */}
        {eventos.length === 0 ? (
          <p className="text-[13px] text-muted">
            Nenhum evento agendado para {MESES[mesNum - 1].toLowerCase()} de {ano}.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {eventos.map((evento) => {
              const atribuicoes = evento.assignments ?? [];
              const minhaAtribuicao = atribuicoes.find(
                (a) => a.account_id === accountId
              );
              const euEstouEscalado = !!minhaAtribuicao;

              return (
                <div
                  key={evento.id}
                  className={`rounded-[18px] border bg-paper px-[18px] py-4 ${
                    euEstouEscalado
                      ? "border-[#4f46e5]/40 bg-[#eef2ff]"
                      : "border-black/[0.06]"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 font-serif text-[17px] font-semibold leading-tight text-ink">
                        <LiturgicalDot color={evento.liturgical_color} />
                        {evento.name}
                      </div>
                      <div className="mt-0.5 text-[12.5px] text-muted">
                        {formatarDataEvento(evento.date)} ·{" "}
                        {evento.time.slice(0, 5)}
                      </div>
                      {evento.liturgical_name && (
                        <div className="mt-0.5 text-[12px] text-muted">
                          {evento.liturgical_name}
                        </div>
                      )}
                    </div>
                    {euEstouEscalado && (
                      <span className="flex-none rounded-full bg-[#eef2ff] px-2.5 py-1 text-[11px] font-semibold text-[#4f46e5]">
                        Você
                      </span>
                    )}
                  </div>

                  {atribuicoes.length > 0 && (
                    <div className="flex flex-col gap-1.5 border-t border-black/[0.06] pt-3">
                      {atribuicoes.map((a) => {
                        const role = Array.isArray(a.role) ? a.role[0] : a.role;
                        const acc2 = Array.isArray(a.account) ? a.account[0] : a.account;
                        const user2 = acc2?.user;
                        const userName = Array.isArray(user2) ? user2[0]?.name : (user2 as { name?: string } | null)?.name;
                        const isMine = a.account_id === accountId;

                        return (
                          <div
                            key={a.id}
                            className={`flex items-center gap-2.5 ${isMine ? "font-semibold" : ""}`}
                          >
                            <div className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-avatar text-[11px] font-semibold text-avatar-ink">
                              {iniciais(userName ?? "?")}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-[13px] text-ink">
                                {userName ?? "—"}
                              </span>
                              {role && (
                                <span className="ml-1.5 text-[12px] text-muted">
                                  · {(role as { name?: string }).name}
                                </span>
                              )}
                            </div>
                            {isMine && (
                              <span className="text-[11px] font-semibold text-[#4f46e5]">
                                você
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {atribuicoes.length === 0 && (
                    <p className="mt-1 text-[12px] text-muted">
                      Nenhuma função atribuída ainda.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
