import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import localFont from "next/font/local";
import { Newsreader } from "next/font/google";
import AuthShell from "./components/shell/AuthShell";
import LoadingScreen from "./components/LoadingScreen";
import "./globals.css";

// Satoshi variable — fonte principal do design system (não está no Google Fonts).
const satoshi = localFont({
  src: "./fonts/Satoshi-Variable.woff2",
  variable: "--font-satoshi",
  display: "swap",
  weight: "300 900",
});

// Newsreader para títulos de página (evoca a serifa do brasão paroquial).
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal"],
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
  themeColor: "#6B3521",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${satoshi.variable} ${newsreader.variable} h-full`}>
      <body className="min-h-full font-sans">
        <Suspense fallback={<LoadingScreen />}>
          <AuthShell>{children}</AuthShell>
        </Suspense>
      </body>
    </html>
  );
}
