/**
 * サイトのオリジン（末尾スラッシュなし）。
 * Vercel では NEXT_PUBLIC_SITE_URL を設定すること。
 */
export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "https://studyroyale.online";
  return raw.replace(/\/+$/, "");
}
