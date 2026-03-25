"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Camera, PlusSquare, BookOpen, User } from "lucide-react";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  isCenter?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/home", icon: Home, label: "ホーム" },
  { href: "/translate", icon: Camera, label: "翻訳" },
  { href: "/wordbook/new", icon: PlusSquare, label: "作成", isCenter: true },
  { href: "/wordbook", icon: BookOpen, label: "単語帳" },
  { href: "/profile", icon: User, label: "プロフィール" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 backdrop-blur-md safe-area-bottom"
      style={{ borderColor: "var(--color-border)" }}
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/wordbook"
              ? pathname.startsWith("/wordbook")
              : pathname === item.href || pathname.startsWith(item.href + "/");

          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 -mt-4"
                aria-label={item.label}
              >
                <span
                  className="flex h-13 w-13 items-center justify-center rounded-2xl shadow-lg transition active:scale-95"
                  style={{ background: "var(--color-accent)" }}
                >
                  <Icon className="h-6 w-6 text-white" />
                </span>
                <span className="text-[10px] text-gray-500">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 transition active:scale-95 ${
                isActive ? "text-accent" : "text-gray-400 hover:text-gray-600"
              }`}
              aria-label={item.label}
            >
              <Icon
                className="h-5 w-5"
                style={isActive ? { color: "var(--color-accent)" } : undefined}
              />
              <span className="text-[10px] tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
