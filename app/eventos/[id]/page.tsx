import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Header from "../../components/shell/Header";
import EscalaEventoView from "./EscalaEventoView";
import { rotuloData, rotuloHora } from "@/lib/datas";
import { iniciais } from "@/lib/iniciais";
import { getCurrentAccount } from "@/lib/current-user";

export default async function EventoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: evento, error } = await supabase
    .from("events")
    .select(
      "id, name, date, time, group_id, liturgical_name, liturgical_color, groups(name)"
    )
    .eq("id", id)
    .single();

  if (error || !evento) {
    return (
      <>
        <Header variant="back" title="Escala" />
        <main className="flex-1 px-[18px] py-6">
          <p className="text-[13px] text-danger">
            Evento não encontrado{error ? `: ${error.message}` : "."}
          </p>
          <Link
            href="/eventos"
            className="mt-3 inline-block text-[13px] text-ink-soft underline"
          >
            Voltar para eventos
          </Link>
        </main>
      </>
    );
  }

  const grupo = Array.isArray(evento.groups) ? evento.groups[0] : evento.groups;

  const { data: funcoes } = await supabase
    .from("roles")
    .select("id, name")
    .eq("group_id", evento.group_id)
    .eq("active", true)
    .order("name", { ascending: true });

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, user:users(name)")
    .eq("group_id", evento.group_id)
    .eq("profile", "member")
    .eq("active", true)
    .or(`suspended_until.is.null,suspended_until.lt.${evento.date}`);

  const membros = (accounts ?? [])
    .map((a) => {
      const u = Array.isArray(a.user) ? a.user[0] : a.user;
      return { id: a.id, nome: u?.name ?? "—" };
    })
    .sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"));

  const conta = await getCurrentAccount();
  const currentAccountId = conta?.account_id ?? null;
  const podeGerenciar = conta?.profile !== "member";

  const { data: atribuicoes } = await supabase
    .from("assignments")
    .select("id, role_id, account_id, account:accounts(suspended_until, user:users(name))")
    .eq("event_id", id);

  const { data: swapRows } = await supabase
    .from("swap_requests")
    .select("id, assignment_id, requester_account_id")
    .eq("event_id", id)
    .eq("status", "pending");
  const pendingSwaps = new Map<string, { swapId: string; requesterAccountId: string }>(
    (swapRows ?? []).map((s) => [s.assignment_id, { swapId: s.id, requesterAccountId: s.requester_account_id }])
  );

  const porFuncao = new Map<
    string,
    { assignmentId: string; accountId: string; accountName: string; suspendedNaData: boolean }
  >();
  atribuicoes?.forEach((a) => {
    if (porFuncao.has(a.role_id)) return;
    const acc = Array.isArray(a.account) ? a.account[0] : a.account;
    const u = acc && (Array.isArray(acc.user) ? acc.user[0] : acc.user);
    const suspendedUntil = (acc as { suspended_until?: string | null } | null)?.suspended_until ?? null;
    porFuncao.set(a.role_id, {
      assignmentId: a.id,
      accountId: a.account_id,
      accountName: u?.name ?? "—",
      suspendedNaData: suspendedUntil != null && suspendedUntil >= evento.date,
    });
  });

  const atribuicoesLeitura = (funcoes ?? []).map((f) => ({
    roleId: f.id,
    roleName: f.name,
    memberName: porFuncao.get(f.id)?.accountName ?? null,
  }));

  const atribuicoesEdicao = (funcoes ?? []).map((f) => {
    const a = porFuncao.get(f.id);
    const pending = a?.assignmentId ? pendingSwaps.get(a.assignmentId) : undefined;
    return {
      roleId: f.id,
      assignmentId: a?.assignmentId ?? null,
      accountId: a?.accountId ?? null,
      accountName: a?.accountName ?? null,
      suspendedNaData: a?.suspendedNaData ?? false,
      pendingSwapId: pending?.swapId ?? null,
      pendingSwapRequesterId: pending?.requesterAccountId ?? null,
    };
  });

  return (
    <>
      <Header variant="back" title={evento.name} />
      <main className="flex flex-1 flex-col px-[18px] pb-7 pt-0.5 md:p-0">
        <EscalaEventoView
          eventId={evento.id}
          eventDate={evento.date}
          groupId={evento.group_id}
          eventName={evento.name}
          grupoNome={grupo?.name ?? "Grupo"}
          dataLabel={rotuloData(evento.date)}
          horaLabel={rotuloHora(evento.time)}
          liturgicalName={evento.liturgical_name}
          liturgicalColor={evento.liturgical_color}
          podeGerenciar={podeGerenciar}
          currentAccountId={currentAccountId}
          atribuicoesLeitura={atribuicoesLeitura}
          funcoes={(funcoes ?? []).map((f) => ({ id: f.id, nome: f.name }))}
          membros={membros.map((m) => ({
            id: m.id,
            nome: m.nome,
            iniciais: iniciais(m.nome),
          }))}
          atribuicoesEdicao={atribuicoesEdicao}
        />
      </main>
    </>
  );
}
