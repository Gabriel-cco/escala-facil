import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/active-group-server";
import { getCurrentAccount } from "@/lib/current-user";
import Header from "../components/shell/Header";
import FrequenciaView from "./FrequenciaView";

export const dynamic = "force-dynamic";

type RawRecord = {
  id: string;
  account_id: string | null;
  external_name: string | null;
  present: boolean;
  account?: unknown;
};

export default async function FrequenciaPage() {
  const conta = await getCurrentAccount();
  if (!conta || conta.profile === "member") redirect("/");

  const supabase = await createClient();
  const activeGroupId = await getActiveGroupId();
  const groupId =
    conta.profile === "coordinator" ? conta.group_id! : activeGroupId;

  if (!groupId) {
    return (
      <>
        <Header variant="back" title="Frequência" />
        <main className="flex flex-1 flex-col items-center justify-center px-[18px] py-12">
          <p className="max-w-xs text-center text-[14px] text-muted">
            Selecione um grupo no topo da página para ver as chamadas de presença.
          </p>
        </main>
      </>
    );
  }

  const [{ data: listasRaw }, { data: grupoData }] = await Promise.all([
    supabase
      .from("attendance_lists")
      .select(
        `id, name, date,
         attendance_records(
           id, account_id, external_name, present,
           account:accounts(user:users(name))
         )`
      )
      .eq("group_id", groupId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("groups")
      .select("name")
      .eq("id", groupId)
      .maybeSingle(),
  ]);

  const listas = (listasRaw ?? []).map((lista) => ({
    id: lista.id,
    name: lista.name,
    date: lista.date,
    records: ((lista.attendance_records as unknown as RawRecord[]) ?? []).map(
      (r) => {
        const acc = Array.isArray(r.account) ? r.account[0] : r.account;
        const u =
          acc &&
          (Array.isArray((acc as { user?: unknown }).user)
            ? (acc as { user: Array<{ name?: string }> }).user[0]
            : (acc as { user?: { name?: string } }).user);
        const name =
          (u as { name?: string } | null)?.name ??
          r.external_name ??
          "—";
        return {
          id: r.id,
          name,
          present: r.present,
          isExternal: r.account_id === null,
        };
      }
    ),
  }));

  const groupName = (grupoData as { name?: string } | null)?.name ?? "";

  return (
    <>
      <Header variant="back" title="Frequência" />
      <main className="flex flex-1 flex-col overflow-hidden">
        <FrequenciaView
          groupId={groupId}
          groupName={groupName}
          listas={listas}
        />
      </main>
    </>
  );
}
