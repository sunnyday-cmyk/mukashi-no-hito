import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: {
    template: "%s | 昔の人",
    default: "昔の人｜AI古文解析・現代語訳カメラ",
  },
  description: "カメラで撮るだけで古文を現代語訳。教科書や古文書のくずし字もAIが瞬時に解読し、意味や背景を分かりやすく解説する学習アプリです。",
  applicationName: "昔の人", // 検索結果のサイト名に使われる
  keywords: ["古文", "現代語訳", "古文 カメラ 翻訳", "古文 現代語訳 AI", "AI古文解読", "古文解析", "品詞分解", "古典", "受験", "学習アプリ", "AI", "OCR", "カメラ翻訳", "古文アプリ"],
  authors: [{ name: "昔の人" }],
  creator: "昔の人",
  publisher: "昔の人",
  verification: {
    google: "nYnsReuq__-1a0mO_P929c66GJcTQhweDfBfVPwEUYI",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    siteName: "昔の人", // SNSなどで使われる
    type: "website",
    locale: "ja_JP",
    url: "https://mukashi-no-hito-4uir.vercel.app/",
    title: "昔の人｜AI古文解析・現代語訳カメラ",
    description: "カメラで撮るだけで古文を現代語訳。教科書や古文書のくずし字もAIが瞬時に解読し、意味や背景を分かりやすく解説する学習アプリです。",
  },
  twitter: {
    card: "summary",
    title: "昔の人｜AI古文解析",
    description: "カメラで撮るだけで古文を現代語訳。AIが瞬時に解読し、意味や背景を分かりやすく解説する学習アプリです。",
  },
  alternates: {
    canonical: "https://mukashi-no-hito-4uir.vercel.app/",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "昔の人",
  },
  formatDetection: {
    telephone: false,
  },
  // iconsプロパティは削除（app/icon.pngが自動認識されるため）
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "昔の人",
  },
};

export const viewport: Viewport = {
  themeColor: "#111827",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased bg-white">
        <Header />
        {children}
        <Footer />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
