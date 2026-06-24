import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Header from "../../components/shell/Header";
import AtribuicoesManager from "./AtribuicoesManager";
import { rotuloData, rotuloHora } from "@/lib/datas";
import { iniciais } from "@/lib/iniciais";

export default async function EventoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: evento, error } = await supabase
    .from("events")
    .select("id, titulo, data_hora, group_id, groups(nome)")
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

  // Data do evento (só a parte da data) para avaliar a suspensão dos membros.
  const dataEvento = new Date(evento.data_hora).toISOString().split("T")[0];

  // Funções do grupo do evento.
  const { data: funcoes } = await supabase
    .from("roles")
    .select("id, nome")
    .eq("group_id", evento.group_id)
    .order("nome", { ascending: true });

  // Membros elegíveis: mesmo grupo, ativos e não suspensos na data do evento.
  const { data: membros } = await supabase
    .from("members")
    .select("id, nome")
    .eq("group_id", evento.group_id)
    .eq("ativo", true)
    .or(`suspenso_ate.is.null,suspenso_ate.lt.${dataEvento}`)
    .order("nome", { ascending: true });

  // Atribuições já feitas para o evento.
  const { data: atribuicoes } = await supabase
    .from("assignments")
    .select("id, role_id, member_id, members(nome)")
    .eq("event_id", id);

  // Uma atribuição por função (semântica do protótipo): pega a primeira.
  const porFuncao = new Map<
    string,
    { assignmentId: string; memberId: string; memberName: string }
  >();
  atribuicoes?.forEach((a) => {
    if (porFuncao.has(a.role_id)) return;
    const m = Array.isArray(a.members) ? a.members[0] : a.members;
    porFuncao.set(a.role_id, {
      assignmentId: a.id,
      memberId: a.member_id,
      memberName: m?.nome ?? "—",
    });
  });

  return (
    <>
      <Header variant="back" title={evento.titulo} />
      <main className="flex flex-1 flex-col px-[18px] pb-7 pt-0.5 md:p-0">
        <AtribuicoesManager
          eventId={evento.id}
          grupoNome={grupo?.nome ?? "Grupo"}
          dataLabel={rotuloData(evento.data_hora)}
          horaLabel={rotuloHora(evento.data_hora)}
          funcoes={(funcoes ?? []).map((f) => ({ id: f.id, nome: f.nome }))}
          membros={(membros ?? []).map((m) => ({
            id: m.id,
            nome: m.nome,
            iniciais: iniciais(m.nome),
          }))}
          atribuicoes={(funcoes ?? []).map((f) => {
            const a = porFuncao.get(f.id);
            return {
              roleId: f.id,
              assignmentId: a?.assignmentId ?? null,
              memberId: a?.memberId ?? null,
              memberName: a?.memberName ?? null,
            };
          })}
        />
      </main>
    </>
  );
}
