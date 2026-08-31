"use server";

import { createClient } from "@/lib/supabase/server";
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
}): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

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

  const { error: erroAccount } = await supabase.from("accounts").insert({
    user_id: (usuario as { id: string }).id,
    profile: data.profile,
    group_id: data.groupId,
  });

  if (erroAccount) {
    return { error: erroAccount.message };
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
