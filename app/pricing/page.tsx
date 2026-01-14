"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, ArrowRight, Loader2, CheckCircle, XCircle } from "lucide-react";
import Navigation from "@/components/Navigation";
import { supabase } from "@/lib/supabaseClient";

function PricingContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [canceled, setCanceled] = useState(false);

  // デバッグ: Stripe環境変数の確認（クライアント側）
  useEffect(() => {
    console.log("=== Stripe Client-Side Environment Variables ===");
    console.log("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:");
    console.log("  - Exists:", !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
    console.log("  - Prefix:", process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.substring(0, 7) || "undefined");
    console.log("  - Length:", process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.length || 0);
    console.log("NEXT_PUBLIC_STRIPE_PRICE_ID:");
    console.log("  - Exists:", !!process.env.NEXT_PUBLIC_STRIPE_PRICE_ID);
    console.log("  - Value:", process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || "undefined");
    console.log("  - Length:", process.env.NEXT_PUBLIC_STRIPE_PRICE_ID?.length || 0);
    console.log("================================================");
    
    // 注：このプロジェクトはサーバー側のみでStripeを使用するため、
    // NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEYは実際には不要です
  }, []);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setSuccess(true);
    }
    if (searchParams.get("canceled") === "true") {
      setCanceled(true);
    }
  }, [searchParams]);

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      // セッションを確認
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("ログインが必要です。");
        setLoading(false);
        return;
      }

      // Stripe Checkoutセッションを作成
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "決済セッションの作成に失敗しました");
      }

      const { url } = await response.json();

      if (url) {
        // Stripe Checkoutページにリダイレクト
        window.location.href = url;
      } else {
        throw new Error("決済URLが取得できませんでした");
      }
    } catch (e) {
      console.error("決済エラー:", e);
      setError(
        e instanceof Error ? e.message : "決済処理中にエラーが発生しました"
      );
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900">
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-20 py-12 pb-24">
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="font-serif text-3xl font-medium text-gray-900">
              料金プラン
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              シンプルでわかりやすい料金設定
            </p>
          </div>

          {/* 成功メッセージ */}
          {success && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">
                    登録が完了しました！
                  </p>
                  <p className="mt-1 text-xs text-green-700">
                    プレミアムプランをご利用いただけます。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* キャンセルメッセージ */}
          {canceled && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-gray-600" />
                <p className="text-sm text-gray-700">
                  決済がキャンセルされました。
                </p>
              </div>
            </div>
          )}

          <div className="rounded-2xl border-2 border-gray-200 bg-white p-8 shadow-lg">
            <div className="text-center">
              <div className="mb-4">
                <span className="text-4xl font-bold text-gray-900">
                  月額 500円
                </span>
                <span className="ml-2 text-lg text-gray-600">（税込）</span>
              </div>
              <p className="mb-6 text-sm text-gray-600">
                すべての機能が使い放題
              </p>

              <ul className="mb-8 space-y-3 text-left">
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                  <span className="text-sm text-gray-700">
                    無制限の古文解析
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                  <span className="text-sm text-gray-700">
                    OCR文字認識機能
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                  <span className="text-sm text-gray-700">
                    AIによる詳細解析
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                  <span className="text-sm text-gray-700">
                    単語帳・履歴機能
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                  <span className="text-sm text-gray-700">
                    単語テスト機能
                  </span>
                </li>
              </ul>

              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-base font-medium text-white transition hover:bg-gray-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    処理中...
                  </>
                ) : (
                  <>
                    今すぐ始める
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="mb-2 text-xs leading-relaxed text-gray-600">
                  <Link
                    href="/tokushoho"
                    className="text-blue-600 underline hover:text-blue-700"
                  >
                    特定商取引法に基づく表記
                  </Link>
                  をご確認の上、お申し込みください。
                </p>
                <p className="text-xs text-gray-500">
                  解約はいつでも可能です。解約後は現在の請求期間終了までご利用いただけます。
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Navigation />
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <p className="text-sm text-gray-600">読み込み中...</p>
        </div>
      </div>
    }>
      <PricingContent />
    </Suspense>
  );
}

