import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/active-group-server";
import Header from "../components/shell/Header";
import MembroItem from "./MembroItem";

export default async function MembrosPage() {
  const supabase = await createClient();
  const activeGroupId = await getActiveGroupId();

  // Membros = accounts (perfil "member") + dados do usuário e do grupo.
  let query = supabase
    .from("accounts")
    .select("id, suspended_until, user:users(name), group:groups(name)")
    .eq("profile", "member");
  if (activeGroupId) query = query.eq("group_id", activeGroupId);
  const { data: accounts, error } = await query;

  const membros = (accounts ?? [])
    .map((a) => {
      const u = Array.isArray(a.user) ? a.user[0] : a.user;
      const g = Array.isArray(a.group) ? a.group[0] : a.group;
      return {
        id: a.id,
        nome: u?.name ?? "—",
        grupoNome: g?.name ?? "Sem grupo",
        suspensoAte: a.suspended_until as string | null,
      };
    })
    .sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"));

  return (
    <>
      <Header
        variant="root"
        title="Membros"
        actionLabel="+ Cadastrar membro"
        actionHref="/membros/novo"
      />
      <main className="flex flex-1 flex-col gap-2.5 px-[18px] pb-6 pt-0.5 md:p-0">
        <Link
          href="/membros/novo"
          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-black/20 p-3.5 text-[13.5px] font-semibold text-ink md:hidden"
        >
          + Cadastrar membro
        </Link>

        {error && (
          <p className="text-[13px] text-danger">Erro: {error.message}</p>
        )}

        {membros.length === 0 && (
          <p className="text-[13px] text-muted">
            Nenhum membro cadastrado ainda.
          </p>
        )}

        <div className="flex flex-col gap-2.5 md:grid md:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] md:items-start md:gap-3.5">
          {membros.map((membro) => (
            <MembroItem key={membro.id} membro={membro} />
          ))}
        </div>
      </main>
    </>
  );
}
