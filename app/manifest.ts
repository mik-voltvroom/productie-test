import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VVOS Vehicle Intelligence",
    short_name: "VVOS Check",
    description: "Mobiele Volt & Vroom voertuiginspectie en VVOS Voertuigrapport.",
    start_url: "/dashboard/voertuigcheck",
    display: "standalone",
    background_color: "#f7f9fb",
    theme_color: "#ffffff",
    orientation: "portrait",
    icons: [
      { src: "/brand/favicon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/favicon-512.png", sizes: "512x512", type: "image/png", purpose: "any" }
    ]
  };
}
