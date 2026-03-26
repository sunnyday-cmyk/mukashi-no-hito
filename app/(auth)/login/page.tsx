"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Eye, EyeOff, Loader2 } from "lucide-react";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/home");
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        setSuccess(
          "確認メールを送りました。メールのリンクをクリックしてアカウントを有効化してください。"
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.replace("/home");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "エラーが発生しました";
      if (msg.includes("Invalid login credentials")) {
        setError("メールアドレスまたはパスワードが正しくありません");
      } else if (msg.includes("User already registered")) {
        setError("このメールアドレスは既に登録されています");
      } else if (msg.includes("Password should be")) {
        setError("パスワードは6文字以上にしてください");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      {/* ロゴ */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white tracking-wider">STUDY ROYALE</h1>
        <p className="mt-2 text-sm text-white/60">
          AIで古文・漢文・英語を学ぼう
        </p>
      </div>

      {/* カード */}
      <div className="w-full max-w-sm rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-6 shadow-2xl">
        {/* タブ切り替え */}
        <div className="mb-6 flex rounded-xl bg-white/10 p-1">
          <button
            onClick={() => { setMode("login"); setError(null); }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              mode === "login" ? "bg-white text-[#1a1a2e] shadow" : "text-white/70"
            }`}
          >
            ログイン
          </button>
          <button
            onClick={() => { setMode("signup"); setError(null); }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              mode === "signup" ? "bg-white text-[#1a1a2e] shadow" : "text-white/70"
            }`}
          >
            新規登録
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-xs text-white/70">ニックネーム</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="例: 古文好きの太郎"
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#7c6fe0] focus:outline-none focus:ring-2 focus:ring-[#7c6fe0]/30"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-white/70">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mail@example.com"
              required
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#7c6fe0] focus:outline-none focus:ring-2 focus:ring-[#7c6fe0]/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-white/70">パスワード</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6文字以上"
                required
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 pr-10 text-sm text-white placeholder:text-white/40 focus:border-[#7c6fe0] focus:outline-none focus:ring-2 focus:ring-[#7c6fe0]/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-500/20 border border-red-500/30 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl bg-green-500/20 border border-green-500/30 px-4 py-3 text-sm text-green-300">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-lg transition active:scale-95 disabled:opacity-60"
            style={{ background: "var(--color-accent)" }}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === "login" ? (
              "ログイン"
            ) : (
              "アカウント作成"
            )}
          </button>
        </form>
      </div>

      <p className="mt-6 text-xs text-white/40">
        ログインすることで、利用規約・プライバシーポリシーに同意したとみなされます
      </p>
    </div>
  );
}
