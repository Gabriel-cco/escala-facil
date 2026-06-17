import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Menu from './components/Menu'
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Escala Fácil — Paróquia Santa Terezinha",
  description: "Gestão de escalas de serviço para grupos paroquiais",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Menu />
        {children}
      </body>
    </html>
  );
}