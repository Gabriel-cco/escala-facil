"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCurrentAccount } from "@/hooks/useCurrentAccount";
import { logAccess } from "@/lib/access-log";

interface Grupo {
  id: string;
  name: string;
}
interface Qualification {
  id: string;
  name: string;
  group_id: string;
}
interface Ministerio {
  id: string;
  name: string;
  group_id: string;
}
interface Membro {
  id: string;
  nome: string;
}

type ModoSegmentacao = "grupo" | "refinar" | "especificos";
type ModoEnvio = "agora" | "agendar";

const labelInput = "mb-2 text-[12px] font-semibold text-muted";
const baseInput =
  "w-full rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 text-[14px] text-ink outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(var(--color-primary-rgb),0.15)] focus:border-primary/40";
const baseSelect =
  "w-full appearance-none rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 text-[14px] text-ink outline-none";

export default function EnviarForm({
  grupos,
  qualifications,
  ministerios,
}: {
  grupos: Grupo[];
  qualifications: Qualification[];
  ministerios: Ministerio[];
}) {
  const { data: currentAccount } = useCurrentAccount();
  const router = useRouter();

  const perfil = currentAccount?.account.profile;
  const groupIdProprio = currentAccount?.account.groupId;

  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");

  // Seleção de grupo(s) — somente admin escolhe
  const [todosGrupos, setTodosGrupos] = useState(true);
  const [grupoIds, setGrupoIds] = useState<Set<string>>(new Set());

  // Segmentação
  const [modoSeg, setModoSeg] = useState<ModoSegmentacao>("grupo");
  const [categoriaId, setCategoriaId] = useState("");
  const [ministerioId, setMinisterioId] = useState("");
  const [membros, setMembros] = useState<Membro[]>([]);
  const [membrosCarregando, setMembrosCarregando] = useState(false);
  const [accountIdsSel, setAccountIdsSel] = useState<Set<string>>(new Set());
  const [buscaMembro, setBuscaMembro] = useState("");

  // Agendamento
  const [modoEnvio, setModoEnvio] = useState<ModoEnvio>("agora");
  const [dataAgendada, setDataAgendada] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  // Grupo único em escopo — habilita segmentação refinada
  const grupoEfetivo =
    perfil === "coordinator"
      ? (groupIdProprio ?? null)
      : !todosGrupos && grupoIds.size === 1
        ? [...grupoIds][0]
        : null;

  const mostrarSegmentacao = grupoEfetivo !== null;

  const qualsDoGrupo = qualifications.filter((q) => q.group_id === grupoEfetivo);
  const minsDoGrupo = ministerios.filter((m) => m.group_id === grupoEfetivo);

  // Carrega membros quando entra no modo "pessoas específicas"
  useEffect(() => {
    if (modoSeg !== "especificos" || !grupoEfetivo) return;
    setMembrosCarregando(true);
    const supabase = createClient();
    supabase
      .from("accounts")
      .select("id, user:users(name)")
      .eq("group_id", grupoEfetivo)
      .eq("active", true)
      .order("id")
      .then(({ data }) => {
        setMembros(
          (data ?? []).map((a) => {
            const u = Array.isArray(a.user) ? a.user[0] : a.user;
            return { id: a.id, nome: (u as { name?: string } | null)?.name ?? "—" };
          })
        );
        setMembrosCarregando(false);
      });
  }, [modoSeg, grupoEfetivo]);

  // Reset segmentação quando o grupo efetivo muda
  useEffect(() => {
    setModoSeg("grupo");
    setCategoriaId("");
    setMinisterioId("");
    setAccountIdsSel(new Set());
    setBuscaMembro("");
  }, [grupoEfetivo]);

  function toggleGrupo(id: string) {
    setTodosGrupos(false);
    setGrupoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selecionarTodos() {
    setTodosGrupos(true);
    setGrupoIds(new Set());
  }

  function toggleMembro(id: string) {
    setAccountIdsSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const membrosFiltrados = membros.filter((m) =>
    m.nome.toLowerCase().includes(buscaMembro.toLowerCase())
  );

  const podeContinuar =
    titulo.trim() !== "" &&
    mensagem.trim() !== "" &&
    (perfil !== "admin" || todosGrupos || grupoIds.size > 0) &&
    (modoSeg !== "especificos" || accountIdsSel.size > 0) &&
    (modoEnvio !== "agendar" || dataAgendada !== "");

  async function enviar() {
    if (!podeContinuar || enviando) return;
    setEnviando(true);
    setErro("");

    const payload: Record<string, unknown> = {
      title: titulo.trim(),
      body: mensagem.trim(),
    };

    // Destinatários de grupo
    if (perfil === "coordinator") {
      payload.groupId = groupIdProprio ?? "";
    } else if (todosGrupos) {
      payload.groupId = "all";
    } else {
      payload.groupIds = [...grupoIds];
    }

    // Segmentação
    if (modoSeg === "refinar") {
      if (categoriaId) payload.categoriaId = categoriaId;
      if (ministerioId) payload.ministerioId = ministerioId;
    } else if (modoSeg === "especificos") {
      payload.accountIds = [...accountIdsSel];
      delete payload.groupId;
      delete payload.groupIds;
    }

    // Agendamento
    if (modoEnvio === "agendar") {
      payload.scheduledFor = dataAgendada;
    }

    try {
      const res = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErro(data.error || "Erro ao enviar notificação.");
        setEnviando(false);
        return;
      }

      const result = await res.json();
      const accId = currentAccount?.account.id;

      if (modoEnvio === "agendar") {
        if (accId) logAccess(accId, "agendar_notificacao", { data: dataAgendada });
        alert(`Notificação agendada para ${new Date(dataAgendada + "T12:00:00").toLocaleDateString("pt-BR")}.`);
      } else {
        const count = result.count as number;
        if (accId) logAccess(accId, "enviar_notificacao", { recipient_count: count });
        alert(`Notificação enviada para ${count} membro${count !== 1 ? "s" : ""}.`);
      }

      router.back();
    } catch {
      setErro("Erro de rede. Tente novamente.");
      setEnviando(false);
    }
  }

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <main className="flex flex-1 flex-col gap-5 px-[18px] pb-10 pt-2 md:p-0">
      <div className="flex flex-col gap-5 rounded-[18px] bg-paper p-5 shadow-[0_1px_3px_rgba(0,0,0,0.07)] md:p-6">

        {/* Título */}
        <div>
          <label className={labelInput}>Título *</label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value.slice(0, 100))}
            placeholder="Ex.: Nova escala disponível"
            className={baseInput}
          />
          <p className="mt-1 text-right text-[11px] text-faint">{titulo.length}/100</p>
        </div>

        {/* Mensagem */}
        <div>
          <label className={labelInput}>Mensagem *</label>
          <textarea
            rows={4}
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value.slice(0, 500))}
            placeholder="Ex.: A escala de setembro do grupo Coroinhas foi publicada"
            className={`${baseInput} resize-none`}
          />
          <p className="mt-1 text-right text-[11px] text-faint">{mensagem.length}/500</p>
        </div>

        {/* Grupos (somente admin) */}
        {perfil === "admin" && (
          <div>
            <label className={labelInput}>Destinatários</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selecionarTodos}
                aria-pressed={todosGrupos}
                className={`rounded-full border px-4 py-2 text-[13.5px] font-semibold transition-colors ${
                  todosGrupos
                    ? "border-primary bg-primary text-white"
                    : "border-black/10 bg-paper text-ink hover:bg-surface"
                }`}
              >
                Todos os grupos
              </button>
              {grupos.map((g) => {
                const sel = !todosGrupos && grupoIds.has(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGrupo(g.id)}
                    aria-pressed={sel}
                    className={`rounded-full border px-4 py-2 text-[13.5px] font-semibold transition-colors ${
                      sel
                        ? "border-primary bg-primary text-white"
                        : "border-black/10 bg-paper text-ink hover:bg-surface"
                    }`}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {perfil === "coordinator" && (
          <div>
            <label className={labelInput}>Destinatários</label>
            <p className="rounded-[14px] border border-black/10 bg-surface px-4 py-3.5 text-[14px] text-ink">
              {grupos.find((g) => g.id === groupIdProprio)?.name ?? "Meu grupo"}
            </p>
          </div>
        )}

        {/* Segmentação — só aparece quando há grupo único em escopo */}
        {mostrarSegmentacao && (
          <div>
            <label className={labelInput}>Segmentação</label>
            <div className="flex flex-wrap gap-2">
              {(["grupo", "refinar", "especificos"] as ModoSegmentacao[]).map((modo) => {
                const labels: Record<ModoSegmentacao, string> = {
                  grupo: "Grupo inteiro",
                  refinar: "Refinar por categoria / ministério",
                  especificos: "Pessoas específicas",
                };
                return (
                  <button
                    key={modo}
                    type="button"
                    onClick={() => setModoSeg(modo)}
                    className={`rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors ${
                      modoSeg === modo
                        ? "border-primary bg-primary text-white"
                        : "border-black/10 bg-paper text-ink hover:bg-surface"
                    }`}
                  >
                    {labels[modo]}
                  </button>
                );
              })}
            </div>

            {/* Refinar */}
            {modoSeg === "refinar" && (
              <div className="mt-3 flex flex-col gap-3">
                {qualsDoGrupo.length > 0 && (
                  <div>
                    <label className="mb-1.5 block text-[11.5px] font-semibold text-muted">
                      CATEGORIA (opcional)
                    </label>
                    <div className="relative">
                      <select
                        value={categoriaId}
                        onChange={(e) => setCategoriaId(e.target.value)}
                        className={`${baseSelect} pr-10`}
                      >
                        <option value="">Todas as categorias</option>
                        {qualsDoGrupo.map((q) => (
                          <option key={q.id} value={q.id}>
                            {q.name}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-muted">▾</span>
                    </div>
                  </div>
                )}
                {minsDoGrupo.length > 0 && (
                  <div>
                    <label className="mb-1.5 block text-[11.5px] font-semibold text-muted">
                      MINISTÉRIO (opcional)
                    </label>
                    <div className="relative">
                      <select
                        value={ministerioId}
                        onChange={(e) => setMinisterioId(e.target.value)}
                        className={`${baseSelect} pr-10`}
                      >
                        <option value="">Todos os ministérios</option>
                        {minsDoGrupo.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-muted">▾</span>
                    </div>
                  </div>
                )}
                {qualsDoGrupo.length === 0 && minsDoGrupo.length === 0 && (
                  <p className="text-[13px] text-muted">
                    Este grupo não tem categorias nem ministérios cadastrados.
                  </p>
                )}
              </div>
            )}

            {/* Pessoas específicas */}
            {modoSeg === "especificos" && (
              <div className="mt-3 flex flex-col gap-2">
                <input
                  type="text"
                  value={buscaMembro}
                  onChange={(e) => setBuscaMembro(e.target.value)}
                  placeholder="Buscar membro..."
                  className="w-full rounded-[12px] border border-black/10 bg-paper px-4 py-2.5 text-[13.5px] text-ink outline-none"
                />
                {membrosCarregando ? (
                  <p className="py-4 text-center text-[13px] text-muted">Carregando...</p>
                ) : (
                  <div className="max-h-52 overflow-y-auto rounded-[12px] border border-black/[0.07]">
                    {membrosFiltrados.length === 0 ? (
                      <p className="py-4 text-center text-[13px] text-muted">Nenhum membro encontrado.</p>
                    ) : (
                      membrosFiltrados.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleMembro(m.id)}
                          className="flex w-full items-center gap-3 border-b border-black/[0.05] px-4 py-2.5 text-left last:border-b-0 hover:bg-surface"
                        >
                          <div
                            className={`flex h-[17px] w-[17px] flex-none items-center justify-center rounded-[4px] border-[1.5px] text-[10px] font-bold ${
                              accountIdsSel.has(m.id)
                                ? "border-primary bg-primary text-white"
                                : "border-black/25"
                            }`}
                          >
                            {accountIdsSel.has(m.id) && "✓"}
                          </div>
                          <span className="text-[13.5px] text-ink">{m.nome}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
                {accountIdsSel.size > 0 && (
                  <p className="text-[12px] text-ink-soft">
                    {accountIdsSel.size} pessoa{accountIdsSel.size !== 1 ? "s" : ""} selecionada{accountIdsSel.size !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Agendamento */}
        <div>
          <label className={labelInput}>Quando enviar</label>
          <div className="flex flex-wrap gap-2">
            {(["agora", "agendar"] as ModoEnvio[]).map((modo) => (
              <button
                key={modo}
                type="button"
                onClick={() => setModoEnvio(modo)}
                className={`rounded-full border px-4 py-2 text-[13.5px] font-semibold transition-colors ${
                  modoEnvio === modo
                    ? "border-primary bg-primary text-white"
                    : "border-black/10 bg-paper text-ink hover:bg-surface"
                }`}
              >
                {modo === "agora" ? "Enviar agora" : "Agendar"}
              </button>
            ))}
          </div>
          {modoEnvio === "agendar" && (
            <div className="mt-3">
              <label className="mb-1.5 block text-[11.5px] font-semibold text-muted">
                DATA DO ENVIO
              </label>
              <input
                type="date"
                value={dataAgendada}
                min={hoje}
                onChange={(e) => setDataAgendada(e.target.value)}
                className={`${baseInput} max-w-xs`}
              />
            </div>
          )}
        </div>

        {erro && <p className="text-[13px] text-danger">{erro}</p>}
      </div>

      <button
        onClick={enviar}
        disabled={enviando || !podeContinuar}
        className="w-full rounded-2xl bg-primary py-4 text-[15px] font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-40 md:rounded-[11px] md:px-6 md:py-3 md:text-[13.5px]"
      >
        {enviando
          ? modoEnvio === "agendar"
            ? "Agendando..."
            : "Enviando..."
          : modoEnvio === "agendar"
            ? "Agendar notificação"
            : "Enviar notificação"}
      </button>
    </main>
  );
}
