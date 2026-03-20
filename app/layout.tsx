import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Source_Sans_3 } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_DESCRIPTION, SITE_OG_IMAGE, SITE_OG_IMAGES } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

export const dynamic = "force-dynamic";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const ibmMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: "SWEDLE — daily games for software engineers",
    template: "%s | SWEDLE",
  },
  description: SITE_DESCRIPTION,
  applicationName: "SWEDLE",
  keywords: [
    "SWEDLE",
    "daily puzzle",
    "Wordle for programmers",
    "programming language quiz",
    "Langdle",
    "code snippet guessing game",
    "GitHub stars game",
    "Big O notation quiz",
    "software engineer trivia",
    "tech timeline",
    "IPO quiz",
  ],
  category: "games",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "SWEDLE",
    title: "SWEDLE — daily games for software engineers",
    description: SITE_DESCRIPTION,
    images: SITE_OG_IMAGES,
  },
  twitter: {
    card: "summary_large_image",
    title: "SWEDLE — daily games for software engineers",
    description: SITE_DESCRIPTION,
    images: [SITE_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export const viewport: Viewport = {
  themeColor: "#12100e",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${sourceSans.variable} ${ibmMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[var(--bg)] text-[var(--fg)] [font-family:var(--font-sans),ui-sans-serif,system-ui,sans-serif]">
        <div className="flex min-h-full flex-1 flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
