"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BottomNav from "@/components/BottomNav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
      }
      setChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) router.replace("/login");
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f7ff]">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-t-transparent"
          style={{ borderColor: "var(--color-accent)" }}
        />
      </div>
    );
  }

  // カメラ画面はBottomNavを非表示
  const hideNav = pathname?.startsWith("/translate/camera");

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <main className={hideNav ? "" : "pb-nav"}>{children}</main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
