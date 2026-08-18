"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentAccount } from "@/hooks/useCurrentAccount";

interface Grupo {
  id: string;
  name: string;
}

const labelInput = "mb-2 text-[12px] font-semibold text-muted";
const baseInput =
  "w-full rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 text-[14px] text-ink outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(var(--color-primary-rgb),0.15)] focus:border-primary/40";

export default function EnviarForm({ grupos }: { grupos: Grupo[] }) {
  const { data: currentAccount } = useCurrentAccount();
  const router = useRouter();

  const perfil = currentAccount?.account.profile;
  const groupIdProprio = currentAccount?.account.groupId;

  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  // Admin: "todos" ou uma seleção de grupos. Coordinator não usa (vai pro
  // próprio grupo direto no envio).
  const [todosGrupos, setTodosGrupos] = useState(true);
  const [grupoIds, setGrupoIds] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

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

  async function enviar() {
    if (!titulo.trim() || !mensagem.trim()) {
      setErro("Preencha o título e a mensagem.");
      return;
    }
    if (perfil === "admin" && !todosGrupos && grupoIds.size === 0) {
      setErro("Selecione ao menos um grupo.");
      return;
    }
    setEnviando(true);
    setErro("");

    // Coordinator → próprio grupo. Admin → "todos" (all) ou lista de grupos.
    const payload: Record<string, unknown> = {
      title: titulo.trim(),
      body: mensagem.trim(),
    };
    if (perfil === "coordinator") {
      payload.groupId = groupIdProprio ?? "";
    } else if (todosGrupos) {
      payload.groupId = "all";
    } else {
      payload.groupIds = [...grupoIds];
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

      const { count } = await res.json();
      alert(`Notificação enviada para ${count} membro${count !== 1 ? "s" : ""}.`);
      router.back();
    } catch {
      setErro("Erro de rede. Tente novamente.");
      setEnviando(false);
    }
  }

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

        {/* Destinatários (somente admin escolhe; pode marcar vários grupos) */}
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

        {erro && <p className="text-[13px] text-danger">{erro}</p>}
      </div>

      <button
        onClick={enviar}
        disabled={enviando || !titulo.trim() || !mensagem.trim()}
        className="w-full rounded-2xl bg-primary py-4 text-[15px] font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-40 md:rounded-[11px] md:px-6 md:py-3 md:text-[13.5px]"
      >
        {enviando ? "Enviando..." : "Enviar notificação"}
      </button>
    </main>
  );
}
