"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ACTIVE_GROUP_COOKIE } from "@/lib/active-group";

interface GroupContextType {
  // Grupo ativo no momento (null = visão geral do admin).
  activeGroupId: string | null;
  activeGroupName: string | null;

  // Trocar grupo (só admin pode).
  setActiveGroup: (groupId: string | null) => void;

  // Grupos disponíveis para o seletor (admin vê todos; demais veem o seu).
  groups: { id: string; name: string }[];

  // Helpers.
  isGlobalView: boolean; // admin sem grupo selecionado
  canSwitchGroup: boolean; // true só para admin
  isLoading: boolean;
}

const GroupContext = createContext<GroupContextType | null>(null);

function lerCookie(nome: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(
    new RegExp("(?:^|; )" + nome + "=([^;]*)")
  );
  return m ? decodeURIComponent(m[1]) : null;
}

function gravarCookie(nome: string, valor: string | null) {
  if (typeof document === "undefined") return;
  if (valor) {
    document.cookie = `${nome}=${encodeURIComponent(
      valor
    )}; path=/; max-age=31536000; samesite=lax`;
  } else {
    document.cookie = `${nome}=; path=/; max-age=0; samesite=lax`;
  }
}

export function GroupProvider({
  children,
  profile,
  groupId,
}: {
  children: React.ReactNode;
  // Perfil e grupo do usuário, resolvidos no servidor (layout) — fonte
  // confiável, sem depender de um fetch client-side com RLS que pode falhar/
  // atrasar e derrubar o admin para o modo "sem troca de grupo".
  profile: "admin" | "coordinator" | "member" | null;
  groupId: string | null;
}) {
  const router = useRouter();

  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  // Seleção do admin (os demais têm grupo fixo no account). Inicia do cookie.
  const [adminSelection, setAdminSelection] = useState<string | null>(() =>
    lerCookie(ACTIVE_GROUP_COOKIE)
  );

  const canSwitchGroup = profile === "admin";

  // Grupo ativo derivado: fixo no account para coordinator/member; seleção
  // do admin (cookie) caso contrário.
  const activeGroupId = profile && !canSwitchGroup ? groupId : adminSelection;

  // Coordinator/member: espelha o grupo fixo no cookie (para os Server
  // Components filtrarem).
  useEffect(() => {
    if (!profile) return;
    if (profile !== "admin") {
      gravarCookie(ACTIVE_GROUP_COOKIE, groupId);
    }
  }, [profile, groupId]);

  // Carrega os grupos visíveis (RLS filtra por perfil).
  useEffect(() => {
    if (!profile) return;
    let cancelado = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("groups")
        .select("id, name")
        .order("name", { ascending: true });
      if (!cancelado) setGroups(data ?? []);
    })();
    return () => {
      cancelado = true;
    };
  }, [profile]);

  const setActiveGroup = useCallback(
    (novoGrupoId: string | null) => {
      if (!canSwitchGroup) return; // só admin troca de grupo
      setAdminSelection(novoGrupoId);
      gravarCookie(ACTIVE_GROUP_COOKIE, novoGrupoId);
      // Re-renderiza os Server Components com o novo filtro.
      router.refresh();
    },
    [canSwitchGroup, router]
  );

  const value = useMemo<GroupContextType>(() => {
    const activeGroupName =
      groups.find((g) => g.id === activeGroupId)?.name ?? null;
    return {
      activeGroupId,
      activeGroupName,
      setActiveGroup,
      groups,
      isGlobalView: activeGroupId === null,
      canSwitchGroup,
      isLoading: profile === null,
    };
  }, [activeGroupId, groups, setActiveGroup, canSwitchGroup, profile]);

  return (
    <GroupContext.Provider value={value}>{children}</GroupContext.Provider>
  );
}

export function useGroup(): GroupContextType {
  const ctx = useContext(GroupContext);
  if (!ctx) {
    throw new Error("useGroup deve ser usado dentro do GroupProvider");
  }
  return ctx;
}
