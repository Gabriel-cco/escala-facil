import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Header from "../components/shell/Header";

export default async function FuncoesPage() {
  const supabase = await createClient();

  const { data: grupos } = await supabase
    .from("groups")
    .select("id, nome")
    .order("nome", { ascending: true });

  const { data: funcoes, error } = await supabase
    .from("roles")
    .select("id, nome, group_id")
    .order("nome", { ascending: true });

  const funcoesPorGrupo = new Map<string, { id: string; nome: string }[]>();
  funcoes?.forEach((f) => {
    const lista = funcoesPorGrupo.get(f.group_id) ?? [];
    lista.push({ id: f.id, nome: f.nome });
    funcoesPorGrupo.set(f.group_id, lista);
  });

  return (
    <>
      <Header
        variant="root"
        title="Funções"
        actionLabel="+ Nova função"
        actionHref="/funcoes/nova"
      />
      <main className="flex flex-1 flex-col gap-5 px-[18px] pb-6 pt-0.5 md:gap-5 md:p-0">
        <Link
          href="/funcoes/nova"
          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-black/20 p-3.5 text-[13.5px] font-semibold text-ink md:hidden"
        >
          + Nova função
        </Link>

        {error && (
          <p className="text-[13px] text-danger">Erro: {error.message}</p>
        )}

        <div className="flex flex-col gap-5 md:grid md:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] md:items-start md:gap-5">
          {grupos?.map((grupo) => {
            const lista = funcoesPorGrupo.get(grupo.id) ?? [];
            if (lista.length === 0) return null;
            return (
              <section
                key={grupo.id}
                className="md:rounded-[18px] md:border md:border-black/[0.06] md:bg-paper md:p-5"
              >
                <div className="mb-2.5 font-serif text-[18px] font-semibold text-ink md:mb-3">
                  {grupo.nome}
                </div>
                <div className="flex flex-col gap-[7px] md:gap-0">
                  {lista.map((f) => (
                    <div
                      key={f.id}
                      className="rounded-xl border border-black/[0.06] bg-paper px-[15px] py-3 text-[13.5px] text-ink md:rounded-none md:border-0 md:border-t md:border-black/[0.06] md:bg-transparent md:px-0 md:py-[9px] md:text-[#3a3a38]"
                    >
                      {f.nome}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {funcoes && funcoes.length === 0 && (
          <p className="text-[13px] text-muted">
            Nenhuma função cadastrada ainda.
          </p>
        )}
      </main>
    </>
  );
}
