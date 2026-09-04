import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gourab Mondal | Full Stack Developer",
    short_name: "Gourab",
    description:
      "B.Tech CS student. Interested mainly in backend architectures and GenAI applications.",
    start_url: "/",
    display: "standalone",
    background_color: "#0c0c0c",
    theme_color: "#0c0c0c",
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
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
