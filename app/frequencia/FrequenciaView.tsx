"use client";
import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type RecordEntry = {
  id: string;
  name: string;
  present: boolean;
  isExternal: boolean;
};

type ListaEntry = {
  id: string;
  name: string;
  date: string;
  records: RecordEntry[];
};

type ReportEntry = {
  account_id: string;
  member_name: string;
  present_count: number;
  total_count: number;
};

const MESES_ABREV = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];
const DIAS_SEMANA = [
  "Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado",
];
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function fmtAbrev(dateStr: string) {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${d} ${MESES_ABREV[m - 1]}`;
}

function fmtLonga(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${DIAS_SEMANA[date.getDay()]}, ${d} de ${MESES[m - 1]}`;
}

function ini(nome: string) {
  return nome
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function barColor(pct: number) {
  if (pct >= 80) return "#059669";
  if (pct >= 50) return "#6B3521";
  return "#B07A1E";
}

function pctColor(pct: number) {
  if (pct >= 80) return "#2F6B44";
  if (pct >= 50) return "#6E5A4E";
  return "#8A5A12";
}

const PERIODOS = [
  { id: "todo" as const, label: "Todo o período" },
  { id: "30" as const, label: "30 dias" },
  { id: "90" as const, label: "90 dias" },
];

export default function FrequenciaView({
  groupId,
  groupName,
  listas,
}: {
  groupId: string;
  groupName: string;
  listas: ListaEntry[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [tab, setTab] = useState<"historico" | "relatorio">("historico");
  const [selectedListId, setSelectedListId] = useState<string | null>(
    listas.length > 0 ? listas[0].id : null
  );
  const [periodo, setPeriodo] = useState<"todo" | "30" | "90">("todo");
  const [relatorio, setRelatorio] = useState<ReportEntry[]>([]);
  const [loadingRel, setLoadingRel] = useState(false);
  const [excluindo, setExcluindo] = useState<string | null>(null);

  const fetchRelatorio = useCallback(
    async (p: "todo" | "30" | "90") => {
      setLoadingRel(true);
      const { data } = await supabase.rpc("get_attendance_report", {
        p_group_id: groupId,
        p_days: p === "todo" ? null : Number(p),
      });
      setRelatorio((data as ReportEntry[] | null) ?? []);
      setLoadingRel(false);
    },
    [groupId, supabase]
  );

  const handleTabChange = (t: "historico" | "relatorio") => {
    setTab(t);
    if (t === "relatorio") fetchRelatorio(periodo);
  };

  const handlePeriodoChange = (p: "todo" | "30" | "90") => {
    setPeriodo(p);
    fetchRelatorio(p);
  };

  const excluirLista = async (listId: string) => {
    if (!confirm("Excluir esta chamada? Esta ação não pode ser desfeita."))
      return;
    setExcluindo(listId);
    await supabase.from("attendance_lists").delete().eq("id", listId);
    if (selectedListId === listId) setSelectedListId(null);
    router.refresh();
  };

  const selectedLista = listas.find((l) => l.id === selectedListId);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Abas */}
      <div className="flex flex-none border-b border-black/[0.06]">
        {(["historico", "relatorio"] as const).map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className="px-5 py-4 text-[14px] font-semibold transition-colors"
            style={{
              color: tab === t ? "#171717" : "#8A7466",
              borderBottom: `2px solid ${tab === t ? "#6B3521" : "transparent"}`,
            }}
          >
            {t === "historico" ? "Histórico" : "Relatório"}
          </button>
        ))}
      </div>

      {/* ── Histórico ── */}
      {tab === "historico" && (
        <div className="flex flex-1 overflow-hidden md:flex-row">
          {/* Lista lateral */}
          <div className="flex flex-none flex-col gap-2 overflow-y-auto p-[18px] md:w-[320px] md:border-r md:border-black/[0.06] md:p-6">
            <Link
              href="/frequencia/nova"
              className="mb-1 flex items-center justify-center gap-2 rounded-[12px] bg-primary py-3 text-[14px] font-semibold text-white hover:bg-primary-hover"
            >
              + Fazer chamada
            </Link>

            {listas.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-muted">
                Nenhuma chamada registrada ainda.
              </p>
            ) : (
              listas.map((lista) => {
                const total = lista.records.length;
                const presentes = lista.records.filter((r) => r.present).length;
                const pct = total > 0 ? Math.round((presentes / total) * 100) : 0;
                const selecionado = lista.id === selectedListId;
                return (
                  <button
                    key={lista.id}
                    onClick={() => setSelectedListId(lista.id)}
                    className="w-full rounded-[10px] border px-4 py-3.5 text-left transition-colors"
                    style={{
                      background: selecionado ? "#F2E7D4" : "#fff",
                      borderColor: selecionado ? "#D6C3A5" : "#E3D2B6",
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 truncate text-[14px] font-semibold text-ink">
                        {lista.name}
                      </div>
                      <div className="flex-none whitespace-nowrap text-[12px] text-muted">
                        {fmtAbrev(lista.date)}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-[#F2E7D4]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: pct === 100 ? "#059669" : "#6B3521",
                          }}
                        />
                      </div>
                      <div className="flex-none whitespace-nowrap text-[12px] font-semibold text-[#6E5A4E]">
                        {presentes}/{total}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Detalhe */}
          <div className="flex-1 overflow-y-auto p-[18px] md:p-6">
            {!selectedLista ? (
              <p className="text-[13px] text-muted">
                Selecione uma chamada para ver o detalhe.
              </p>
            ) : (
              <div className="max-w-lg rounded-[12px] border border-black/[0.06] bg-paper p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[16px] font-bold text-ink">
                      {selectedLista.name}
                    </div>
                    <div className="mt-0.5 text-[12.5px] text-muted">
                      {fmtLonga(selectedLista.date)} · {groupName}
                    </div>
                  </div>
                  <div className="flex flex-none gap-2">
                    <Link
                      href={`/frequencia/${selectedLista.id}/editar`}
                      className="rounded-[8px] border border-[#D4D4D4] bg-white px-3 py-1.5 text-[12px] font-semibold text-ink hover:bg-surface"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => excluirLista(selectedLista.id)}
                      disabled={excluindo === selectedLista.id}
                      className="rounded-[8px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-1.5 text-[12px] font-semibold text-[#B91C1C] disabled:opacity-60"
                    >
                      {excluindo === selectedLista.id ? "…" : "Excluir"}
                    </button>
                  </div>
                </div>

                {/* Presentes */}
                <div className="mt-5">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#059669]" />
                    <div className="text-[12.5px] font-semibold uppercase tracking-wider text-[#065F46]">
                      Presentes ·{" "}
                      {selectedLista.records.filter((r) => r.present).length}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {selectedLista.records
                      .filter((r) => r.present)
                      .map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center gap-2.5 rounded-[8px] px-3 py-2"
                          style={{ background: "#ECFDF5" }}
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#2F6B44]">
                            {ini(r.name)}
                          </div>
                          <div className="text-[13.5px] font-medium text-[#065F46]">
                            {r.name}
                            {r.isExternal && (
                              <span className="ml-1.5 text-[11px] font-normal opacity-70">
                                externo
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    {selectedLista.records.filter((r) => r.present).length ===
                      0 && (
                      <p className="text-[12.5px] text-muted">
                        Nenhum presente.
                      </p>
                    )}
                  </div>
                </div>

                {/* Faltantes */}
                <div className="mt-5">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#B07A1E]" />
                    <div className="text-[12.5px] font-semibold uppercase tracking-wider text-[#92400E]">
                      Faltantes ·{" "}
                      {selectedLista.records.filter((r) => !r.present).length}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {selectedLista.records
                      .filter((r) => !r.present)
                      .map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center gap-2.5 rounded-[8px] px-3 py-2"
                          style={{ background: "#FFFBEB" }}
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#92400E]">
                            {ini(r.name)}
                          </div>
                          <div className="text-[13.5px] font-medium text-[#92400E]">
                            {r.name}
                            {r.isExternal && (
                              <span className="ml-1.5 text-[11px] font-normal opacity-70">
                                externo
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    {selectedLista.records.filter((r) => !r.present).length ===
                      0 && (
                      <p className="text-[12.5px] text-muted">
                        Todos presentes!
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Relatório ── */}
      {tab === "relatorio" && (
        <div className="flex flex-1 flex-col overflow-y-auto p-[18px] md:p-6">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-[13.5px] text-muted">
              Ordenado por frequência crescente — quem precisa de atenção
              primeiro.
            </p>
            {/* Segmented (desktop) */}
            <div className="hidden rounded-[8px] bg-[#F2E7D4] p-[3px] md:flex">
              {PERIODOS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePeriodoChange(p.id)}
                  className="rounded-[6px] px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors"
                  style={{
                    background: periodo === p.id ? "#fff" : "transparent",
                    color: periodo === p.id ? "#171717" : "#737373",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {/* Select (mobile) */}
            <select
              value={periodo}
              onChange={(e) =>
                handlePeriodoChange(e.target.value as typeof periodo)
              }
              className="w-full rounded-[8px] border border-[#D4D4D4] bg-white px-3 py-2 text-[13.5px] md:hidden"
            >
              {PERIODOS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {loadingRel ? (
            <p className="text-[13px] text-muted">Carregando…</p>
          ) : relatorio.length === 0 ? (
            <p className="text-[13px] text-muted">
              Nenhum dado no período selecionado.
            </p>
          ) : (
            <>
              {/* Tabela desktop */}
              <div className="hidden overflow-hidden rounded-[10px] border border-[#E3D2B6] md:block">
                <div className="grid grid-cols-[1fr_110px_130px_150px] border-b border-[#E3D2B6] bg-[#FAF6EC] px-[18px] py-3">
                  {["Membro", "Presenças", "Chamadas", "Frequência"].map(
                    (h) => (
                      <div
                        key={h}
                        className="text-[11.5px] font-semibold uppercase tracking-wider text-muted"
                      >
                        {h}
                      </div>
                    )
                  )}
                </div>
                {relatorio.map((r) => {
                  const pct =
                    r.total_count > 0
                      ? Math.round((r.present_count / r.total_count) * 1000) /
                        10
                      : null;
                  return (
                    <div
                      key={r.account_id}
                      className="grid grid-cols-[1fr_110px_130px_150px] items-center border-b border-[#F5F5F5] px-[18px] py-3.5 last:border-0 hover:bg-[#FAF6EC]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#F2E7D4] text-[11.5px] font-bold text-[#4A2415]">
                          {ini(r.member_name)}
                        </div>
                        <div className="truncate text-[14px] font-semibold text-ink">
                          {r.member_name}
                        </div>
                      </div>
                      <div className="text-[14px] text-[#404040]">
                        {pct === null ? "—" : r.present_count}
                      </div>
                      <div className="text-[14px] text-muted">
                        {pct === null ? "—" : r.total_count}
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#F2E7D4]">
                          {pct !== null && (
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                background: barColor(pct),
                              }}
                            />
                          )}
                        </div>
                        <div
                          className="w-14 text-right text-[13px] font-semibold"
                          style={{
                            color: pct === null ? "#8A7466" : pctColor(pct),
                          }}
                        >
                          {pct === null ? "—" : `${pct}%`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cards mobile */}
              <div className="flex flex-col gap-2 md:hidden">
                {relatorio.map((r) => {
                  const pct =
                    r.total_count > 0
                      ? Math.round((r.present_count / r.total_count) * 1000) /
                        10
                      : null;
                  return (
                    <div
                      key={r.account_id}
                      className="rounded-[10px] border border-[#E3D2B6] bg-paper p-3.5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#F2E7D4] text-[11.5px] font-bold text-[#4A2415]">
                          {ini(r.member_name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13.5px] font-semibold text-ink">
                            {r.member_name}
                          </div>
                          <div className="mt-0.5 text-[11.5px] text-muted">
                            {pct === null
                              ? "—"
                              : `${r.present_count} de ${r.total_count} chamadas`}
                          </div>
                        </div>
                        <div
                          className="flex-none text-[14px] font-bold"
                          style={{
                            color: pct === null ? "#8A7466" : pctColor(pct),
                          }}
                        >
                          {pct === null ? "—" : `${pct}%`}
                        </div>
                      </div>
                      <div className="mt-2.5 h-[5px] overflow-hidden rounded-full bg-[#F2E7D4]">
                        {pct !== null && (
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: barColor(pct),
                            }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[12.5px] text-muted">
                Membros sem chamadas no período aparecem como —, nunca 0%.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
