import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/active-group-server";
import { getCurrentAccount } from "@/lib/current-user";
import Header from "../../components/shell/Header";
import FazerChamadaForm from "./FazerChamadaForm";

export const dynamic = "force-dynamic";

export default async function NovaFrequenciaPage() {
  const conta = await getCurrentAccount();
  if (!conta || conta.profile === "member") redirect("/");

  const supabase = await createClient();
  const activeGroupId = await getActiveGroupId();
  const grupoId =
    conta.profile === "coordinator" ? conta.group_id! : activeGroupId;

  const grupos =
    conta.profile === "admin"
      ? ((await supabase
            .from("groups")
            .select("id, name")
            .eq("active", true)
            .order("name")).data ?? [])
      : [];

  let membros: { id: string; nome: string }[] = [];
  let eventos: { id: string; name: string; date: string; time: string }[] = [];
  let grupoNome = "";

  if (grupoId) {
    const hoje = new Date().toISOString().slice(0, 10);
    const [membrosRes, eventosRes, grupoRes] = await Promise.all([
      supabase
        .from("accounts")
        .select("id, user:users(name)")
        .eq("group_id", grupoId)
        .eq("active", true)
        .in("profile", ["member", "coordinator"]),
      supabase
        .from("events")
        .select("id, name, date, time")
        .eq("group_id", grupoId)
        .gte("date", hoje)
        .order("date")
        .limit(20),
      supabase
        .from("groups")
        .select("name")
        .eq("id", grupoId)
        .maybeSingle(),
    ]);

    membros = (membrosRes.data ?? [])
      .map((a) => {
        const u = Array.isArray(a.user) ? a.user[0] : a.user;
        const nome = (u as { name?: string } | null)?.name ?? "—";
        return { id: a.id, nome };
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    eventos = (eventosRes.data ?? []).map((e) => ({
      id: e.id,
      name: e.name,
      date: e.date,
      time: e.time ?? "",
    }));

    grupoNome = (grupoRes.data as { name?: string } | null)?.name ?? "";
  }

  return (
    <>
      <Header variant="back" title="Fazer chamada" />
      <main className="flex flex-1 flex-col overflow-hidden">
        <FazerChamadaForm
          accountId={conta.account_id}
          perfil={conta.profile}
          grupoIdInicial={grupoId}
          grupoNomeInicial={grupoNome}
          membrosIniciais={membros}
          eventosIniciais={eventos}
          grupos={grupos}
        />
      </main>
    </>
  );
}
