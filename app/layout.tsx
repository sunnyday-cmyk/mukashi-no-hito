import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "昔の人 - スマホで古文を解析・現代語訳するアプリ",
  description: "カメラで古文を撮影するだけで、AIが瞬時に現代語訳と単語解説を行います。受験勉強や読書に最適な古文解析ツールです。",
  keywords: ["古文", "現代語訳", "品詞分解", "古典", "受験", "学習アプリ", "AI", "OCR", "古文解析"],
  authors: [{ name: "昔の人" }],
  creator: "昔の人",
  publisher: "昔の人",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "https://mukashi-no-hito-4uir.vercel.app/",
    siteName: "昔の人",
    title: "昔の人 - スマホで古文を解析・現代語訳するアプリ",
    description: "カメラで古文を撮影するだけで、AIが瞬時に現代語訳と単語解説を行います。受験勉強や読書に最適な古文解析ツールです。",
  },
  twitter: {
    card: "summary_large_image",
    title: "昔の人 - スマホで古文を解析・現代語訳するアプリ",
    description: "カメラで古文を撮影するだけで、AIが瞬時に現代語訳と単語解説を行います。",
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
  icons: {
    apple: "/icon-192x192.png",
  },
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
