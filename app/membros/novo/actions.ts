"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/current-user";
import { sendWelcomeEmail } from "@/lib/email/send-welcome-email";
import { logAccess } from "@/lib/access-log";

export async function criarMembroAction(data: {
  nome: string;
  email: string;
  cpf: string | null;
  birthDate: string | null;
  profile: string;
  groupId: string | null;
  enviarBoasVindas: boolean;
  accountId?: string;
  ministerioIds?: string[];
  existingUserId?: string; // se fornecido, reaproveita o users existente
}): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  // Validação server-side de perfil e grupo
  const conta = await getCurrentAccount();
  if (!conta) return { error: "Não autorizado" };

  let profile = data.profile;
  let groupId = data.groupId;

  if (conta.profile === "coordinator") {
    // Coordinator só pode criar membros no próprio grupo
    profile = "member";
    groupId = conta.group_id ?? null;
  } else if (conta.profile !== "admin") {
    return { error: "Não autorizado" };
  }

  let userId: string;

  if (data.existingUserId) {
    // Reaproveitando users existente — só cria o account
    userId = data.existingUserId;
  } else {
    const { data: usuario, error: erroUser } = await supabase
      .from("users")
      .insert({
        name: data.nome,
        email: data.email,
        cpf: data.cpf || null,
        birth_date: data.birthDate || null,
      })
      .select("id")
      .single();

    if (erroUser || !usuario) {
      return { error: erroUser?.message ?? "desconhecido" };
    }
    userId = (usuario as { id: string }).id;
  }

  const { data: newAccount, error: erroAccount } = await supabase
    .from("accounts")
    .insert({
      user_id: userId,
      profile,
      group_id: groupId,
    })
    .select("id")
    .single();

  if (erroAccount || !newAccount) {
    return { error: erroAccount?.message ?? "desconhecido" };
  }

  const newAccountId = (newAccount as { id: string }).id;

  if (data.ministerioIds?.length) {
    await supabase.from("ministerio_members").insert(
      data.ministerioIds.map((mid) => ({
        ministerio_id: mid,
        account_id: newAccountId,
      }))
    );
  }

  if (data.accountId) {
    void logAccess(data.accountId, "criar_membro");
  }

  if (data.enviarBoasVindas) {
    sendWelcomeEmail({ nome: data.nome, email: data.email }).catch((err) => {
      console.warn(
        "Envio de boas-vindas falhou, membro já foi criado normalmente:",
        err
      );
    });
  }

  return { success: true };
}
