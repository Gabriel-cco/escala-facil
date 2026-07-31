"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export interface CurrentAccount {
  user: {
    id: string;
    authId: string;
    name: string;
    email: string;
  };
  account: {
    id: string;
    profile: Profile;
    groupId: string | null;
    active: boolean;
    suspendedUntil: string | null;
  };
}

interface UseCurrentAccount {
  data: CurrentAccount | null;
  isLoading: boolean;
  error: Error | null;
}

// Formato cru vindo do join users → accounts (colunas em inglês).
type Row = {
  id: string;
  auth_id: string;
  name: string;
  email: string;
  accounts:
    | {
        id: string;
        profile: Profile;
        group_id: string | null;
        active: boolean;
        suspended_until: string | null;
      }[]
    | null;
};

/**
 * Retorna o usuário + account logado (perfil e grupo). Disponível em qualquer
 * client component. `data` é null quando não há sessão ou account configurado.
 */
export function useCurrentAccount(): UseCurrentAccount {
  const [data, setData] = useState<CurrentAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        if (!cancelado) {
          setData(null);
          setIsLoading(false);
        }
        return;
      }

      const { data: row, error: erro } = await supabase
        .from("users")
        .select(
          "id, auth_id, name, email, accounts(id, profile, group_id, active, suspended_until)"
        )
        .eq("auth_id", authUser.id)
        .single<Row>();

      if (cancelado) return;

      if (erro) {
        setError(new Error(erro.message));
        setData(null);
        setIsLoading(false);
        return;
      }

      const account = row?.accounts?.[0] ?? null;
      setData(
        row && account
          ? {
              user: {
                id: row.id,
                authId: row.auth_id,
                name: row.name,
                email: row.email,
              },
              account: {
                id: account.id,
                profile: account.profile,
                groupId: account.group_id,
                active: account.active,
                suspendedUntil: account.suspended_until,
              },
            }
          : null
      );
      setIsLoading(false);
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, []);

  return { data, isLoading, error };
}
