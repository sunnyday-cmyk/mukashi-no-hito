import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";

/** 本文・UI（読み込み最優先・LCP/FCP に影響） */
export const notoSansJP = Noto_Sans_JP({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

/** 古文表示用セリフ（必要時のみ読み込み） */
export const notoSerifJP = Noto_Serif_JP({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
  adjustFontFallback: true,
  variable: "--font-serif-jp",
});
