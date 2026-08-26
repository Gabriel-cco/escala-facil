import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Escala Fácil",
    short_name: "Escala Fácil",
    description: "Organize as escalas de serviço da sua paróquia",
    start_url: "/",
    display: "standalone",
    background_color: "#FAFAFA",
    theme_color: "#6B3521",
    orientation: "portrait-primary",
    icons: [
      { src: "/pwa-icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icons/192?maskable=1", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/pwa-icons/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
