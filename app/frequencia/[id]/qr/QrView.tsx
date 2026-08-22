"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { createClient } from "@/lib/supabase/client";
import { iniciais } from "@/lib/iniciais";

type RecordEntry = { id: string; nome: string };

export default function QrView({
  listId,
  listName,
  token,
  qrFechado: initialFechado,
  initialRecords,
}: {
  listId: string;
  listName: string;
  token: string;
  qrFechado: boolean;
  initialRecords: RecordEntry[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [qrFechado, setQrFechado] = useState(initialFechado);
  const [records, setRecords] = useState<RecordEntry[]>(initialRecords);
  const [fechando, setFechando] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  const [novoNome, setNovoNome] = useState("");
  const [adicionando, setAdicionando] = useState(false);
  const [salvandoManual, setSalvandoManual] = useState(false);

  const qrUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/frequencia/avulsa/${token}`
      : "";

  const atualizar = useCallback(async () => {
    setAtualizando(true);
    const { data } = await supabase
      .from("attendance_records")
      .select("id, external_name")
      .eq("list_id", listId)
      .is("account_id", null);
    setRecords(
      (data ?? []).map((r) => ({
        id: r.id,
        nome: (r.external_name as string | null) ?? "—",
      }))
    );
    setAtualizando(false);
  }, [listId, supabase]);

  const fecharQr = async () => {
    if (
      !confirm(
        "Fechar o QR? Ninguém mais poderá se registrar via QR nesta lista."
      )
    )
      return;
    setFechando(true);
    await supabase
      .from("attendance_lists")
      .update({ qr_closed_at: new Date().toISOString() })
      .eq("id", listId);
    setQrFechado(true);
    setFechando(false);
  };

  const adicionarManual = async () => {
    const n = novoNome.trim();
    if (!n) return;
    setSalvandoManual(true);
    const { data } = await supabase
      .from("attendance_records")
      .insert({ list_id: listId, account_id: null, external_name: n, present: true })
      .select("id")
      .single();
    if (data) {
      setRecords((prev) => [...prev, { id: data.id, nome: n }]);
    }
    setNovoNome("");
    setAdicionando(false);
    setSalvandoManual(false);
  };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-[18px] md:p-6 pb-10">

        {/* Nome da lista */}
        <div>
          <h2 className="text-[16px] font-bold text-ink">{listName}</h2>
          <p className="text-[12.5px] text-muted mt-0.5">
            {records.length} {records.length === 1 ? "pessoa registrada" : "pessoas registradas"}
          </p>
        </div>

        {/* QR Code */}
        {!qrFechado && (
          <div className="flex flex-col items-center gap-4 rounded-[16px] border border-[#E3D2B6] bg-white p-6">
            <p className="text-[12.5px] font-semibold text-muted uppercase tracking-wider">
              Mostre este QR para os participantes
            </p>
            <div className="rounded-[12px] bg-white p-3 shadow-sm border border-[#E3D2B6]">
              {qrUrl && <QRCode value={qrUrl} size={220} />}
            </div>
            <p className="text-[11.5px] text-muted text-center max-w-[260px]">
              Quem escanear digita o nome e confirma a presença automaticamente.
            </p>
            <div className="flex w-full gap-2">
              <button
                onClick={atualizar}
                disabled={atualizando}
                className="flex-1 rounded-[10px] border border-[#D6C3A5] py-2.5 text-[13px] font-semibold text-ink disabled:opacity-60"
              >
                {atualizando ? "Atualizando…" : "Atualizar lista"}
              </button>
              <button
                onClick={fecharQr}
                disabled={fechando}
                className="flex-1 rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] py-2.5 text-[13px] font-semibold text-[#B91C1C] disabled:opacity-60"
              >
                {fechando ? "Fechando…" : "Fechar QR"}
              </button>
            </div>
          </div>
        )}

        {/* Status QR fechado */}
        {qrFechado && (
          <div className="flex items-center gap-3 rounded-[12px] border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3">
            <span className="text-[18px]">🔒</span>
            <div>
              <p className="text-[13.5px] font-semibold text-[#92400E]">QR encerrado</p>
              <p className="text-[12px] text-[#B45309]">
                Apenas adições manuais estão disponíveis.
              </p>
            </div>
          </div>
        )}

        {/* Lista de presentes */}
        <div>
          <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[1.1px] text-muted">
            Presentes · {records.length}
          </div>
          <div className="flex flex-col gap-1.5">
            {records.length === 0 ? (
              <p className="text-[13px] text-muted py-2">
                {qrFechado ? "Nenhum registro." : "Aguardando pessoas escanearem o QR…"}
              </p>
            ) : (
              records.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-[8px] bg-[#ECFDF5] px-3 py-2.5"
                >
                  <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#047857]">
                    {iniciais(r.nome)}
                  </div>
                  <span className="text-[13.5px] font-medium text-[#065F46]">
                    {r.nome}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Adicionar manualmente */}
        <div>
          <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[1.1px] text-muted">
            Adicionar manualmente
          </div>
          {adicionando ? (
            <div className="flex items-center gap-2 rounded-[10px] border border-[#D6C3A5] px-4 py-3">
              <input
                autoFocus
                type="text"
                placeholder="Nome da pessoa…"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") adicionarManual();
                  if (e.key === "Escape") {
                    setAdicionando(false);
                    setNovoNome("");
                  }
                }}
                className="min-w-0 flex-1 bg-transparent text-[14px] text-ink focus:outline-none"
              />
              <button
                onClick={adicionarManual}
                disabled={!novoNome.trim() || salvandoManual}
                className="flex-none rounded-[8px] bg-primary px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-60"
              >
                {salvandoManual ? "…" : "Adicionar"}
              </button>
              <button
                onClick={() => { setAdicionando(false); setNovoNome(""); }}
                className="flex-none px-1 text-[18px] leading-none text-muted"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAdicionando(true)}
              className="flex w-full items-center gap-2 rounded-[10px] border border-dashed border-[#D4D4D4] px-4 py-3 text-[13px] font-semibold text-ink-soft hover:border-primary hover:text-primary"
            >
              <span className="text-[16px] leading-none">+</span>
              Adicionar pessoa manualmente
            </button>
          )}
        </div>

        {/* Voltar */}
        <button
          onClick={() => router.push("/frequencia")}
          className="text-[13px] font-semibold text-primary underline underline-offset-2 text-center"
        >
          Voltar para frequência
        </button>
      </div>
    </div>
  );
}
