"use client";
import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { iniciais } from "@/lib/iniciais";
import { logAccess } from "@/lib/access-log";

type Grupo = { id: string; name: string };
type Evento = { id: string; name: string; date: string; time: string };
type MembroBase = { id: string; nome: string };

export type EntradaRoster = {
  tipo: "membro" | "externo";
  id: string;
  nome: string;
  iniciais: string;
  presente: boolean;
};

type ModoAvulso = null | "escolhendo" | "manual" | "qr";

function hojeStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nomeSugerido(grupoNome: string) {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return grupoNome ? `Chamada – ${grupoNome} – ${dd}/${mm}/${yyyy}` : "";
}

export default function FazerChamadaForm({
  accountId,
  perfil,
  grupoIdInicial,
  grupoNomeInicial,
  membrosIniciais,
  eventosIniciais,
  grupos,
  listaId,
  initialNome,
  initialDate,
  initialTime,
  initialEventoId,
  initialRoster,
}: {
  accountId: string;
  perfil: "admin" | "coordinator";
  grupoIdInicial: string | null;
  grupoNomeInicial: string;
  membrosIniciais: MembroBase[];
  eventosIniciais: Evento[];
  grupos: Grupo[];
  listaId?: string;
  initialNome?: string;
  initialDate?: string;
  initialTime?: string;
  initialEventoId?: string;
  initialRoster?: EntradaRoster[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const editando = !!listaId;

  const [grupoId, setGrupoId] = useState(grupoIdInicial ?? "");
  const [eventos, setEventos] = useState<Evento[]>(eventosIniciais);

  const [nome, setNome] = useState(initialNome ?? nomeSugerido(grupoNomeInicial));
  const [data, setData] = useState(initialDate ?? hojeStr());
  const [hora, setHora] = useState(initialTime ?? "");
  const [eventoId, setEventoId] = useState(initialEventoId ?? "");

  const [roster, setRoster] = useState<EntradaRoster[]>(
    initialRoster ??
      membrosIniciais.map((m) => ({
        tipo: "membro",
        id: m.id,
        nome: m.nome,
        iniciais: iniciais(m.nome),
        presente: false,
      }))
  );

  const [novoExternoNome, setNovoExternoNome] = useState("");
  const [adicionandoExterno, setAdicionandoExterno] = useState(false);
  const [carregandoGrupo, setCarregandoGrupo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [modoAvulso, setModoAvulso] = useState<ModoAvulso>(null);
  const membrosOriginal = useRef<EntradaRoster[]>([]);

  const entrarModoAvulso = useCallback(() => {
    if (roster.some((r) => r.tipo === "membro")) {
      membrosOriginal.current = [...roster];
      setRoster([]);
    }
    setModoAvulso("escolhendo");
  }, [roster]);

  const cancelarModoAvulso = useCallback(() => {
    if (membrosOriginal.current.length > 0) {
      setRoster(membrosOriginal.current);
      membrosOriginal.current = [];
    }
    setModoAvulso(null);
  }, []);

  const onGrupoChange = useCallback(
    async (novoGrupoId: string) => {
      setGrupoId(novoGrupoId);
      setModoAvulso(null);
      membrosOriginal.current = [];
      if (!novoGrupoId) return;

      const grupo = grupos.find((g) => g.id === novoGrupoId);
      const novoNome = grupo?.name ?? "";
      setNome(nomeSugerido(novoNome));
      setCarregandoGrupo(true);

      const [{ data: accounts }, { data: evts }] = await Promise.all([
        supabase
          .from("accounts")
          .select("id, user:users(name)")
          .eq("group_id", novoGrupoId)
          .eq("active", true)
          .in("profile", ["member", "coordinator"]),
        supabase
          .from("events")
          .select("id, name, date, time")
          .eq("group_id", novoGrupoId)
          .gte("date", hojeStr())
          .order("date")
          .limit(20),
      ]);

      const novosMembros = (accounts ?? [])
        .map((a) => {
          const u = Array.isArray(a.user) ? a.user[0] : a.user;
          const n = (u as { name?: string } | null)?.name ?? "—";
          return { id: a.id, nome: n };
        })
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

      setRoster(
        novosMembros.map((m) => ({
          tipo: "membro",
          id: m.id,
          nome: m.nome,
          iniciais: iniciais(m.nome),
          presente: false,
        }))
      );
      setEventos(evts ?? []);
      setEventoId("");
      setCarregandoGrupo(false);
    },
    [grupos, supabase]
  );

  const togglePresente = (id: string) => {
    setRoster((prev) =>
      prev.map((r) => (r.id === id ? { ...r, presente: !r.presente } : r))
    );
  };

  const marcarTodosPresentes = () => {
    setRoster((prev) => prev.map((r) => ({ ...r, presente: true })));
  };

  const adicionarExterno = () => {
    const n = novoExternoNome.trim();
    if (!n) return;
    setRoster((prev) => [
      ...prev,
      {
        tipo: "externo",
        id: `ext_${Date.now()}`,
        nome: n,
        iniciais: iniciais(n),
        presente: false,
      },
    ]);
    setNovoExternoNome("");
    setAdicionandoExterno(false);
  };

  const removerExterno = (id: string) => {
    setRoster((prev) => prev.filter((r) => r.id !== id));
  };

  const salvar = async () => {
    if (!grupoId || !nome.trim() || !data) {
      setErro("Preencha grupo, nome e data da chamada.");
      return;
    }
    setSalvando(true);
    setErro("");

    const isAvulsoManual = modoAvulso === "manual";

    try {
      if (editando) {
        const { error: updError } = await supabase
          .from("attendance_lists")
          .update({
            event_id: eventoId || null,
            name: nome.trim(),
            date: data,
            time: hora || null,
          })
          .eq("id", listaId!);
        if (updError) throw updError;

        await supabase
          .from("attendance_records")
          .delete()
          .eq("list_id", listaId!);

        const { error: recError } = await supabase
          .from("attendance_records")
          .insert(
            roster.map((r) => ({
              list_id: listaId!,
              account_id: r.tipo === "membro" ? r.id : null,
              external_name: r.tipo === "externo" ? r.nome : null,
              present: r.presente,
            }))
          );
        if (recError) throw recError;
      } else {
        const { data: lista, error: listError } = await supabase
          .from("attendance_lists")
          .insert({
            group_id: grupoId,
            event_id: eventoId || null,
            name: nome.trim(),
            date: data,
            time: hora || null,
            created_by: accountId,
          })
          .select("id")
          .single();
        if (listError || !lista) throw listError;

        if (roster.length > 0) {
          const { error: recError } = await supabase
            .from("attendance_records")
            .insert(
              roster.map((r) => ({
                list_id: lista.id,
                account_id: r.tipo === "membro" ? r.id : null,
                external_name: r.tipo === "externo" ? r.nome : null,
                present: isAvulsoManual ? true : r.presente,
              }))
            );
          if (recError) throw recError;
        }
      }

      logAccess(accountId, "fazer_chamada", { group_id: grupoId });
      router.push("/frequencia");
      router.refresh();
    } catch (e: unknown) {
      setErro((e as { message?: string })?.message ?? "Erro ao salvar chamada.");
      setSalvando(false);
    }
  };

  const salvarQr = async () => {
    if (!grupoId || !nome.trim() || !data) {
      setErro("Preencha grupo, nome e data da chamada.");
      return;
    }
    setSalvando(true);
    setErro("");

    try {
      const qrToken = crypto.randomUUID();
      const { data: lista, error: listError } = await supabase
        .from("attendance_lists")
        .insert({
          group_id: grupoId,
          event_id: eventoId || null,
          name: nome.trim(),
          date: data,
          time: hora || null,
          created_by: accountId,
          qr_token: qrToken,
        })
        .select("id")
        .single();
      if (listError || !lista) throw listError;

      router.push(`/frequencia/${lista.id}/qr`);
    } catch (e: unknown) {
      setErro((e as { message?: string })?.message ?? "Erro ao criar lista.");
      setSalvando(false);
    }
  };

  const presentCount = roster.filter((r) => r.presente).length;
  const totalCount = roster.length;
  const absentCount = totalCount - presentCount;

  const rosterVazio = roster.length === 0 && !!grupoId && !carregandoGrupo;
  // Prompt avulso substitui o roster apenas quando o grupo não tem membros
  const mostrarAvulsoPrompt = rosterVazio && !editando && modoAvulso !== "manual" && modoAvulso !== "qr";
  // Admin com membros carregados pode iniciar avulsa pelo botão no topo do roster
  const mostrarBotaoAvulsoAdmin =
    perfil === "admin" && !editando && !!grupoId && !carregandoGrupo &&
    modoAvulso === null && roster.some((r) => r.tipo === "membro");
  const mostrarRoster = modoAvulso === "manual" || (!mostrarAvulsoPrompt && !carregandoGrupo);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Barra de contagem — oculta em modo QR */}
      {modoAvulso !== "qr" && (
        <div className="flex flex-none items-center justify-between border-b border-[#A7F3D0] bg-[#ECFDF5] px-[18px] py-3 md:px-6">
          {modoAvulso === "manual" ? (
            <div className="text-[14px] font-semibold text-[#065F46]">
              {roster.length} {roster.length === 1 ? "pessoa adicionada" : "pessoas adicionadas"}
            </div>
          ) : (
            <>
              <div className="text-[14px] font-semibold text-[#065F46]">
                {presentCount} de {totalCount} presentes
              </div>
              <button
                onClick={marcarTodosPresentes}
                className="text-[12.5px] font-semibold text-[#047857]"
              >
                Marcar todos presentes
              </button>
            </>
          )}
        </div>
      )}

      {/* Banner modo QR */}
      {modoAvulso === "qr" && (
        <div className="flex flex-none items-center gap-3 border-b border-[#D6C3A5] bg-[#F2E7D4] px-[18px] py-3 md:px-6">
          <span className="text-[18px]">📱</span>
          <p className="text-[13px] font-semibold text-[#4A2415]">
            Modo QR — o código será gerado ao salvar
          </p>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
        {/* Campos do formulário */}
        <div className="flex flex-none flex-col gap-4 border-b border-black/[0.06] p-[18px] md:w-[360px] md:overflow-y-auto md:border-b-0 md:border-r md:p-6">
          {/* Seletor de grupo — apenas admin sem grupo ativo */}
          {perfil === "admin" && !grupoIdInicial && (
            <div>
              <div className="mb-1.5 text-[13px] font-semibold text-[#4A3A31]">
                Grupo
              </div>
              <select
                value={grupoId}
                onChange={(e) => onGrupoChange(e.target.value)}
                className="w-full rounded-[8px] border border-[#D6C3A5] bg-white px-3 py-2.5 text-[14px] text-ink focus:outline-none"
              >
                <option value="">Selecione o grupo…</option>
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <div className="mb-1.5 text-[13px] font-semibold text-[#4A3A31]">
              Nome da chamada
            </div>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-[8px] border border-[#D6C3A5] px-3 py-2.5 text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="mt-1 text-[12px] text-muted">
              Sugerido automaticamente — pode editar.
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <div className="mb-1.5 text-[13px] font-semibold text-[#4A3A31]">
                Data
              </div>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full rounded-[8px] border border-[#D6C3A5] px-3 py-2.5 text-[13.5px] text-ink focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <div className="mb-1.5 text-[13px] font-semibold text-[#4A3A31]">
                Hora{" "}
                <span className="text-[12px] font-normal text-muted">
                  (opcional)
                </span>
              </div>
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="w-full rounded-[8px] border border-[#D6C3A5] px-3 py-2.5 text-[13.5px] text-ink focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-[13px] font-semibold text-[#4A3A31]">
              Vincular a um evento{" "}
              <span className="text-[12px] font-normal text-muted">
                (opcional)
              </span>
            </div>
            <select
              value={eventoId}
              onChange={(e) => setEventoId(e.target.value)}
              className="w-full rounded-[8px] border border-[#D6C3A5] bg-white px-3 py-2.5 text-[14px] text-ink focus:outline-none"
            >
              <option value="">Nenhum evento</option>
              {eventos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} —{" "}
                  {e.date.slice(8, 10)}/{e.date.slice(5, 7)}
                  {e.time ? `, ${e.time.slice(0, 5)}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Lista de presença */}
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-[18px] pb-28 md:p-6 md:pb-28">
          {carregandoGrupo ? (
            <p className="text-[13px] text-muted">Carregando membros…</p>
          ) : !grupoId && modoAvulso === null ? (
            <p className="text-[13px] text-muted">
              Selecione um grupo para ver os membros.
            </p>
          ) : modoAvulso === "qr" ? (
            /* ── Modo QR ── */
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="text-[48px]">📱</div>
              <div>
                <p className="text-[15px] font-semibold text-ink">
                  QR Code de presença
                </p>
                <p className="mt-1 max-w-[280px] text-[13px] text-muted">
                  Ao salvar, um QR será gerado. Os participantes escaneiam e
                  digitam o nome para se registrar.
                </p>
              </div>
              <button
                onClick={() => setModoAvulso("escolhendo")}
                className="text-[12.5px] font-semibold text-muted underline underline-offset-2"
              >
                Voltar à escolha
              </button>
            </div>
          ) : mostrarAvulsoPrompt ? (
            /* ── Sem membros: prompt avulso ── */
            <div className="flex flex-col gap-3 py-2">
              <p className="text-[13px] text-muted">
                Nenhum membro ativo neste grupo.
              </p>
              {modoAvulso === "escolhendo" ? (
                <>
                  <p className="text-[13px] font-semibold text-ink">
                    Como deseja registrar a presença?
                  </p>
                  <button
                    onClick={() => setModoAvulso("manual")}
                    className="flex flex-col gap-0.5 rounded-[12px] border border-[#D6C3A5] px-4 py-3.5 text-left hover:border-primary hover:bg-[#FAF6EC]"
                  >
                    <span className="text-[14px] font-semibold text-ink">
                      ✏️ Adicionar manualmente
                    </span>
                    <span className="text-[12.5px] text-muted">
                      Você digita o nome de cada pessoa
                    </span>
                  </button>
                  <button
                    onClick={() => setModoAvulso("qr")}
                    className="flex flex-col gap-0.5 rounded-[12px] border border-[#D6C3A5] px-4 py-3.5 text-left hover:border-primary hover:bg-[#FAF6EC]"
                  >
                    <span className="text-[14px] font-semibold text-ink">
                      📱 Gerar QR Code
                    </span>
                    <span className="text-[12.5px] text-muted">
                      Participantes escaneiam e se registram sozinhos
                    </span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setModoAvulso("escolhendo")}
                  className="self-start rounded-[10px] border border-[#D6C3A5] bg-[#F2E7D4] px-4 py-2.5 text-[13px] font-semibold text-[#4A2415]"
                >
                  Deseja começar uma frequência avulsa?
                </button>
              )}
              {modoAvulso === "escolhendo" && (
                <button
                  onClick={cancelarModoAvulso}
                  className="self-start text-[12.5px] text-muted underline underline-offset-2"
                >
                  Cancelar
                </button>
              )}
            </div>
          ) : mostrarRoster ? (
            /* ── Roster normal ou avulso manual ── */
            <>
              {/* Botão avulso para admin com membros */}
              {mostrarBotaoAvulsoAdmin && (
                <button
                  onClick={entrarModoAvulso}
                  className="mb-1 self-start rounded-[10px] border border-[#D6C3A5] bg-[#F2E7D4] px-4 py-2 text-[12.5px] font-semibold text-[#4A2415]"
                >
                  Iniciar frequência avulsa
                </button>
              )}

              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11.5px] font-semibold uppercase tracking-[1.1px] text-muted">
                  {modoAvulso === "manual"
                    ? "Adicione quem está presente"
                    : "Toque em quem estava presente"}
                </span>
                {modoAvulso === "manual" && (
                  <button
                    onClick={() => setModoAvulso("escolhendo")}
                    className="text-[12px] font-semibold text-muted underline underline-offset-2"
                  >
                    ← Voltar à escolha
                  </button>
                )}
              </div>

              {roster.map((r) => {
                const isPresente = r.presente;
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-[8px] border px-4 py-3"
                    style={{
                      background:
                        modoAvulso === "manual"
                          ? "#F7FDFA"
                          : isPresente
                            ? "#F7FDFA"
                            : "#FFFDF5",
                      borderColor:
                        modoAvulso === "manual"
                          ? "#A7F3D0"
                          : isPresente
                            ? "#A7F3D0"
                            : "#FDE68A",
                    }}
                  >
                    <div
                      className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-[12.5px] font-bold"
                      style={{
                        background:
                          modoAvulso === "manual" ? "#ECFDF5" : isPresente ? "#ECFDF5" : "#FFFBEB",
                        color:
                          modoAvulso === "manual" ? "#047857" : isPresente ? "#047857" : "#92400E",
                      }}
                    >
                      {r.iniciais}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div
                        className="truncate text-[14px] font-semibold"
                        style={{
                          color:
                            modoAvulso === "manual" ? "#2E1A11" : isPresente ? "#2E1A11" : "#4A3A31",
                        }}
                      >
                        {r.nome}
                      </div>
                      {r.tipo === "externo" && modoAvulso !== "manual" && (
                        <div className="text-[11.5px] text-muted">
                          Membro externo
                        </div>
                      )}
                    </div>

                    {r.tipo === "externo" && (
                      <button
                        onClick={() => removerExterno(r.id)}
                        className="flex-none px-1 text-[18px] leading-none text-muted hover:text-danger"
                        title="Remover"
                      >
                        ×
                      </button>
                    )}

                    {modoAvulso !== "manual" && (
                      <button
                        onClick={() => togglePresente(r.id)}
                        className="min-w-[104px] flex-none rounded-full border px-4 py-1.5 text-[12.5px] font-semibold"
                        style={{
                          background: isPresente ? "#ECFDF5" : "#FFFBEB",
                          color: isPresente ? "#047857" : "#92400E",
                          borderColor: isPresente ? "#A7F3D0" : "#FDE68A",
                        }}
                      >
                        {isPresente ? "✓ Presente" : "Faltou"}
                      </button>
                    )}
                  </div>
                );
              })}

              {adicionandoExterno ? (
                <div className="flex items-center gap-2 rounded-[8px] border border-[#D6C3A5] px-4 py-3">
                  <input
                    autoFocus
                    type="text"
                    placeholder={
                      modoAvulso === "manual"
                        ? "Nome da pessoa…"
                        : "Nome do membro externo…"
                    }
                    value={novoExternoNome}
                    onChange={(e) => setNovoExternoNome(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") adicionarExterno();
                      if (e.key === "Escape") {
                        setAdicionandoExterno(false);
                        setNovoExternoNome("");
                      }
                    }}
                    className="min-w-0 flex-1 bg-transparent text-[14px] text-ink focus:outline-none"
                  />
                  <button
                    onClick={adicionarExterno}
                    className="flex-none rounded-[8px] bg-primary px-3 py-1.5 text-[12.5px] font-semibold text-white"
                  >
                    Adicionar
                  </button>
                  <button
                    onClick={() => {
                      setAdicionandoExterno(false);
                      setNovoExternoNome("");
                    }}
                    className="flex-none px-1 text-[18px] leading-none text-muted"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAdicionandoExterno(true)}
                  className="flex items-center gap-2 rounded-[8px] border border-dashed border-[#D6C3A5] px-4 py-3 text-[13px] font-semibold text-ink-soft hover:border-primary hover:text-primary"
                >
                  <span className="text-[16px] leading-none">+</span>
                  {modoAvulso === "manual"
                    ? "Adicionar pessoa"
                    : "Adicionar membro externo"}
                </button>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* Rodapé fixo */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-black/[0.06] bg-white/95 px-[18px] py-3 backdrop-blur-sm md:static md:bg-white md:px-6 md:py-4">
        {erro && (
          <p className="mb-2 text-[12.5px] text-danger">{erro}</p>
        )}
        <div className="flex items-center justify-between gap-4">
          {modoAvulso === "qr" ? (
            <p className="text-[13px] text-muted">
              O QR será gerado após salvar
            </p>
          ) : modoAvulso === "manual" ? (
            <p className="text-[13px] text-muted">
              {roster.length === 0
                ? "Adicione pessoas à lista"
                : roster.length === 1
                  ? "1 pessoa na lista"
                  : `${roster.length} pessoas na lista`}
            </p>
          ) : (
            <div className="text-[13px] text-muted">
              {absentCount === 0
                ? "Todos presentes"
                : absentCount === 1
                  ? "1 falta registrada"
                  : `${absentCount} faltas registradas`}
            </div>
          )}
          <button
            onClick={modoAvulso === "qr" ? salvarQr : salvar}
            disabled={salvando}
            className="rounded-[10px] bg-primary px-5 py-2.5 text-[14px] font-semibold text-white disabled:opacity-60"
          >
            {salvando
              ? "Salvando…"
              : modoAvulso === "qr"
                ? "Salvar e gerar QR"
                : "Salvar chamada"}
          </button>
        </div>
      </div>
    </div>
  );
}
