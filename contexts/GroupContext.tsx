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
import { useCurrentAccount } from "@/hooks/useCurrentAccount";
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

export function GroupProvider({ children }: { children: React.ReactNode }) {
  const { data: current, isLoading: carregandoConta } = useCurrentAccount();
  const router = useRouter();

  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  // Seleção do admin (os demais têm grupo fixo no account). Inicia do cookie.
  const [adminSelection, setAdminSelection] = useState<string | null>(() =>
    lerCookie(ACTIVE_GROUP_COOKIE)
  );

  const canSwitchGroup = current?.account.profile === "admin";

  // Grupo ativo derivado: fixo no account para coordinator/member; seleção
  // do admin caso contrário (ou o cookie, enquanto a conta carrega).
  const activeGroupId =
    current && !canSwitchGroup ? current.account.groupId : adminSelection;

  // Coordinator/member: espelha o grupo fixo no cookie (efeito externo, para
  // os Server Components filtrarem). Não faz setState aqui.
  useEffect(() => {
    if (!current) return;
    if (current.account.profile !== "admin") {
      gravarCookie(ACTIVE_GROUP_COOKIE, current.account.groupId);
    }
  }, [current]);

  // Carrega os grupos visíveis (RLS filtra por perfil).
  useEffect(() => {
    if (!current) return;
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
  }, [current]);

  const setActiveGroup = useCallback(
    (groupId: string | null) => {
      if (!canSwitchGroup) return; // só admin troca de grupo
      setAdminSelection(groupId);
      gravarCookie(ACTIVE_GROUP_COOKIE, groupId);
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
      canSwitchGroup: !!canSwitchGroup,
      isLoading: carregandoConta,
    };
  }, [activeGroupId, groups, setActiveGroup, canSwitchGroup, carregandoConta]);

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
