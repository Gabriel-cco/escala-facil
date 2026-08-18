"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface EnviadaGrupo {
  title: string;
  body: string;
  createdAt: string;
  count: number;
}

function formatarDataEnvio(iso: string): string {
  const d = new Date(iso);
  const data = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${data} às ${hora}`;
}

/**
 * Tela de gestão de notificações ENVIADAS (admin/coordinator). As recebidas
 * são vistas só pelo sino (/notificacoes/recebidas).
 */
export default function NotificacoesCliente({ accountId }: { accountId: string | null }) {
  const [enviadas, setEnviadas] = useState<EnviadaGrupo[]>([]);
  const [loading, setLoading] = useState(Boolean(accountId));
  const [busca, setBusca] = useState("");

  useEffect(() => {
    if (!accountId) return;
    let cancelado = false;

    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("notifications")
        .select("title, body, created_at")
        .eq("sender_account_id", accountId)
        .order("created_at", { ascending: false })
        .limit(500);

      if (cancelado) return;

      // Cada envio vira várias linhas (uma por destinatário). Agrupa por
      // título + instante para reconstituir o "envio" e contar destinatários.
      const grupos = new Map<string, EnviadaGrupo>();
      for (const row of data ?? []) {
        const key = `${row.title}|${new Date(row.created_at).toISOString().slice(0, 19)}`;
        const existente = grupos.get(key);
        if (existente) existente.count++;
        else grupos.set(key, { title: row.title, body: row.body, createdAt: row.created_at, count: 1 });
      }
      setEnviadas(Array.from(grupos.values()));
      setLoading(false);
    })();

    return () => {
      cancelado = true;
    };
  }, [accountId]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return enviadas;
    return enviadas.filter(
      (e) => e.title.toLowerCase().includes(q) || e.body.toLowerCase().includes(q)
    );
  }, [enviadas, busca]);

  return (
    <main className="flex flex-1 flex-col gap-4 px-[18px] pb-10 pt-2 md:gap-5 md:p-0">
      {/* Subtítulo + criar */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          Mensagens enviadas aos membros. As recebidas ficam no sino 🔔.
        </p>
        <Link
          href="/notificacoes/enviar"
          className="flex-none rounded-lg bg-primary px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          + Criar notificação
        </Link>
      </div>

      {/* Busca */}
      <input
        type="text"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por título ou mensagem"
        className="w-full rounded-[12px] border border-black/10 bg-paper px-4 py-2.5 text-[13.5px] text-ink outline-none focus:border-primary/40"
      />

      {loading ? (
        <p className="py-8 text-center text-[13px] text-muted">Carregando...</p>
      ) : filtradas.length === 0 ? (
        <div className="rounded-[14px] bg-paper px-6 py-10 text-center shadow-[0_1px_3px_rgba(0,0,0,0.07)]">
          <p className="text-[13.5px] text-muted">
            {enviadas.length === 0
              ? "Nenhuma notificação enviada ainda."
              : "Nenhum resultado para a busca."}
          </p>
          {enviadas.length === 0 && (
            <Link
              href="/notificacoes/enviar"
              className="mt-3 inline-block text-[13px] font-medium text-primary hover:underline"
            >
              Enviar primeira notificação
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[14px] border border-black/[0.07] bg-paper shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          {/* Cabeçalho (desktop) */}
          <div className="hidden grid-cols-[1fr_110px_150px] gap-4 border-b border-black/[0.07] px-5 py-3 text-[11.5px] font-semibold uppercase tracking-[0.5px] text-muted md:grid">
            <span>Título</span>
            <span className="text-right">Destinatários</span>
            <span className="text-right">Data de envio</span>
          </div>

          {filtradas.map((e, i) => (
            <div
              key={`${e.title}-${e.createdAt}-${i}`}
              className="border-b border-black/[0.05] px-5 py-3.5 last:border-b-0 md:grid md:grid-cols-[1fr_110px_150px] md:items-center md:gap-4"
            >
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-ink">{e.title}</p>
                <p className="mt-0.5 line-clamp-1 text-[12.5px] text-muted">{e.body}</p>
              </div>
              <div className="mt-1.5 flex items-center gap-2 md:mt-0 md:justify-end">
                <span className="rounded-full bg-surface px-2.5 py-0.5 text-[11.5px] font-semibold text-ink-soft">
                  {e.count} {e.count === 1 ? "pessoa" : "pessoas"}
                </span>
              </div>
              <div className="mt-1 text-[12px] text-faint md:mt-0 md:text-right">
                {formatarDataEnvio(e.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
