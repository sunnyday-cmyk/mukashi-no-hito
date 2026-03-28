"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RotateCcw, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { fetchAllWordsForWordbook } from "@/lib/fetchAllWords";
import { calcNextReview, gradeFromFeedback } from "@/lib/srs";
import type { Word, WordProgress } from "@/types";

export default function StudyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [words, setWords] = useState<Word[]>([]);
  const [progressMap, setProgressMap] = useState<Map<string, WordProgress>>(new Map());
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState({ good: 0, again: 0 });

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }

    const [wds, { data: prog }] = await Promise.all([
      fetchAllWordsForWordbook(supabase, id).catch((e) => {
        console.error("[study] fetchAllWordsForWordbook:", e);
        return [] as Word[];
      }),
      supabase.from("word_progress").select("*").eq("user_id", session.user.id),
    ]);

    if (!wds.length) {
      setWords([]);
      setLoading(false);
      return;
    }
    setWords(wds);

    const map = new Map<string, WordProgress>();
    (prog || []).forEach((p: WordProgress) => map.set(p.word_id, p));
    setProgressMap(map);
    setLoading(false);
  };

  const currentWord = words[index];
  const isFinished = index >= words.length;

  const handleFeedback = async (feedback: "again" | "good") => {
    if (!currentWord) return;
    const grade = gradeFromFeedback(feedback === "again" ? "again" : "good");
    const prog = progressMap.get(currentWord.id) ?? null;
    const result = calcNextReview(
      prog ? { ease_factor: prog.ease_factor, interval_days: prog.interval_days, repetitions: prog.repetitions } : null,
      grade
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from("word_progress").upsert({
        user_id: session.user.id,
        word_id: currentWord.id,
        ease_factor: result.easeFactor,
        interval_days: result.intervalDays,
        repetitions: result.repetitions,
        next_review: result.nextReview.toISOString(),
        is_mastered: result.isMastered,
        last_grade: grade,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,word_id" });
    }

    setSessionStats((prev) => ({
      good: feedback === "good" ? prev.good + 1 : prev.good,
      again: feedback === "again" ? prev.again + 1 : prev.again,
    }));
    setFlipped(false);
    setTimeout(() => setIndex((i) => i + 1), 150);
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: "var(--color-accent)" }} />
    </div>
  );

  if (isFinished) return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center" style={{ background: "var(--color-surface)" }}>
      <div className="text-6xl mb-4">🎉</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">セッション完了！</h2>
      <p className="text-gray-600 mb-6">{words.length}枚学習しました</p>
      <div className="flex gap-4 mb-8">
        <div className="rounded-2xl bg-green-50 px-6 py-4 text-center">
          <p className="text-3xl font-bold text-green-600">{sessionStats.good}</p>
          <p className="text-sm text-green-600">覚えた</p>
        </div>
        <div className="rounded-2xl bg-red-50 px-6 py-4 text-center">
          <p className="text-3xl font-bold text-red-500">{sessionStats.again}</p>
          <p className="text-sm text-red-500">もう一度</p>
        </div>
      </div>
      <div className="flex gap-3 w-full max-w-xs">
        <button onClick={() => { setIndex(0); setFlipped(false); setSessionStats({ good: 0, again: 0 }); }}
          className="flex-1 flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-medium"
          style={{ borderColor: "var(--color-border)" }}>
          <RotateCcw className="h-4 w-4" /> もう一度
        </button>
        <button onClick={() => router.push(`/wordbook/${id}`)}
          className="flex-1 rounded-2xl py-3 text-sm font-semibold text-white"
          style={{ background: "var(--color-accent)" }}>
          完了
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--color-surface)" }}>
      <header style={{ background: "var(--color-primary)" }} className="safe-area-top px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ background: "var(--color-accent-light)", width: `${(index / words.length) * 100}%` }}
                />
              </div>
              <span className="text-xs text-white/60 flex-shrink-0">{index + 1}/{words.length}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center p-6">
        {/* フラッシュカード */}
        <div className="flip-card w-full max-w-sm" style={{ height: "280px" }}>
          <div className={`flip-card-inner h-full ${flipped ? "flipped" : ""}`}>
            {/* 表 */}
            <div
              onClick={() => setFlipped(true)}
              className="flip-card-front absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-white shadow-lg p-8 cursor-pointer active:scale-[0.98] transition"
              style={{ border: "1px solid var(--color-border)" }}
            >
              <p className="text-xs text-gray-400 mb-4">タップして裏を見る</p>
              <p className="font-serif-ja text-3xl font-bold text-center leading-relaxed"
                style={{ color: "var(--color-primary)" }}>
                {currentWord?.front}
              </p>
              {currentWord?.reading && (
                <p className="mt-3 text-base text-gray-400">{currentWord.reading}</p>
              )}
              {currentWord?.part_of_speech && (
                <span className="mt-3 rounded-full px-3 py-1 text-xs text-white"
                  style={{ background: currentWord.color_code || "var(--color-accent)" }}>
                  {currentWord.part_of_speech}
                </span>
              )}
            </div>
            {/* 裏 */}
            <div
              className="flip-card-back absolute inset-0 flex flex-col items-center justify-center rounded-3xl shadow-lg p-8"
              style={{ background: "var(--color-primary)", border: "1px solid var(--color-border)" }}
            >
              <p className="text-xl font-bold text-white text-center leading-relaxed">
                {currentWord?.back}
              </p>
              {currentWord?.grammar_note && (
                <div className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-center">
                  <p className="text-xs text-white/70">{currentWord.grammar_note}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* フィードバックボタン */}
        {flipped && (
          <div className="flex gap-4 mt-8 w-full max-w-xs animate-fade-in">
            <button
              onClick={() => handleFeedback("again")}
              className="flex-1 flex flex-col items-center gap-1.5 rounded-2xl border-2 py-4 transition active:scale-95"
              style={{ borderColor: "#ef4444" }}
            >
              <XCircle className="h-7 w-7 text-red-500" />
              <span className="text-sm font-medium text-red-500">もう一度</span>
            </button>
            <button
              onClick={() => handleFeedback("good")}
              className="flex-1 flex flex-col items-center gap-1.5 rounded-2xl border-2 py-4 transition active:scale-95"
              style={{ borderColor: "#22c55e" }}
            >
              <CheckCircle className="h-7 w-7 text-green-500" />
              <span className="text-sm font-medium text-green-500">覚えた！</span>
            </button>
          </div>
        )}

        {!flipped && (
          <p className="mt-6 text-sm text-gray-400">カードをタップすると答えが見えます</p>
        )}
      </main>
    </div>
  );
}
