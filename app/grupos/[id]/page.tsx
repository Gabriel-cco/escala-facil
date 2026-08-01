import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Header from "../../components/shell/Header";
import { iniciais } from "@/lib/iniciais";

const iconeLapis = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export default async function GrupoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const { data: pRows } = authUser
    ? await supabase.rpc("get_account_by_auth_id", { p_auth_id: authUser.id })
    : { data: null };
  const perfil = pRows?.[0]?.profile as string | undefined;
  const podeEditarGrupo = perfil === "admin";
  const podeEditarMembro = perfil === "admin" || perfil === "coordinator";

  const { data: grupo, error } = await supabase
    .from("groups")
    .select("id, name")
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
          <Link
            href="/grupos"
            className="mt-3 inline-block text-[13px] text-ink-soft underline"
          >
            Voltar para grupos
          </Link>
        </main>
      </>
    );
  }

  const { data: funcoes } = await supabase
    .from("roles")
    .select("id, name")
    .eq("group_id", id)
    .order("name", { ascending: true });

  // Membros do grupo via accounts + users (perfil "member").
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, user:users(id, name)")
    .eq("group_id", id)
    .eq("profile", "member");

  const membros = (accounts ?? [])
    .map((a) => {
      const u = Array.isArray(a.user) ? a.user[0] : a.user;
      return { id: a.id, nome: u?.name ?? "—" };
    })
    .sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"));

  return (
    <>
      <Header variant="back" title={grupo.name} />
      <main className="flex flex-1 flex-col gap-[22px] px-[18px] pb-6 pt-0.5 md:grid md:grid-cols-2 md:items-start md:gap-8 md:p-0">
        {podeEditarGrupo && (
          <div className="col-span-2 flex justify-end md:-mt-2">
            <Link
              href={`/grupos/editar/${grupo.id}`}
              className="flex items-center gap-1.5 rounded-full border border-black/10 px-3.5 py-2 text-[12.5px] font-semibold text-ink-soft hover:text-ink"
            >
              {iconeLapis}
              Editar grupo
            </Link>
          </div>
        )}

        <section>
          <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-faint">
            Funções
          </div>
          <div className="flex flex-wrap gap-2">
            {funcoes?.map((f) => (
              <div
                key={f.id}
                className="rounded-full border border-black/10 px-[15px] py-[9px] text-[13px] text-ink"
              >
                {f.name}
              </div>
            ))}
            {(!funcoes || funcoes.length === 0) && (
              <p className="text-[13px] text-muted">Nenhuma função cadastrada.</p>
            )}
          </div>
        </section>

        <section>
          <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-faint">
            Membros
          </div>
          <div className="flex flex-col gap-2.5">
            {membros.map((m) => (
              <div
                key={m.id}
                className="group flex items-center gap-3 rounded-[14px] border border-black/[0.06] bg-paper px-3.5 py-2.5"
              >
                <div className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full bg-avatar text-[13px] font-semibold text-avatar-ink">
                  {iniciais(m.nome)}
                </div>
                <div className="flex-1 text-[14px] font-semibold text-ink">
                  {m.nome}
                </div>
                {podeEditarMembro && (
                  <Link
                    href={`/membros/editar/${m.id}`}
                    className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-faint opacity-0 transition-opacity hover:bg-black/[0.04] hover:text-ink group-hover:opacity-100"
                    title="Editar membro"
                  >
                    {iconeLapis}
                  </Link>
                )}
              </div>
            ))}
            {membros.length === 0 && (
              <p className="text-[13px] text-muted">Nenhum membro neste grupo.</p>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
