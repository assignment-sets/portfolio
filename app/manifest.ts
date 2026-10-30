import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gourab Mondal | Full Stack Developer",
    short_name: "Gourab",
    description:
      "B.Tech CS student. Interested mainly in backend architectures and GenAI applications.",
    start_url: "/",
    scope: "/",
    id: "/",
    display: "standalone",
    background_color: "#161616",
    theme_color: "#161616",
    icons: [
      {
        src: "/icons8-favicon-windows-11-filled-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/icons8-favicon-windows-11-filled-72.png",
        sizes: "72x72",
        type: "image/png",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
