"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  // ログインページやランディングページでも表示
  const shouldShow = true;

  if (!shouldShow) {
    return null;
  }

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-2xl px-5 py-6">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-600">
            <Link
              href="/tokushoho"
              className="hover:text-gray-900 transition"
            >
              特定商取引法に基づく表記
            </Link>
            <span className="text-gray-300">|</span>
            <Link
              href="/terms"
              className="hover:text-gray-900 transition"
            >
              利用規約
            </Link>
            <span className="text-gray-300">|</span>
            <Link
              href="/privacy"
              className="hover:text-gray-900 transition"
            >
              プライバシーポリシー
            </Link>
          </div>
          <p className="text-xs text-gray-500">
            © 2025 昔の人. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

