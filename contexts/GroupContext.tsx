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
import { ACTIVE_GROUP_COOKIE, ACTIVE_ACCOUNT_COOKIE } from "@/lib/active-group";

export type AccountOption = {
  account_id: string;
  group_id: string | null;
  profile: "admin" | "coordinator" | "member";
  group_name: string | null;
};

interface GroupContextType {
  // Grupo ativo no momento (null = visão geral do admin).
  activeGroupId: string | null;
  activeGroupName: string | null;

  // Trocar grupo (só admin pode).
  setActiveGroup: (groupId: string | null) => void;

  // Grupos disponíveis para o seletor (admin vê todos; demais veem o seu).
  groups: { id: string; name: string }[];

  // Contas disponíveis + conta ativa para usuários com múltiplos vínculos.
  accounts: AccountOption[];
  activeAccountId: string | null;
  setActiveAccount: (accountId: string) => void;

  // Helpers.
  isGlobalView: boolean; // admin sem grupo selecionado
  canSwitchGroup: boolean; // true só para admin (dropdown de grupos)
  hasMultipleAccounts: boolean; // true para não-admin com 2+ contas
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
  hasMultipleAccounts,
  accounts,
  accountId,
}: {
  children: React.ReactNode;
  profile: "admin" | "coordinator" | "member" | null;
  groupId: string | null;
  hasMultipleAccounts: boolean;
  accounts: AccountOption[];
  accountId: string | null;
}) {
  const router = useRouter();

  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  // Seleção do admin (os demais têm grupo fixo no account). Inicia do cookie.
  const [adminSelection, setAdminSelection] = useState<string | null>(() =>
    lerCookie(ACTIVE_GROUP_COOKIE)
  );
  // Conta ativa para multi-conta não-admin.
  const [activeAccountId, setActiveAccountIdState] = useState<string | null>(accountId);
  useEffect(() => {
    setActiveAccountIdState(accountId);
  }, [accountId]);

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

  const setActiveAccount = useCallback(
    (novoAccountId: string) => {
      if (canSwitchGroup || !hasMultipleAccounts) return;
      setActiveAccountIdState(novoAccountId);
      gravarCookie(ACTIVE_ACCOUNT_COOKIE, novoAccountId);
      router.refresh();
    },
    [canSwitchGroup, hasMultipleAccounts, router]
  );

  const value = useMemo<GroupContextType>(() => {
    const activeGroupName =
      groups.find((g) => g.id === activeGroupId)?.name ?? null;
    return {
      activeGroupId,
      activeGroupName,
      setActiveGroup,
      groups,
      accounts,
      activeAccountId,
      setActiveAccount,
      isGlobalView: activeGroupId === null,
      canSwitchGroup,
      hasMultipleAccounts,
      isLoading: profile === null,
    };
  }, [activeGroupId, groups, setActiveGroup, accounts, activeAccountId, setActiveAccount, canSwitchGroup, hasMultipleAccounts, profile]);

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
