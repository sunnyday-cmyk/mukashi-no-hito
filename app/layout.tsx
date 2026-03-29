import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import { getSiteUrl } from "@/lib/siteUrl";
import { SpeedInsights } from "@vercel/speed-insights/next";

const siteUrl = `${getSiteUrl()}/`;

export const metadata: Metadata = {
  title: {
    template: "%s | STUDY ROYALE",
    default: "STUDY ROYALE | AI古文解析・現代語訳カメラ",
  },
  description:
    "カメラで撮るだけで古文を現代語訳。AIが瞬時に解読し、友達と単語帳を共有して一緒に学べる古文学習アプリ。",
  applicationName: "STUDY ROYALE",
  keywords: ["古文", "現代語訳", "古文AI", "漢文", "英語", "単語帳", "受験", "学習"],
  authors: [{ name: "STUDY ROYALE" }],
  robots: { index: true, follow: true },
  verification: { google: "nYnsReuq__-1a0mO_P929c66GJcTQhweDfBfVPwEUYI" },
  openGraph: {
    siteName: "STUDY ROYALE",
    type: "website",
    locale: "ja_JP",
    url: siteUrl,
    title: "STUDY ROYALE | AI古文学習アプリ",
    description: "カメラで撮るだけで古文を現代語訳。単語帳を友達と共有して一緒に学ぼう。",
  },
  twitter: { card: "summary", title: "STUDY ROYALE | AI古文学習" },
  alternates: { canonical: siteUrl },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "STUDY ROYALE" },
  formatDetection: { telephone: false },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1a2e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
        <SpeedInsights />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
