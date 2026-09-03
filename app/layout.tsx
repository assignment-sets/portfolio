import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gourab Mondal | Full Stack Developer",
  description:
    "B.Tech CS student. Interested mainly in backend and GenAI applications. Currently trying to get better at software stuff.",
  keywords: [
    "Gourab Mondal",
    "Full Stack Developer",
    "Backend Developer",
    "GenAI",
    "FastAPI",
    "Python",
    "React",
    "Portfolio",
  ],
  authors: [{ name: "Gourab Mondal", url: "https://github.com/assignment-sets" }],
  creator: "Gourab Mondal",
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "Gourab Mondal | Full Stack Developer",
    description:
      "B.Tech CS student. Interested mainly in backend and GenAI applications.",
    siteName: "Gourab Mondal Portfolio",
  },
  twitter: {
    card: "summary",
    title: "Gourab Mondal | Full Stack Developer",
    description:
      "B.Tech CS student. Interested mainly in backend and GenAI applications.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Gourab Mondal",
  jobTitle: "Full Stack Developer",
  address: {
    "@type": "PostalAddress",
    "addressLocality": "Kolkata",
    "addressCountry": "India",
  },
  sameAs: [
    "https://github.com/assignment-sets",
    "https://linkedin.com/in/gourab-mondal-gm2004",
  ],
};

const themeScript = `(function(){try{var s=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var dark=s?s==='dark':d;if(dark){document.documentElement.setAttribute('data-theme','dark');}else{document.documentElement.setAttribute('data-theme','light');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
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
        {children}
        <GoogleAnalytics gaId="G-VY36RMW61H" />
      </body>
    </html>
  );
}
