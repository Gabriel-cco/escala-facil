"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logAccess } from "@/lib/access-log";

const iconeLink = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

async function getOrCreateGroupLink(groupId: string): Promise<string | null> {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("group_public_links")
    .select("token")
    .eq("group_id", groupId)
    .maybeSingle();

  if (existing) return (existing as { token: string }).token;

  const { data: created, error } = await supabase
    .from("group_public_links")
    .insert({ group_id: groupId })
    .select("token")
    .single();

  if (error || !created) return null;
  return (created as { token: string }).token;
}

export default function CompartilharEscala({
  groupId,
  groupName,
  accountId,
}: {
  groupId: string;
  groupName: string;
  accountId?: string;
}) {
  const [processando, setProcessando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [erro, setErro] = useState(false);

  async function compartilhar() {
    setProcessando(true);
    setErro(false);
    const token = await getOrCreateGroupLink(groupId);
    setProcessando(false);

    if (!token) {
      setErro(true);
      setTimeout(() => setErro(false), 3000);
      return;
    }

    const url = `${window.location.origin}/escala/${token}`;

    if (accountId) logAccess(accountId, "compartilhar_link", { group_id: groupId });

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Escala — ${groupName}`,
          text: `Confira a escala do grupo ${groupName}`,
          url,
        });
        return;
      } catch {
        // Usuário cancelou o compartilhamento nativo — segue sem erro.
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setToast("Link copiado!");
      setTimeout(() => setToast(null), 2500);
    } catch {
      setErro(true);
      setTimeout(() => setErro(false), 3000);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={compartilhar}
        disabled={processando}
        className="flex items-center gap-1.5 rounded-full border border-black/10 px-3.5 py-2 text-[12.5px] font-semibold text-ink-soft hover:text-ink disabled:opacity-50"
      >
        {iconeLink}
        {processando ? "Gerando…" : "Compartilhar escala"}
      </button>
      {toast && (
        <span className="text-[11.5px] font-semibold text-[#6B3521]">
          {toast}
        </span>
      )}
      {erro && (
        <span className="text-[11.5px] font-semibold text-danger">
          Não foi possível gerar o link.
        </span>
      )}
      <span className="max-w-[240px] text-right text-[11px] leading-snug text-faint">
        Este link é público — qualquer pessoa com ele pode ver a escala do grupo.
      </span>
    </div>
  );
}
