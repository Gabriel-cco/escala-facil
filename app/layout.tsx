import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import AppShell, { type ShellUser } from "./components/shell/AppShell";
import { iniciais } from "@/lib/iniciais";
import "./globals.css";

// Inter em todo o app (design system). Hierarquia por tamanho e peso.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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

    const { data: rows } = await supabase.rpc("get_account_by_auth_id", {
      p_auth_id: user.id,
    });
    const perfil =
      (rows?.[0]?.profile as ShellUser["perfil"] | undefined) ?? null;

    shellUser = {
      nome,
      email: user.email ?? "",
      iniciais: iniciais(nome),
      perfil,
    };
  }

  return (
    <html lang="pt-BR" className={`${inter.variable} h-full`}>
      <body className="min-h-full font-sans">
        <AppShell user={shellUser}>{children}</AppShell>
      </body>
    </html>
  );
}
