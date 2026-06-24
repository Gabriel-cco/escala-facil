import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Header from "../components/shell/Header";

export default async function GruposPage() {
  const supabase = await createClient();

  const { data: grupos, error } = await supabase
    .from("groups")
    .select("id, nome")
    .order("nome", { ascending: true });

  const { data: membros } = await supabase.from("members").select("group_id");
  const { data: funcoes } = await supabase.from("roles").select("group_id");

  const membrosPorGrupo = new Map<string, number>();
  membros?.forEach((m) =>
    membrosPorGrupo.set(m.group_id, (membrosPorGrupo.get(m.group_id) ?? 0) + 1)
  );
  const funcoesPorGrupo = new Map<string, number>();
  funcoes?.forEach((f) =>
    funcoesPorGrupo.set(f.group_id, (funcoesPorGrupo.get(f.group_id) ?? 0) + 1)
  );

  return (
    <>
      <Header
        variant="root"
        title="Grupos"
        actionLabel="+ Novo grupo"
        actionHref="/grupos/novo"
      />
      <main className="flex flex-1 flex-col gap-2.5 px-[18px] pb-6 pt-0.5 md:p-0">
        <Link
          href="/grupos/novo"
          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-black/20 p-3.5 text-[13.5px] font-semibold text-ink md:hidden"
        >
          + Novo grupo
        </Link>

        {error && (
          <p className="text-[13px] text-danger">Erro: {error.message}</p>
        )}

        {grupos && grupos.length === 0 && (
          <p className="text-[13px] text-muted">Nenhum grupo cadastrado ainda.</p>
        )}

        <div className="flex flex-col gap-2.5 md:grid md:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] md:gap-3.5">
          {grupos?.map((grupo) => (
            <Link
              key={grupo.id}
              href={`/grupos/${grupo.id}`}
              className="flex items-center justify-between gap-2.5 rounded-2xl border border-black/[0.06] bg-paper px-[18px] py-4 md:rounded-[18px] md:p-[22px]"
            >
              <div className="flex flex-col gap-[3px] md:gap-1.5">
                <div className="font-serif text-[18px] font-semibold text-ink md:text-[20px]">
                  {grupo.nome}
                </div>
                <div className="text-[12px] text-muted md:text-[12.5px]">
                  {membrosPorGrupo.get(grupo.id) ?? 0} membros ·{" "}
                  {funcoesPorGrupo.get(grupo.id) ?? 0} funções
                </div>
              </div>
              <div className="text-[22px] text-[#bdbdb9] md:hidden">›</div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
