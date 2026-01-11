"use client";

import { useState } from "react";
import { X, Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabaseClient";
import { useProfile } from "@/hooks/useProfile";

export default function InputPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refetch: refetchProfile } = useProfile();

  const handleClear = () => {
    if (text.trim() === "" || confirm("入力をクリアしますか？")) {
      setText("");
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError("古文を入力してください。");
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      // 認証トークンを取得
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("ログインが必要です。");
        setAnalyzing(false);
        router.push("/login");
        return;
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ text: text.trim() }),
      });

      if (!response.ok) {
        let errorMessage = "解析に失敗しました";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // JSONパースに失敗した場合
          errorMessage = `サーバーエラー (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // クレジット情報を更新（解析が完了したため）
      await refetchProfile();

      // 解析結果をクエリパラメータとして結果画面に渡す
      const params = new URLSearchParams({
        text: text.trim(),
        result: JSON.stringify(result),
      });
      router.push(`/result?${params.toString()}`);
    } catch (e) {
      console.error("解析エラー:", e);
      let errorMessage = "古文の解析中にエラーが発生しました。もう一度お試しください。";
      
      if (e instanceof Error) {
        errorMessage = e.message;
      } else if (typeof e === "string") {
        errorMessage = e;
      }
      
      setError(errorMessage);
      setAnalyzing(false);
    }
  };

  const characterCount = text.length;

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900">
      <Header />

      <main className="flex flex-1 flex-col px-5 py-6 pb-24">
        <div className="flex flex-1 flex-col">
          {/* 説明文 */}
          <div className="mb-4 text-center">
            <p className="text-sm text-gray-600">
              古文を入力して、解析を開始してください
            </p>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* テキストエリア */}
          <div className="relative flex-1">
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
              }}
              placeholder="ここに古文を入力してください..."
              className="h-full min-h-[300px] w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-base leading-relaxed text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-200"
              disabled={analyzing}
            />
          </div>

          {/* 文字数カウント */}
          <div className="mt-3 flex items-center justify-end">
            <p className="text-xs text-gray-500">
              <span className={characterCount > 0 ? "text-gray-700 font-medium" : ""}>
                {characterCount}
              </span>
              <span className="ml-1">文字</span>
            </p>
          </div>

          {/* ボタン群 */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={handleClear}
              disabled={analyzing || text.trim() === ""}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              入力をクリア
            </button>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analyzing || text.trim() === ""}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  解析中...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  この文章を解析する
                </>
              )}
            </button>
          </div>
        </div>
      </main>
      <Navigation />
    </div>
  );
}

