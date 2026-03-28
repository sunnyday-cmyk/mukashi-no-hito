"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { fetchAllWordsForWordbook } from "@/lib/fetchAllWords";
import type { Word } from "@/types";

type Mode = "meaning" | "front";
interface Question {
  word: Word;
  options: string[];
  correct: string;
  mode: Mode;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [words, setWords] = useState<Word[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<{ correct: number; wrong: number; wrongWords: Word[] }>({ correct: 0, wrong: 0, wrongWords: [] });
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("meaning");
  const [count, setCount] = useState(10);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const w = await fetchAllWordsForWordbook(supabase, id);
        if (!cancelled) setWords(w);
      } catch (e) {
        console.error("[test] fetchAllWordsForWordbook:", e);
        if (!cancelled) setWords([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const buildQuestions = () => {
    if (words.length < 4) { alert("テストには4語以上必要です"); return; }
    const selected = shuffle(words).slice(0, Math.min(count, words.length));
    const qs: Question[] = selected.map((word) => {
      const correct = mode === "meaning" ? word.back : word.front;
      const others = shuffle(
        words.filter((w) => w.id !== word.id).map((w) => mode === "meaning" ? w.back : w.front)
      ).slice(0, 3);
      return { word, correct, options: shuffle([correct, ...others]), mode };
    });
    setQuestions(qs);
    setIndex(0);
    setSelected(null);
    setResults({ correct: 0, wrong: 0, wrongWords: [] });
    setStarted(true);
  };

  const handleSelect = (opt: string) => {
    if (selected) return;
    setSelected(opt);
    const q = questions[index];
    const isCorrect = opt === q.correct;
    setResults((prev) => ({
      correct: isCorrect ? prev.correct + 1 : prev.correct,
      wrong: isCorrect ? prev.wrong : prev.wrong + 1,
      wrongWords: isCorrect ? prev.wrongWords : [...prev.wrongWords, q.word],
    }));
    setTimeout(async () => {
      if (index + 1 >= questions.length) {
        // 結果保存
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const accuracy = ((isCorrect ? results.correct + 1 : results.correct) / questions.length) * 100;
          await supabase.from("quiz_results").insert({
            user_id: session.user.id,
            wordbook_id: id,
            score: isCorrect ? results.correct + 1 : results.correct,
            total: questions.length,
            accuracy: Math.round(accuracy * 100) / 100,
          });
          // ストリーク更新
          await supabase.from("profiles").update({ last_studied_at: new Date().toISOString() }).eq("id", session.user.id);
        }
      }
      setSelected(null);
      setIndex((i) => i + 1);
    }, 800);
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: "var(--color-accent)" }} />
    </div>
  );

  // 設定画面
  if (!started) return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--color-surface)" }}>
      <header style={{ background: "var(--color-primary)" }} className="safe-area-top px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <h1 className="text-lg font-bold text-white">テスト設定</h1>
        </div>
      </header>
      <main className="p-4 space-y-5">
        <section>
          <p className="text-xs font-medium text-gray-500 mb-2">テストモード</p>
          <div className="space-y-2">
            {([["meaning", "意味を答える（単語→意味）"], ["front", "単語を答える（意味→単語）"]] as [Mode, string][]).map(([m, label]) => (
              <button key={m} onClick={() => setMode(m)}
                className="w-full flex items-center justify-between rounded-2xl bg-white p-4"
                style={{ border: `2px solid ${mode === m ? "var(--color-accent)" : "var(--color-border)"}` }}>
                <span className="text-sm font-medium text-gray-900">{label}</span>
                {mode === m && <div className="h-4 w-4 rounded-full" style={{ background: "var(--color-accent)" }} />}
              </button>
            ))}
          </div>
        </section>
        <section>
          <p className="text-xs font-medium text-gray-500 mb-2">問題数</p>
          <div className="grid grid-cols-3 gap-2">
            {[10, 20, 30].map((c) => (
              <button key={c} onClick={() => setCount(c)}
                className="rounded-2xl py-3 text-sm font-semibold transition"
                style={count === c
                  ? { background: "var(--color-accent)", color: "white" }
                  : { background: "white", color: "#374151", border: "1px solid var(--color-border)" }}>
                {c}問
              </button>
            ))}
          </div>
        </section>
        <p className="text-xs text-gray-400">登録済み: {words.length}語</p>
        <button onClick={buildQuestions} disabled={words.length < 4}
          className="w-full rounded-2xl py-4 text-base font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--color-accent)" }}>
          テスト開始 ({Math.min(count, words.length)}問)
        </button>
      </main>
    </div>
  );

  // 結果画面
  if (index >= questions.length) {
    const total = questions.length;
    const accuracy = Math.round((results.correct / total) * 100);
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6" style={{ background: "var(--color-surface)" }}>
        <div className="text-5xl mb-4">{accuracy >= 80 ? "🏆" : accuracy >= 60 ? "👍" : "📖"}</div>
        <h2 className="text-2xl font-bold text-gray-900">{accuracy}%</h2>
        <p className="text-gray-500 mt-1 mb-6">{total}問中 {results.correct}問正解</p>
        <div className="flex gap-4 mb-6">
          <div className="rounded-2xl bg-green-50 px-6 py-4 text-center">
            <p className="text-3xl font-bold text-green-600">{results.correct}</p>
            <p className="text-xs text-green-600">正解</p>
          </div>
          <div className="rounded-2xl bg-red-50 px-6 py-4 text-center">
            <p className="text-3xl font-bold text-red-500">{results.wrong}</p>
            <p className="text-xs text-red-500">不正解</p>
          </div>
        </div>
        {results.wrongWords.length > 0 && (
          <div className="w-full max-w-sm mb-6">
            <p className="text-sm font-medium text-gray-700 mb-2">間違えた単語</p>
            <div className="space-y-1">
              {results.wrongWords.map((w) => (
                <div key={w.id} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2">
                  <span className="font-medium text-gray-900">{w.front}</span>
                  <span className="text-xs text-gray-400">→</span>
                  <span className="text-sm text-gray-600">{w.back}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-3 w-full max-w-sm">
          <button onClick={buildQuestions}
            className="flex-1 rounded-2xl border py-3 text-sm font-medium"
            style={{ borderColor: "var(--color-border)" }}>
            もう一度
          </button>
          <button onClick={() => router.push(`/wordbook/${id}`)}
            className="flex-1 rounded-2xl py-3 text-sm font-semibold text-white"
            style={{ background: "var(--color-accent)" }}>
            終了
          </button>
        </div>
      </div>
    );
  }

  const q = questions[index];
  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--color-surface)" }}>
      <header style={{ background: "var(--color-primary)" }} className="safe-area-top px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ background: "var(--color-accent-light)", width: `${(index / questions.length) * 100}%` }} />
              </div>
              <span className="text-xs text-white/60">{index + 1}/{questions.length}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col p-4">
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-sm"
            style={{ border: "1px solid var(--color-border)" }}>
            <p className="text-xs text-gray-400 mb-3">
              {mode === "meaning" ? "この単語の意味は？" : "この意味の単語は？"}
            </p>
            <p className="font-serif-ja text-3xl font-bold" style={{ color: "var(--color-primary)" }}>
              {mode === "meaning" ? q.word.front : q.word.back}
            </p>
            {mode === "meaning" && q.word.reading && (
              <p className="mt-2 text-gray-400 text-sm">{q.word.reading}</p>
            )}
          </div>

          <div className="w-full max-w-sm space-y-2.5">
            {q.options.map((opt) => {
              const isSelected = selected === opt;
              const isCorrect = opt === q.correct;
              let style: React.CSSProperties = { background: "white", borderColor: "var(--color-border)" };
              let textColor = "text-gray-900";
              if (selected) {
                if (isCorrect) { style = { background: "#f0fdf4", borderColor: "#22c55e" }; textColor = "text-green-700"; }
                else if (isSelected && !isCorrect) { style = { background: "#fef2f2", borderColor: "#ef4444" }; textColor = "text-red-600"; }
              }
              return (
                <button key={opt} onClick={() => handleSelect(opt)} disabled={!!selected}
                  className={`w-full flex items-center justify-between rounded-2xl border-2 px-4 py-3.5 text-sm font-medium text-left transition active:scale-[0.98] ${textColor}`}
                  style={style}>
                  <span>{opt}</span>
                  {selected && isCorrect && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                  {selected && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-red-500" />}
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
