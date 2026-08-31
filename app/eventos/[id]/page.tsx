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
      "id, name, date, time, group_id, liturgical_name, liturgical_color, ministerio_id, ministerio:ministerios(name), groups(name)"
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
  type MinRow = { name: string };
  const eventoComMin = evento as typeof evento & { ministerio?: MinRow | MinRow[] | null };
  const eventoMinRaw = eventoComMin.ministerio;
  const eventoMinisterioNome =
    (Array.isArray(eventoMinRaw) ? eventoMinRaw[0] : eventoMinRaw)?.name ?? null;

  const { data: eventRolesData } = await supabase
    .from("event_roles")
    .select("role_id, role:roles(id, name, required_qualification_id, assignment_type)")
    .eq("event_id", id);

  const funcoes = (eventRolesData ?? [])
    .map((er) => {
      const role = Array.isArray(er.role) ? er.role[0] : er.role;
      const r = role as { id: string; name: string; required_qualification_id?: string | null; assignment_type?: string | null } | null;
      return {
        id: r?.id ?? "",
        name: r?.name ?? "",
        requiredQualificationId: r?.required_qualification_id ?? null,
        assignmentType: ((r?.assignment_type ?? "pessoa") as "pessoa" | "ministerio"),
      };
    })
    .filter((f) => f.id)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

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

  // Ministérios do grupo (para funções do tipo "ministerio")
  const { data: ministerios } = await supabase
    .from("ministerios")
    .select("id, name")
    .eq("group_id", evento.group_id)
    .order("name", { ascending: true });

  // Qualificações: para funções do tipo pessoa que exigem, filtrar membros elegíveis
  const requiredQualIds = [
    ...new Set(
      funcoes
        .filter((f) => f.requiredQualificationId && f.assignmentType === "pessoa")
        .map((f) => f.requiredQualificationId!)
    ),
  ];
  const qualificadosPorQualId = new Map<string, Set<string>>();
  if (requiredQualIds.length > 0) {
    const { data: aqRows } = await supabase
      .from("account_qualifications")
      .select("account_id, qualification_id")
      .in("qualification_id", requiredQualIds);
    for (const row of aqRows ?? []) {
      if (!qualificadosPorQualId.has(row.qualification_id)) {
        qualificadosPorQualId.set(row.qualification_id, new Set());
      }
      qualificadosPorQualId.get(row.qualification_id)!.add(row.account_id);
    }
  }
  // membrosElegiveisPorFuncao: roleId → accountIds qualificados (somente funções pessoa com exigência)
  const membrosElegiveisPorFuncao: Record<string, string[]> = {};
  for (const f of funcoes) {
    if (!f.requiredQualificationId || f.assignmentType !== "pessoa") continue;
    const qualSet = qualificadosPorQualId.get(f.requiredQualificationId) ?? new Set<string>();
    membrosElegiveisPorFuncao[f.id] = membros.filter((m) => qualSet.has(m.id)).map((m) => m.id);
  }

  const conta = await getCurrentAccount();
  const currentAccountId = conta?.account_id ?? null;
  const podeGerenciar = conta?.profile !== "member";

  const { data: atribuicoes } = await supabase
    .from("assignments")
    .select("id, role_id, account_id, ministerio_id, account:accounts(suspended_until, user:users(name)), ministerio:ministerios(id, name)")
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
    {
      assignmentId: string;
      accountId: string | null;
      accountName: string | null;
      ministerioId: string | null;
      ministerioName: string | null;
      suspendedNaData: boolean;
    }
  >();
  atribuicoes?.forEach((a) => {
    if (porFuncao.has(a.role_id)) return;
    const acc = Array.isArray(a.account) ? a.account[0] : a.account;
    const u = acc && (Array.isArray(acc.user) ? acc.user[0] : acc.user);
    const suspendedUntil = (acc as { suspended_until?: string | null } | null)?.suspended_until ?? null;
    const min = Array.isArray(a.ministerio) ? a.ministerio[0] : a.ministerio;
    porFuncao.set(a.role_id, {
      assignmentId: a.id,
      accountId: a.account_id ?? null,
      accountName: u?.name ?? null,
      ministerioId: a.ministerio_id ?? null,
      ministerioName: (min as { id: string; name: string } | null)?.name ?? null,
      suspendedNaData: suspendedUntil != null && suspendedUntil >= evento.date,
    });
  });

  const atribuicoesLeitura = (funcoes ?? []).map((f) => {
    const a = porFuncao.get(f.id);
    return {
      roleId: f.id,
      roleName: f.name,
      memberName: a?.ministerioName ?? a?.accountName ?? null,
    };
  });

  const atribuicoesEdicao = (funcoes ?? []).map((f) => {
    const a = porFuncao.get(f.id);
    const pending = a?.assignmentId ? pendingSwaps.get(a.assignmentId) : undefined;
    return {
      roleId: f.id,
      assignmentId: a?.assignmentId ?? null,
      accountId: a?.accountId ?? null,
      accountName: a?.accountName ?? null,
      ministerioId: a?.ministerioId ?? null,
      ministerioName: a?.ministerioName ?? null,
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
          ministerioNome={eventoMinisterioNome}
          podeGerenciar={podeGerenciar}
          currentAccountId={currentAccountId}
          atribuicoesLeitura={atribuicoesLeitura}
          funcoes={(funcoes ?? []).map((f) => ({ id: f.id, nome: f.name, assignmentType: f.assignmentType }))}
          membros={membros.map((m) => ({
            id: m.id,
            nome: m.nome,
            iniciais: iniciais(m.nome),
          }))}
          ministerios={ministerios ?? []}
          membrosElegiveisPorFuncao={membrosElegiveisPorFuncao}
          atribuicoesEdicao={atribuicoesEdicao}
        />
      </main>
    </>
  );
}
