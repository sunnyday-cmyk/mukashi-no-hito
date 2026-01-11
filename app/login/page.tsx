"use client";

import { useEffect, useState } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import type { Session } from "@supabase/supabase-js";

export default function LoginPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 現在のセッションを確認
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session) {
        router.push("/");
      }
    });

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        router.push("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  if (session) {
    return null; // リダイレクト中
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="flex items-center gap-4 px-5 py-4">
          <h1 className="text-lg font-medium">ログイン</h1>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-5 py-12 pb-24">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-medium tracking-wide text-gray-900">
              昔の人
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              古文解析アプリにログイン
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <Auth
              supabaseClient={supabase}
              appearance={{ theme: ThemeSupa }}
              providers={["google", "github"]}
              onlyThirdPartyProviders={false}
              view="sign_in"
              showLinks={true}
              redirectTo={`${typeof window !== "undefined" ? window.location.origin : ""}/`}
              localization={{
                variables: {
                  sign_up: {
                    email_label: "メールアドレス",
                    password_label: "パスワード",
                    button_label: "新規登録",
                  },
                  sign_in: {
                    email_label: "メールアドレス",
                    password_label: "パスワード",
                    button_label: "ログイン",
                  },
                },
              }}
            />
          </div>

          <p className="text-center text-xs text-gray-500">
            メールアドレスとパスワード、またはGoogle/GitHubアカウントでログインできます
          </p>
        </div>
      </main>
    </div>
  );
}

