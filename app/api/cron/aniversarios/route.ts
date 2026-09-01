import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToAccounts } from "@/lib/send-push";

// Executa diariamente às 8h (Brasília) via Vercel Cron (schedule: "0 11 * * *" UTC).
// Verifica aniversariantes do dia e envia parabéns ao grupo + mensagem pessoal.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Data de hoje no fuso de Brasília (UTC-3)
  const agora = new Date();
  const brasilia = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  const hoje = brasilia.toISOString().slice(0, 10); // "YYYY-MM-DD"
  const mmdd = hoje.slice(5); // "MM-DD"

  const admin = createAdminClient();

  // Usuários com aniversário hoje (comparação MM-DD, independente do ano)
  const { data: usuarios, error } = await admin
    .from("users")
    .select("id, name, birth_date")
    .like("birth_date", `%-${mmdd}`);

  if (error) {
    console.error("[cron/aniversarios] erro ao buscar usuários:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[cron/aniversarios] ${hoje} | ${usuarios?.length ?? 0} aniversariante(s)`);

  if (!usuarios?.length) {
    return NextResponse.json({ message: "Nenhum aniversariante hoje.", count: 0 });
  }

  let totalEnviados = 0;

  for (const usuario of usuarios) {
    // Conta(s) ativa(s) com grupo
    const { data: contas } = await admin
      .from("accounts")
      .select("id, group_id, groups(name)")
      .eq("user_id", usuario.id)
      .eq("active", true)
      .not("group_id", "is", null);

    if (!contas?.length) continue;

    const nomeCompleto = (usuario.name ?? "").trim();
    const primeiroNome = nomeCompleto.split(/\s+/)[0] || "você";

    for (const conta of contas) {
      if (!conta.group_id) continue;

      const grupoRow = Array.isArray(conta.groups) ? conta.groups[0] : conta.groups;
      const grupoNome = (grupoRow as { name?: string } | null)?.name ?? "Grupo";

      // ── Mensagem para os demais membros do grupo ───────────────────────
      const titleGrupo = `🎂 Aniversário no ${grupoNome}!`;
      const bodyGrupo = `Hoje é aniversário de ${nomeCompleto}! Que tal dar os parabéns ao nosso irmão(ã) em fé? 🎉`;

      const { data: membros } = await admin
        .from("accounts")
        .select("id")
        .eq("group_id", conta.group_id)
        .eq("active", true)
        .neq("id", conta.id);

      const membroIds = (membros ?? []).map((m) => m.id);

      if (membroIds.length > 0) {
        await admin.from("notifications").insert(
          membroIds.map((accountId) => ({
            account_id: accountId,
            title: titleGrupo,
            body: bodyGrupo,
            type: "birthday",
          }))
        );
        await sendPushToAccounts(membroIds, { title: titleGrupo, body: bodyGrupo, url: "/notificacoes" });
        totalEnviados += membroIds.length;
      }

      // ── Mensagem pessoal para o aniversariante ─────────────────────────
      const titlePessoal = `🎂 Feliz Aniversário, ${primeiroNome}!`;
      const bodyPessoal =
        `Olá ${primeiroNome}, desejamos a você um feliz aniversário! ` +
        `Que Deus em sua infinita bondade te cubra de bênçãos e sabedoria. ` +
        `Viva seu dia com muita paz e amor. Feliz vida! 🙏`;

      await admin.from("notifications").insert({
        account_id: conta.id,
        title: titlePessoal,
        body: bodyPessoal,
        type: "birthday",
      });
      await sendPushToAccounts([conta.id], { title: titlePessoal, body: bodyPessoal, url: "/notificacoes" });
      totalEnviados += 1;

      console.log(`[cron/aniversarios] ${nomeCompleto} (${conta.id}) → grupo "${grupoNome}" ${membroIds.length} membro(s) + pessoal`);
    }
  }

  return NextResponse.json({
    date: hoje,
    aniversariantes: usuarios.length,
    notificados: totalEnviados,
  });
}
