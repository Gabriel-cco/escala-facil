// ATENÇÃO: nunca importar isso em código client-side — a API key não pode vazar
import { Resend } from "resend";
import { WelcomeEmail } from "./welcome-email";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail({
  nome,
  email,
}: {
  nome: string;
  email: string;
}) {
  const { error } = await resend.emails.send({
    from: "Escala Fácil <contato@escalafacil.com>", // ajustar após verificar domínio
    to: email,
    subject: "Bem-vindo(a) ao Escala Fácil!",
    react: WelcomeEmail({
      nome,
      linkApp: process.env.NEXT_PUBLIC_APP_URL!,
    }),
  });

  if (error) {
    console.warn("Falha ao enviar email de boas-vindas:", error);
    // não relançar — falha de email não deve quebrar o fluxo de criar membro
  }
}
