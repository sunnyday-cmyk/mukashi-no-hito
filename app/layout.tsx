import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: {
    template: "%s | 昔の人",
    default: "昔の人｜AI古文解析・現代語訳カメラ",
  },
  description:
    "カメラで撮るだけで古文を現代語訳。AIが瞬時に解読し、友達と単語帳を共有して一緒に学べる古文学習アプリ。",
  applicationName: "昔の人",
  keywords: ["古文", "現代語訳", "古文AI", "漢文", "英語", "単語帳", "受験", "学習"],
  authors: [{ name: "昔の人" }],
  robots: { index: true, follow: true },
  verification: { google: "nYnsReuq__-1a0mO_P929c66GJcTQhweDfBfVPwEUYI" },
  openGraph: {
    siteName: "昔の人",
    type: "website",
    locale: "ja_JP",
    url: "https://mukashi-no-hito-4uir.vercel.app/",
    title: "昔の人｜AI古文学習アプリ",
    description: "カメラで撮るだけで古文を現代語訳。単語帳を友達と共有して一緒に学ぼう。",
  },
  twitter: { card: "summary", title: "昔の人｜AI古文学習" },
  alternates: { canonical: "https://mukashi-no-hito-4uir.vercel.app/" },
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "昔の人" },
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
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
