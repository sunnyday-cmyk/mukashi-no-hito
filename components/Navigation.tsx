"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Camera, History, BookOpen } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";

export default function Navigation() {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // セッションを確認
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 未ログイン時、またはログインページでは非表示
  if (loading || !session || pathname === "/login") {
    return null;
  }

  const navItems = [
    { href: "/", icon: Home, label: "ホーム" },
    { href: "/scan", icon: Camera, label: "カメラ" },
    { href: "/history", icon: History, label: "履歴" },
    { href: "/wordbook", icon: BookOpen, label: "単語帳" },
  ];

  return (
    <nav className="sticky bottom-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center text-xs transition ${
                isActive
                  ? "text-gray-900"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <Icon className="mb-1 h-5 w-5" />
              <span className="tracking-[0.18em]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

