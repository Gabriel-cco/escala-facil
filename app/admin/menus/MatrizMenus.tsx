"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Grupo = { id: string; name: string };
type MenuKeyItem = { key: string; label: string };
type Excecao = { group_id: string; menu_key: string; visible: boolean };

export default function MatrizMenus({
  grupos,
  menuKeys,
  excecoesIniciais,
}: {
  grupos: Grupo[];
  menuKeys: MenuKeyItem[];
  excecoesIniciais: Excecao[];
}) {
  const [escondidos, setEscondidos] = useState<Set<string>>(() => {
    const set = new Set<string>();
    for (const e of excecoesIniciais) {
      if (!e.visible) set.add(`${e.group_id}:${e.menu_key}`);
    }
    return set;
  });
  const [saving, setSaving] = useState<string | null>(null);

  async function toggle(grupoId: string, menuKey: string) {
    const chave = `${grupoId}:${menuKey}`;
    const atualmenteVisivel = !escondidos.has(chave);
    setSaving(chave);

    const supabase = createClient();

    if (atualmenteVisivel) {
      // Esconder: upsert com visible=false
      await supabase.from("group_menu_permissions").upsert(
        { group_id: grupoId, menu_key: menuKey, visible: false, updated_at: new Date().toISOString() },
        { onConflict: "group_id,menu_key" }
      );
      setEscondidos((prev) => new Set([...prev, chave]));
    } else {
      // Mostrar: apagar a exceção (volta ao padrão visível)
      await supabase
        .from("group_menu_permissions")
        .delete()
        .eq("group_id", grupoId)
        .eq("menu_key", menuKey);
      setEscondidos((prev) => {
        const next = new Set(prev);
        next.delete(chave);
        return next;
      });
    }

    setSaving(null);
  }

  if (grupos.length === 0) {
    return <p className="text-[13px] text-muted">Nenhum grupo ativo cadastrado.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className="pb-3 pr-8 text-left text-[11.5px] font-semibold uppercase tracking-[0.8px] text-muted">
              Grupo
            </th>
            {menuKeys.map((m) => (
              <th
                key={m.key}
                className="pb-3 px-4 text-center text-[11.5px] font-semibold uppercase tracking-[0.8px] text-muted whitespace-nowrap"
              >
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[0.06]">
          {grupos.map((g) => (
            <tr key={g.id} className="hover:bg-surface">
              <td className="py-3 pr-8 text-[14px] font-medium text-ink whitespace-nowrap">
                {g.name}
              </td>
              {menuKeys.map((m) => {
                const chave = `${g.id}:${m.key}`;
                const visivel = !escondidos.has(chave);
                const carregando = saving === chave;
                return (
                  <td key={m.key} className="py-3 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={visivel}
                      disabled={carregando}
                      onChange={() => toggle(g.id, m.key)}
                      className="h-4 w-4 cursor-pointer accent-primary disabled:cursor-wait disabled:opacity-40"
                      title={visivel ? "Visível — clique para esconder" : "Escondido — clique para mostrar"}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
