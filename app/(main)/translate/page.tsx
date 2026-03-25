"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Send, Loader2, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { insertHistory } from "@/lib/supabase-db";
import { SUBJECT_LABELS } from "@/types";
import type { Subject } from "@/types";
import LoadingSpinner from "@/components/LoadingSpinner";

const SUBJECTS: Subject[] = ["japanese_classical", "chinese_classical", "english"];

export default function TranslatePage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [subject, setSubject] = useState<Subject>("japanese_classical");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!text.trim()) { setError("テキストを入力してください"); return; }
    setAnalyzing(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ text: text.trim(), subject }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `解析に失敗しました (${res.status})`);
      }

      const result = await res.json();

      // 履歴保存
      try {
        await insertHistory(supabase, session.user.id, {
          originalText: text.trim(),
          translation: result.translation || "",
          resultJson: JSON.stringify(result),
        });
      } catch (e) {
        console.error("履歴保存失敗:", e);
      }

      const params = new URLSearchParams({
        text: text.trim(),
        subject,
        result: JSON.stringify(result),
      });
      router.push(`/translate/result?${params.toString()}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
      setAnalyzing(false);
    }
  };

  if (analyzing) return <LoadingSpinner message="AIが解析しています..." />;

  return (
    <div className="flex min-h-screen flex-col">
      {/* ヘッダー */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 safe-area-top"
        style={{ background: "var(--color-primary)" }}
      >
        <h1 className="text-lg font-bold text-white">AI翻訳</h1>
        <button
          onClick={() => router.push("/translate/camera")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
          aria-label="カメラで撮影"
        >
          <Camera className="h-5 w-5 text-white" />
        </button>
      </header>

      <main className="flex flex-1 flex-col p-4 gap-4">
        {/* 科目選択 */}
        <div className="flex gap-2">
          {SUBJECTS.map((s) => (
            <button
              key={s}
              onClick={() => setSubject(s)}
              className="flex-1 rounded-xl py-2 text-sm font-medium transition active:scale-95"
              style={
                subject === s
                  ? { background: "var(--color-accent)", color: "white" }
                  : { background: "white", color: "var(--color-primary)", border: "1px solid var(--color-border)" }
              }
            >
              {SUBJECT_LABELS[s]}
            </button>
          ))}
        </div>

        {/* エラー */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* テキストエリア */}
        <div className="relative flex-1">
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setError(null); }}
            placeholder={
              subject === "japanese_classical" ? "ここに古文を入力してください…\n例: 春はあけぼの。やうやう白くなりゆく山ぎは"
              : subject === "chinese_classical" ? "漢文を入力してください…\n例: 春眠不覚暁、処処聞啼鳥"
              : "Enter English text here...\nExample: The quick brown fox jumps over the lazy dog."
            }
            className="h-full min-h-[280px] w-full resize-none rounded-2xl border p-4 text-sm text-gray-900 focus:outline-none"
            style={{ borderColor: "var(--color-border)", background: "white" }}
          />
          {text && (
            <button
              onClick={() => setText("")}
              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-400"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400 px-1">
          <span>{text.length}文字</span>
        </div>

        {/* 解析ボタン */}
        <button
          onClick={handleAnalyze}
          disabled={!text.trim() || analyzing}
          className="flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-semibold text-white shadow-lg transition active:scale-95 disabled:opacity-50"
          style={{ background: "var(--color-accent)" }}
        >
          {analyzing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          {subject === "english" ? "Analyze" : "解析する"}
        </button>

        {/* カメラへ誘導 */}
        <button
          onClick={() => router.push("/translate/camera")}
          className="flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-medium transition active:scale-95"
          style={{ borderColor: "var(--color-accent)", color: "var(--color-accent)" }}
        >
          <Camera className="h-4 w-4" />
          カメラで撮影する
        </button>
      </main>
    </div>
  );
}
