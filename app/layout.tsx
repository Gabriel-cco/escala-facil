import type { Metadata } from "next";
import { Newsreader } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import AppShell, { type ShellUser } from "./components/shell/AppShell";
import { iniciais } from "@/lib/iniciais";
import "./globals.css";

// Serifa dos títulos/nomes próprios (Newsreader, conforme handoff).
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Escala Fácil — Paróquia Santa Terezinha",
  description: "Gestão de escalas de serviço para grupos paroquiais",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let shellUser: ShellUser | null = null;
  if (user) {
    const nome =
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      user.email ??
      "Usuário";
    shellUser = {
      nome,
      email: user.email ?? "",
      iniciais: iniciais(nome),
    };
  }

  return (
    <html lang="pt-BR" className={`${newsreader.variable} h-full`}>
      <body className="min-h-full">
        <AppShell user={shellUser}>{children}</AppShell>
      </body>
    </html>
  );
}
