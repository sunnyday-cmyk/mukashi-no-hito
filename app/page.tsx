"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera,
  Type,
  BookOpen,
  LogOut,
  ScanLine,
  Brain,
  BookMarked,
  ArrowRight,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 現在のセッションを確認
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  // 未ログイン時：ランディングページ
  if (!session) {
    return (
      <div className="flex min-h-screen flex-col bg-white text-gray-900">
        <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-2xl space-y-12 text-center">
            {/* ヘッダー */}
            <header className="space-y-4">
              <h1 className="font-serif text-4xl font-medium tracking-[0.3em] text-gray-900">
                昔の人
              </h1>
              <p className="font-serif text-lg leading-relaxed text-gray-700">
                千年の時を、一瞬で現代へ。
              </p>
              <p className="mx-auto max-w-lg font-serif text-sm leading-relaxed text-gray-600">
                カメラで撮るだけで、古文の品詞分解や現代語訳をお手伝い。
                <br />
                あなたの古文学習を支えるパートナーアプリです。
              </p>
            </header>

            {/* 特徴紹介 */}
            <section className="grid gap-6 md:grid-cols-3">
              <div className="space-y-3">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
                  <ScanLine className="h-8 w-8 text-amber-600" />
                </div>
                <h3 className="text-base font-medium text-gray-900">OCR文字認識</h3>
                <p className="text-xs leading-relaxed text-gray-600">
                  カメラで撮影するだけで、古文のテキストを自動で読み取ります
                </p>
              </div>

              <div className="space-y-3">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                  <Brain className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-base font-medium text-gray-900">AIによる詳細解析</h3>
                <p className="text-xs leading-relaxed text-gray-600">
                  品詞分解、活用形、現代語訳まで、AIが丁寧に解析します
                </p>
              </div>

              <div className="space-y-3">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-50">
                  <BookMarked className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-base font-medium text-gray-900">自分だけの単語帳</h3>
                <p className="text-xs leading-relaxed text-gray-600">
                  覚えたい単語を保存して、いつでも復習できます
                </p>
              </div>
            </section>

            {/* アクションボタン */}
            <div className="pt-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-4 text-base font-medium text-white shadow-lg transition hover:bg-gray-800 active:scale-95"
              >
                はじめる
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ログイン済み：メイン画面
  const userEmail = session.user.email || "";

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900">
      <Header />
      <main className="flex flex-1 flex-col items-center px-6 pt-24 pb-24">
        <header className="w-full max-w-md text-center">
          <p className="text-[11px] tracking-[0.35em] text-gray-400">
            古文解析アプリ
          </p>
          <h1 className="mt-3 text-3xl tracking-[0.4em] text-gray-900">
            昔の人
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-gray-600">
            古のことばを、そっと現代へ。
            <br />
            カメラやテキストから、やさしく解析します。
          </p>

          {/* ユーザー情報とログアウトボタン */}
          <div className="mt-6 flex items-center justify-center gap-3">
            <p className="text-sm text-gray-700">
              ようこそ、<span className="font-medium">{userEmail}</span>さん
            </p>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 transition hover:bg-gray-50 active:scale-95"
            >
              <LogOut className="h-3.5 w-3.5" />
              ログアウト
            </button>
          </div>
        </header>

        <section className="mt-12 w-full max-w-md space-y-4">
          <Link
            href="/scan"
            className="flex w-full items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-amber-50 shadow-sm">
                <Camera className="h-5 w-5" />
              </span>
              <div className="text-left">
                <p className="text-base tracking-[0.12em] text-gray-900">
                  カメラで撮影
                </p>
                <p className="mt-1 text-[11px] text-amber-900/80">
                  古文の紙面や教科書を写して、そのまま解析
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/input"
            className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white/90 px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-900 text-gray-50 shadow-sm">
                <Type className="h-5 w-5" />
              </span>
              <div className="text-left">
                <p className="text-base tracking-[0.12em] text-gray-900">
                  テキスト入力
                </p>
                <p className="mt-1 text-[11px] text-gray-500">
                  手元の古文を書き写して、丁寧に読み解く
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/test"
            className="flex w-full items-center justify-between rounded-2xl border border-blue-200 bg-blue-50/80 px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500 text-blue-50 shadow-sm">
                <BookOpen className="h-5 w-5" />
              </span>
              <div className="text-left">
                <p className="text-base tracking-[0.12em] text-gray-900">
                  単語テスト
                </p>
                <p className="mt-1 text-[11px] text-blue-900/80">
                  単語帳の単語でテストに挑戦
                </p>
              </div>
            </div>
          </Link>
        </section>
      </main>

      <Navigation />
    </div>
  );
}
