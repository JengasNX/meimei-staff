import type { Metadata, Viewport } from "next";
import { Inter, Unbounded } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/config/site";

/** Заголовочный геометрический шрифт (кириллица) — как на meimei-website. */
const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700", "800", "900"],
});

/** Основной текст (кириллица). */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — сайт персонала`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#080B12",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${unbounded.variable} ${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-night font-sans text-frost">{children}</body>
    </html>
  );
}
