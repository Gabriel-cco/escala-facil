import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/current-user";
import Header from "../../components/shell/Header";
import { iniciais } from "@/lib/iniciais";
import CompartilharEscala from "./CompartilharEscala";
import QualificacoesSection from "./QualificacoesSection";
import TiposEventoSection from "./TiposEventoSection";

const iconeLapis = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const iconeArrow = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

export default async function GrupoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const conta = await getCurrentAccount();
  const perfil = conta?.profile;
  const podeEditarGrupo = perfil === "admin";
  const podeEditarMembro = perfil === "admin" || perfil === "coordinator";

  const { data: grupo, error } = await supabase
    .from("groups")
    .select("id, name, description")
    .eq("id", id)
    .single();

  if (error || !grupo) {
    return (
      <>
        <Header variant="back" title="Grupo" />
        <main className="flex-1 px-[18px] py-6">
          <p className="text-[13px] text-danger">
            Grupo não encontrado{error ? `: ${error.message}` : "."}
          </p>
          <Link href="/grupos" className="mt-3 inline-block text-[13px] text-ink-soft underline">
            Voltar para grupos
          </Link>
        </main>
      </>
    );
  }

  const [
    { data: funcoes },
    { data: accounts },
    { data: qualificacoes },
    { data: tiposRaw },
    { count: eventCount },
  ] = await Promise.all([
    supabase.from("roles").select("id, name").eq("group_id", id).eq("active", true).order("name"),
    supabase.from("accounts").select("id, user:users(id, name)").eq("group_id", id).eq("profile", "member").eq("active", true),
    supabase.from("qualifications").select("id, name, exclui_de_escala").eq("group_id", id).order("name"),
    supabase.from("event_types").select("id, name, event_type_roles(role_id)").eq("group_id", id).eq("active", true).order("name"),
    supabase.from("events").select("*", { count: "exact", head: true }).eq("group_id", id),
  ]);

  const membros = (accounts ?? [])
    .map((a) => {
      const u = Array.isArray(a.user) ? a.user[0] : a.user;
      return { id: a.id, nome: u?.name ?? "—" };
    })
    .sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"));

  const tipos = (tiposRaw ?? []).map((t) => ({
    id: t.id,
    name: t.name as string,
    roleIds: new Set<string>(
      ((t.event_type_roles ?? []) as { role_id: string }[]).map((r) => r.role_id)
    ),
  }));

  const AVATAR_MAX = 12;
  const membrosVisiveis = membros.slice(0, AVATAR_MAX);
  const membrosExtras = membros.length - AVATAR_MAX;

  return (
    <>
      <Header variant="back" title={grupo.name} />
      <main className="flex flex-1 flex-col gap-5 px-[18px] pb-8 pt-0.5 md:p-0">

        {/* Ações */}
        {(podeEditarGrupo || podeEditarMembro) && (
          <div className="flex flex-wrap items-center gap-2">
            {podeEditarGrupo && (
              <Link
                href={`/grupos/editar/${grupo.id}`}
                className="flex items-center gap-1.5 rounded-full border border-black/10 px-3.5 py-2 text-[12.5px] font-semibold text-ink-soft hover:text-ink"
              >
                {iconeLapis}
                Editar grupo
              </Link>
            )}
            {podeEditarMembro && (
              <CompartilharEscala groupId={grupo.id} groupName={grupo.name} accountId={conta?.account_id} />
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Link
            href={`/membros?grupo=${grupo.id}`}
            className="flex flex-col rounded-[18px] border border-black/[0.06] bg-paper px-4 py-3.5 shadow-card transition-shadow hover:shadow-hover"
          >
            <span className="text-[26px] font-bold leading-none text-ink">{membros.length}</span>
            <span className="mt-1 text-[12px] text-muted">Membros</span>
          </Link>
          <Link
            href="/funcoes"
            className="flex flex-col rounded-[18px] border border-black/[0.06] bg-paper px-4 py-3.5 shadow-card transition-shadow hover:shadow-hover"
          >
            <span className="text-[26px] font-bold leading-none text-ink">{funcoes?.length ?? 0}</span>
            <span className="mt-1 text-[12px] text-muted">Funções</span>
          </Link>
          <div className="flex flex-col rounded-[18px] border border-black/[0.06] bg-paper px-4 py-3.5 shadow-card">
            <span className="text-[26px] font-bold leading-none text-ink">{eventCount ?? 0}</span>
            <span className="mt-1 text-[12px] text-muted">Eventos</span>
          </div>
        </div>

        {/* Membros — grade de avatares */}
        <div className="rounded-[20px] border border-black/[0.06] bg-paper shadow-card">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <span className="text-[13px] font-semibold text-ink">Membros</span>
            <Link
              href="/membros"
              className="flex items-center gap-1 text-[12px] font-medium text-primary"
            >
              Ver todos {iconeArrow}
            </Link>
          </div>
          <div className="px-4 pb-4">
            {membros.length === 0 ? (
              <p className="text-[13px] text-muted">Nenhum membro ativo.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {membrosVisiveis.map((m) => (
                  <Link
                    key={m.id}
                    href={`/membros/editar/${m.id}`}
                    title={m.nome}
                    className="group flex flex-col items-center gap-1"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-avatar text-[12px] font-semibold text-avatar-ink ring-2 ring-transparent transition-all group-hover:ring-primary/30">
                      {iniciais(m.nome)}
                    </div>
                    <span className="w-10 truncate text-center text-[10px] text-muted">
                      {m.nome.split(" ")[0]}
                    </span>
                  </Link>
                ))}
                {membrosExtras > 0 && (
                  <Link href="/membros" className="flex flex-col items-center gap-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-black/15 text-[11px] font-semibold text-muted">
                      +{membrosExtras}
                    </div>
                    <span className="w-10 text-center text-[10px] text-muted">mais</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Funções — chips em card */}
        <div className="rounded-[20px] border border-black/[0.06] bg-paper shadow-card">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <span className="text-[13px] font-semibold text-ink">Funções</span>
            {podeEditarMembro && (
              <Link href="/funcoes" className="flex items-center gap-1 text-[12px] font-medium text-primary">
                Gerenciar {iconeArrow}
              </Link>
            )}
          </div>
          <div className="flex flex-wrap gap-2 px-4 pb-4">
            {(funcoes ?? []).map((f) => (
              <span
                key={f.id}
                className="rounded-full border border-black/10 bg-surface px-3 py-1.5 text-[12.5px] text-ink"
              >
                {f.name}
              </span>
            ))}
            {(!funcoes || funcoes.length === 0) && (
              <p className="text-[13px] text-muted">Nenhuma função cadastrada.</p>
            )}
          </div>
        </div>

        {/* Qualificações */}
        <div className="rounded-[20px] border border-black/[0.06] bg-paper shadow-card px-4 py-4">
          <QualificacoesSection
            groupId={grupo.id}
            qualificacoes={qualificacoes ?? []}
            podeGerenciar={podeEditarMembro}
          />
        </div>

        {/* Tipos de evento */}
        <div className="rounded-[20px] border border-black/[0.06] bg-paper shadow-card px-4 py-4">
          <TiposEventoSection
            groupId={grupo.id}
            roles={funcoes ?? []}
            tipos={tipos}
            podeGerenciar={podeEditarMembro}
          />
        </div>

      </main>
    </>
  );
}
