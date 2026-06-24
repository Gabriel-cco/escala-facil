import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Header from "../../components/shell/Header";
import { iniciais } from "@/lib/iniciais";

export default async function GrupoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: grupo, error } = await supabase
    .from("groups")
    .select("id, nome")
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
    .select("id, nome")
    .eq("group_id", id)
    .order("nome", { ascending: true });

  const { data: membros } = await supabase
    .from("members")
    .select("id, nome")
    .eq("group_id", id)
    .order("nome", { ascending: true });

  return (
    <>
      <Header variant="back" title={grupo.nome} />
      <main className="flex flex-1 flex-col gap-[22px] px-[18px] pb-6 pt-0.5 md:grid md:grid-cols-2 md:items-start md:gap-8 md:p-0">
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
                {f.nome}
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
            {membros?.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-[14px] border border-black/[0.06] bg-paper px-3.5 py-2.5"
              >
                <div className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full bg-avatar text-[13px] font-semibold text-avatar-ink">
                  {iniciais(m.nome)}
                </div>
                <div className="text-[14px] font-semibold text-ink">
                  {m.nome}
                </div>
              </div>
            ))}
            {(!membros || membros.length === 0) && (
              <p className="text-[13px] text-muted">Nenhum membro neste grupo.</p>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
