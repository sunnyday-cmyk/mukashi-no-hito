"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import CreditsDisplay from "@/components/CreditsDisplay";
import type { Session } from "@supabase/supabase-js";

export default function Header() {
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

  // ログインページやランディングページでは非表示
  if (pathname === "/login" || (!session && pathname === "/")) {
    return null;
  }

  // ログインしていない場合は非表示
  if (!session) {
    return null;
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between gap-3 px-5">
        <h1 className="text-base font-medium text-gray-900">昔の人</h1>
        <div className="flex items-center gap-2">
          <CreditsDisplay />
        </div>
      </div>
    </header>
  );
}

