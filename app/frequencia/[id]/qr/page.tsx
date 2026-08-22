import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/current-user";
import Header from "../../../components/shell/Header";
import QrView from "./QrView";

export const dynamic = "force-dynamic";

type RawRecord = {
  id: string;
  external_name: string | null;
  present: boolean;
};

export default async function FrequenciaQrPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const conta = await getCurrentAccount();
  if (!conta || conta.profile === "member") redirect("/");

  const supabase = await createClient();
  const { data: lista, error } = await supabase
    .from("attendance_lists")
    .select(
      `id, name, date, group_id, qr_token, qr_closed_at,
       attendance_records(id, external_name, present)`
    )
    .eq("id", id)
    .single();

  if (error || !lista || !lista.qr_token) redirect("/frequencia");

  const records = ((lista.attendance_records as unknown as RawRecord[]) ?? []).map(
    (r) => ({ id: r.id, nome: r.external_name ?? "—" })
  );

  return (
    <>
      <Header variant="back" title="QR de presença" />
      <main className="flex flex-1 flex-col overflow-hidden">
        <QrView
          listId={lista.id}
          listName={lista.name as string}
          token={lista.qr_token as string}
          qrFechado={!!lista.qr_closed_at}
          initialRecords={records}
        />
      </main>
    </>
  );
}
