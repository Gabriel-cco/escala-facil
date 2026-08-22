import { createAdminClient } from "@/lib/supabase/admin";
import ScanForm from "./ScanForm";

export const dynamic = "force-dynamic";

export default async function FrequenciaAvulsaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const admin = createAdminClient();
  const { data: lista } = await admin
    .from("attendance_lists")
    .select("id, name, date, qr_closed_at, group:groups(name)")
    .eq("qr_token", token)
    .maybeSingle();

  if (!lista) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-screen px-6">
        <div className="max-w-sm w-full text-center">
          <div className="text-[40px] mb-4">❌</div>
          <h1 className="text-[20px] font-bold text-ink mb-2">Link inválido</h1>
          <p className="text-[14px] text-muted">
            Este QR code não é válido ou não existe.
          </p>
        </div>
      </div>
    );
  }

  const grupoNome =
    lista.group && !Array.isArray(lista.group)
      ? (lista.group as { name: string }).name
      : Array.isArray(lista.group) && lista.group.length > 0
        ? (lista.group[0] as { name: string }).name
        : "";

  const fechado = !!lista.qr_closed_at;

  if (fechado) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-screen px-6">
        <div className="max-w-sm w-full text-center">
          <div className="text-[40px] mb-4">🔒</div>
          <h1 className="text-[20px] font-bold text-ink mb-2">Lista encerrada</h1>
          <p className="text-[14px] text-muted">
            O coordenador encerrou esta lista de presença.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-screen px-6 py-12">
      <div className="max-w-sm w-full">
        <div className="mb-8 text-center">
          <div className="text-[32px] mb-3">✋</div>
          <h1 className="text-[20px] font-bold text-ink">{lista.name}</h1>
          {grupoNome && (
            <p className="mt-1 text-[13px] text-muted">{grupoNome}</p>
          )}
        </div>
        <ScanForm token={token} />
      </div>
    </div>
  );
}
