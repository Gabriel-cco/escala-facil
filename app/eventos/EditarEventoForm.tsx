"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getLiturgicalInfoAction } from "@/lib/liturgical-actions";
import type { LiturgicalColor } from "@/lib/liturgical";
import { withRetry } from "@/lib/retry";
import { logAccess } from "@/lib/access-log";

type Grupo = { id: string; name: string };
type Ministerio = { id: string; name: string };

const labelInput = "mb-2 text-[12px] font-semibold text-muted";
const baseInput =
  "w-full rounded-[14px] border border-black/10 bg-paper text-ink outline-none";

export default function EditarEventoForm({
  id,
  nomeInicial,
  dataInicial,
  horaInicial,
  grupoIdInicial,
  liturgicalNameInicial,
  liturgicalColorInicial,
  ministerioIdInicial,
  grupos,
  ministeriosPorGrupo,
  accountId,
}: {
  id: string;
  nomeInicial: string;
  dataInicial: string;
  horaInicial: string;
  grupoIdInicial: string;
  liturgicalNameInicial: string | null;
  liturgicalColorInicial: string | null;
  ministerioIdInicial: string | null;
  grupos: Grupo[];
  ministeriosPorGrupo: Record<string, Ministerio[]>;
  accountId?: string;
}) {
  const [nome, setNome] = useState(nomeInicial);
  const [data, setData] = useState(dataInicial);
  const [hora, setHora] = useState(horaInicial.slice(0, 5));
  const [grupoId, setGrupoId] = useState(grupoIdInicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [liturgicalName, setLiturgicalName] = useState(liturgicalNameInicial ?? "");
  const [liturgicalColor, setLiturgicalColor] = useState<LiturgicalColor | null>(
    (liturgicalColorInicial as LiturgicalColor | null) ?? null
  );

  // Ministério
  const [ministerioId, setMinisterioId] = useState(ministerioIdInicial ?? "");
  const [ministeriosExtras, setMinisteriosExtras] = useState<Ministerio[]>([]);
  const [novoMinNome, setNovoMinNome] = useState("");
  const [mostrarNovoMin, setMostrarNovoMin] = useState(false);
  const [criandoMin, setCriandoMin] = useState(false);

  const router = useRouter();

  const primeiraRenderizacao = useRef(true);
  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }
    let cancelado = false;
    withRetry(() => getLiturgicalInfoAction(data), { tentativas: 2 })
      .then((info) => {
        if (cancelado) return;
        setLiturgicalName(info?.name ?? "");
        setLiturgicalColor(info?.color ?? null);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [data]);

  const ministeriosBase = ministeriosPorGrupo[grupoId] ?? [];
  const todosMinisterios = [...ministeriosBase, ...ministeriosExtras].sort(
    (a, b) => a.name.localeCompare(b.name, "pt-BR")
  );
  const mostrarCampoMinisterio = todosMinisterios.length > 0;

  function handleGrupoChange(newGrupoId: string) {
    setGrupoId(newGrupoId);
    if (newGrupoId !== grupoId) {
      setMinisterioId("");
      setMinisteriosExtras([]);
      setMostrarNovoMin(false);
      setNovoMinNome("");
    }
  }

  async function criarMinisterioInline() {
    const nome = novoMinNome.trim();
    if (!nome || criandoMin) return;
    setCriandoMin(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ministerios")
      .insert({ group_id: grupoId, name: nome })
      .select("id, name")
      .single();
    setCriandoMin(false);
    if (error) return;
    const novo = data as Ministerio;
    setMinisteriosExtras((prev) =>
      [...prev, novo].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    );
    setMinisterioId(novo.id);
    setNovoMinNome("");
    setMostrarNovoMin(false);
  }

  const podeSalvar = nome.trim().length > 0 && grupoId !== "";

  async function salvar() {
    if (!podeSalvar || salvando) return;
    setErro("");
    setSalvando(true);
    const horaFinal = `${hora || "00:00"}:00`;
    const supabase = createClient();
    const { error } = await supabase
      .from("events")
      .update({
        name: nome.trim(),
        date: data,
        time: horaFinal,
        group_id: grupoId,
        liturgical_name: liturgicalName.trim() || null,
        liturgical_color: liturgicalColor,
        ministerio_id: ministerioId || null,
      })
      .eq("id", id);
    if (error) {
      setSalvando(false);
      setErro("Erro ao salvar: " + error.message);
      return;
    }
    if (accountId) logAccess(accountId, "editar_evento", { event_id: id });
    router.back();
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className={labelInput}>NOME DO EVENTO</div>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Missa Dominical"
          className={`${baseInput} px-4 py-3.5 text-[15px]`}
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <div className={labelInput}>DATA</div>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className={`${baseInput} px-3.5 py-3 text-[14px]`}
          />
        </div>
        <div className="flex-1">
          <div className={labelInput}>HORA</div>
          <input
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className={`${baseInput} px-3.5 py-3 text-[14px]`}
          />
        </div>
      </div>

      <div>
        <div className="mb-2.5 text-[12px] font-semibold text-muted">
          GRUPO ENVOLVIDO
        </div>
        <div className="relative">
          <select
            value={grupoId}
            onChange={(e) => handleGrupoChange(e.target.value)}
            className={`w-full appearance-none rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 pr-10 text-[15px] outline-none ${
              grupoId ? "text-ink" : "text-muted"
            }`}
          >
            <option value="" disabled>
              Selecione um grupo
            </option>
            {grupos.map((grupo) => (
              <option key={grupo.id} value={grupo.id}>
                {grupo.name}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-muted">
            ▾
          </span>
        </div>
      </div>

      {mostrarCampoMinisterio && (
        <div>
          <div className={labelInput}>
            MINISTÉRIO RESPONSÁVEL{" "}
            <span className="text-[10px] font-normal normal-case text-faint">(opcional)</span>
          </div>
          <div className="relative">
            <select
              value={ministerioId}
              onChange={(e) => setMinisterioId(e.target.value)}
              className={`w-full appearance-none rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 pr-10 text-[14px] outline-none ${
                ministerioId ? "text-ink" : "text-muted"
              }`}
            >
              <option value="">Nenhum</option>
              {todosMinisterios.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-muted">
              ▾
            </span>
          </div>

          {!mostrarNovoMin ? (
            <button
              type="button"
              onClick={() => setMostrarNovoMin(true)}
              className="mt-1.5 text-[12.5px] font-medium text-primary hover:underline"
            >
              + Novo ministério
            </button>
          ) : (
            <div className="mt-2 flex gap-2">
              <input
                value={novoMinNome}
                onChange={(e) => setNovoMinNome(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") criarMinisterioInline();
                }}
                placeholder="Nome do ministério"
                className="flex-1 rounded-[12px] border border-black/10 bg-paper px-3.5 py-2.5 text-[14px] text-ink outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={criarMinisterioInline}
                disabled={!novoMinNome.trim() || criandoMin}
                className="rounded-[12px] bg-primary px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-40"
              >
                {criandoMin ? "..." : "Criar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMostrarNovoMin(false);
                  setNovoMinNome("");
                }}
                className="rounded-[12px] border border-black/10 px-3.5 py-2.5 text-[13px] font-semibold text-ink"
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}

      <div>
        <div className={labelInput}>NOME LITÚRGICO</div>
        <input
          value={liturgicalName}
          onChange={(e) => setLiturgicalName(e.target.value)}
          placeholder="Ex.: 18º Domingo do Tempo Comum"
          className={`${baseInput} px-4 py-3.5 text-[15px]`}
        />
        <p className="mt-1.5 text-[12px] text-faint">
          Preenchido automaticamente pelo calendário litúrgico. Recalculado se
          a data mudar — edite se quiser personalizar.
        </p>
      </div>

      {erro && <p className="text-[13px] text-danger">{erro}</p>}

      <div className="mt-1.5 flex flex-col gap-2.5 md:mt-2 md:flex-row md:justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="hidden rounded-[11px] border border-black/10 px-5 py-3 text-[14px] font-semibold text-ink md:block"
        >
          Cancelar
        </button>
        <button
          onClick={salvar}
          disabled={!podeSalvar || salvando}
          className="w-full rounded-2xl bg-primary py-4 text-[15px] font-semibold text-paper transition-opacity disabled:pointer-events-none disabled:opacity-40 md:w-auto md:rounded-[11px] md:px-6 md:py-3 md:text-[14px]"
        >
          {salvando ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}
