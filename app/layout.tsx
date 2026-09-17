import type { Metadata } from "next";
import ThemeInitScript from "@/components/ThemeInitScript";
import { GoogleAnalytics } from "@next/third-parties/google";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import OfflineNotice from "@/components/OfflineNotice";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://gourabmondal.vercel.app"),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      {
        url: "/icons8-favicon-windows-11-filled-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/icons8-favicon-windows-11-filled-72.png",
        sizes: "72x72",
        type: "image/png",
      },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      {
        url: "/icons8-favicon-windows-11-filled-72.png",
        sizes: "72x72",
        type: "image/png",
      },
    ],
  },
  other: {
    "msapplication-square70x70logo":
      "/icons8-favicon-windows-11-filled-70.png",
  },
  title: "Gourab Mondal | Full Stack Developer",
  description:
    "B.Tech CS student. Interested mainly in backend architectures and GenAI applications. Currently trying to get better at software stuff.",
  keywords: [
    "Gourab Mondal",
    "Full Stack Developer",
    "Backend Developer",
    "GenAI",
    "FastAPI",
    "Python",
    "React",
    "Docker",
    "Portfolio",
    "Software Engineer",
  ],
  authors: [{ name: "Gourab Mondal", url: "https://github.com/assignment-sets" }],
  creator: "Gourab Mondal",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://gourabmondal.vercel.app",
    title: "Gourab Mondal | Full Stack Developer",
    description:
      "B.Tech CS student. Interested mainly in backend and GenAI applications.",
    siteName: "Gourab Mondal Portfolio",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gourab Mondal | Full Stack Developer",
    description:
      "B.Tech CS student. Interested mainly in backend and GenAI applications.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": "https://gourabmondal.vercel.app/#person",
      name: "Gourab Mondal",
      jobTitle: "Full Stack Developer",
      url: "https://gourabmondal.vercel.app",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Kolkata",
        addressCountry: "India",
      },
      alumniOf: {
        "@type": "EducationalOrganization",
        name: "University of Engineering & Management",
      },
      knowsAbout: [
        "Backend Architecture",
        "Generative AI",
        "FastAPI",
        "Python",
        "React",
        "Docker",
        "Spring Boot",
        "LangGraph",
        "Model Context Protocol (MCP)",
      ],
      sameAs: [
        "https://github.com/assignment-sets",
        "https://linkedin.com/in/gourab-mondal-gm2004",
      ],
    },
    {
      "@type": "ProfilePage",
      "@id": "https://gourabmondal.vercel.app/#webpage",
      url: "https://gourabmondal.vercel.app",
      name: "Gourab Mondal | Full Stack Developer Portfolio",
      isPartOf: {
        "@type": "WebSite",
        "@id": "https://gourabmondal.vercel.app/#website",
        url: "https://gourabmondal.vercel.app",
        name: "Gourab Mondal Portfolio",
      },
      mainEntity: {
        "@id": "https://gourabmondal.vercel.app/#person",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <ThemeInitScript />
        <link
          rel="alternate"
          type="text/plain"
          href="/llms.txt"
          title="LLMs.txt"
        />
        <link
          rel="alternate"
          type="text/markdown"
          href="/"
          title="Markdown representation"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <ServiceWorkerRegister />
        {children}
        <OfflineNotice />
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID!} />
      </body>
    </html>
  );
}
