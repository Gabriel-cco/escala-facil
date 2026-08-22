import type { Metadata, Viewport } from "next";
import { Inter, Newsreader } from "next/font/google";
import AppShell, { type ShellUser } from "./components/shell/AppShell";
import { iniciais } from "@/lib/iniciais";
import { getAuthUser, getCurrentAccount } from "@/lib/current-user";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Newsreader para títulos de página (evoca a serifa do brasão paroquial).
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "Escala Fácil — Paróquia Santa Terezinha",
  description: "Gestão de escalas de serviço para grupos paroquiais",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Escala Fácil",
  },
};

export const viewport: Viewport = {
  themeColor: "#4F46E5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getAuthUser();

  let shellUser: ShellUser | null = null;
  if (user) {
    const nome =
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      user.email ??
      "Usuário";

    // getCurrentAccount reaproveita o getAuthUser acima (cache por request).
    const account = await getCurrentAccount();

    shellUser = {
      nome,
      email: user.email ?? "",
      iniciais: iniciais(nome),
      perfil: (account?.profile as ShellUser["perfil"]) ?? null,
      accountId: account?.account_id ?? null,
      groupId: account?.group_id ?? null,
    };
  }

  return (
    <html lang="pt-BR" className={`${inter.variable} ${newsreader.variable} h-full`}>
      <body className="min-h-full font-sans">
        <AppShell user={shellUser}>{children}</AppShell>
      </body>
    </html>
  );
}
