import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O browser revalida o script do service worker a cada checagem de update,
  // mas só se o /sw.js não vier de cache. Sem no-cache, uma versão antiga
  // (e quebrada) do SW pode continuar controlando a página por até 24h,
  // interceptando navegações e quebrando o login OAuth. Força revalidação.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
