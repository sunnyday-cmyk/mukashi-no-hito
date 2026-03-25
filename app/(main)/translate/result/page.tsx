"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Languages, Lightbulb, ChevronDown, ChevronUp, CheckCircle2, Plus, Share2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { insertWordbook, insertWordbook as insertWord } from "@/lib/supabase-db";
import type { Subject } from "@/types";
import { SUBJECT_LABELS } from "@/types";

interface WordItem {
  surface: string;
  reading: string;
  partOfSpeech: string;
  inflectionType: string;
  inflectionForm: string;
  meaning: string;
  auxiliaryMeaning: string;
  grammarNote: string;
  importance: number;
  colorCode: string;
}

interface AnalysisData {
  subject?: Subject;
  correctedText: string;
  kundokuText?: string;
  words: WordItem[];
  translation: string;
  explanation: string;
  grammar_points?: { text: string; explanation: string }[];
  credits?: number;
  isSubscribed?: boolean;
}

function ResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [result, setResult] = useState<AnalysisData | null>(null);
  const [originalText, setOriginalText] = useState("");
  const [subject, setSubject] = useState<Subject>("japanese_classical");
  const [expandedWords, setExpandedWords] = useState<Set<number>>(new Set());
  const [addedWords, setAddedWords] = useState<Set<string>>(new Set());
  const [addingAll, setAddingAll] = useState(false);
  const [checkedWords, setCheckedWords] = useState<Set<string>>(new Set());
  const [showWordSelect, setShowWordSelect] = useState(false);

  useEffect(() => {
    const rp = searchParams.get("result");
    const tp = searchParams.get("text");
    const sp = (searchParams.get("subject") as Subject) || "japanese_classical";
    if (!rp) { router.replace("/translate"); return; }
    try {
      setResult(JSON.parse(rp));
      setOriginalText(tp || "");
      setSubject(sp);
    } catch { router.replace("/translate"); }
  }, [searchParams, router]);

  const toggleWord = (i: number) => {
    const s = new Set(expandedWords);
    s.has(i) ? s.delete(i) : s.add(i);
    setExpandedWords(s);
  };

  const handleAddWord = async (word: WordItem) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { alert("ログインが必要です"); return; }

    try {
      // 単語帳に直接追加（デフォルト単語帳がなければ作成）
      const { data: wbs } = await supabase
        .from("wordbooks")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("title", "マイ単語帳")
        .limit(1);

      let wordbookId: string;
      if (wbs && wbs.length > 0) {
        wordbookId = wbs[0].id;
      } else {
        const { data: newWb } = await supabase
          .from("wordbooks")
          .insert({ user_id: session.user.id, title: "マイ単語帳", subject, is_public: false })
          .select("id")
          .single();
        wordbookId = newWb!.id;
      }

      await supabase.from("words").insert({
        wordbook_id: wordbookId,
        front: word.surface,
        reading: word.reading,
        back: word.meaning,
        part_of_speech: word.partOfSpeech,
        inflection_type: word.inflectionType || null,
        inflection_form: word.inflectionForm || null,
        auxiliary_meaning: word.auxiliaryMeaning || null,
        grammar_note: word.grammarNote || null,
        color_code: word.colorCode,
      });

      setAddedWords((prev) => new Set(prev).add(word.surface));
      setTimeout(() => setAddedWords((prev) => {
        const s = new Set(prev); s.delete(word.surface); return s;
      }), 2000);
    } catch (e) {
      console.error(e);
      alert("追加に失敗しました");
    }
  };

  const handleAddSelectedWords = async () => {
    if (checkedWords.size === 0) return;
    setAddingAll(true);
    const wordsToAdd = result?.words.filter((w) => checkedWords.has(w.surface)) ?? [];
    for (const w of wordsToAdd) await handleAddWord(w);
    setCheckedWords(new Set());
    setShowWordSelect(false);
    setAddingAll(false);
  };

  const handlePost = async () => {
    if (!result) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { alert("ログインが必要です"); return; }
    try {
      await supabase.from("posts").insert({
        user_id: session.user.id,
        post_type: "study_note",
        subject,
        original_text: originalText,
        translation: result.translation,
        is_public: true,
      });
      alert("投稿しました！");
    } catch (e) {
      alert("投稿に失敗しました");
    }
  };

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: "var(--color-accent)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--color-surface)" }}>
      {/* ヘッダー */}
      <header
        className="sticky top-0 z-40 border-b safe-area-top"
        style={{ background: "var(--color-primary)", borderColor: "transparent" }}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-white">解析結果</h1>
            <p className="text-xs text-white/60">{SUBJECT_LABELS[subject]}</p>
          </div>
          <button onClick={handlePost}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-white bg-white/20">
            <Share2 className="h-3.5 w-3.5" /> 投稿
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-4 space-y-4">
        {/* 補正済み本文 / 書き下し文 */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2" style={{ color: "var(--color-primary)" }}>
            <BookOpen className="h-4 w-4" />
            <h2 className="text-sm font-semibold">
              {subject === "chinese_classical" ? "書き下し文" : "本文"}
            </h2>
          </div>
          <p className="font-serif-ja leading-loose text-gray-900 whitespace-pre-wrap text-sm">
            {subject === "chinese_classical" ? (result.kundokuText || result.correctedText) : result.correctedText}
          </p>
        </section>

        {/* 現代語訳 */}
        <section className="rounded-2xl p-5 shadow-sm" style={{ background: "#eef2ff" }}>
          <div className="mb-2 flex items-center gap-2" style={{ color: "#4338ca" }}>
            <Languages className="h-4 w-4" />
            <h2 className="text-sm font-semibold">
              {subject === "english" ? "日本語訳" : "現代語訳"}
            </h2>
          </div>
          <p className="text-sm text-gray-800 leading-relaxed">{result.translation}</p>
        </section>

        {/* 解説 */}
        <section className="rounded-2xl p-5 shadow-sm" style={{ background: "#fdf4ff" }}>
          <div className="mb-2 flex items-center gap-2" style={{ color: "#7e22ce" }}>
            <Lightbulb className="h-4 w-4" />
            <h2 className="text-sm font-semibold">重要ポイント</h2>
          </div>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{result.explanation}</p>
        </section>

        {/* 単語一覧 */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4" style={{ color: "var(--color-accent)" }} />
            <h2 className="text-sm font-semibold text-gray-900 flex-1">品詞分解</h2>
            <span className="text-xs text-gray-400">{result.words.length}語</span>
            <button
              onClick={() => setShowWordSelect(!showWordSelect)}
              className="rounded-full px-3 py-1 text-xs font-medium text-white"
              style={{ background: "var(--color-accent)" }}
            >
              単語帳に追加
            </button>
          </div>

          {showWordSelect && (
            <div className="mb-3 rounded-xl border p-3" style={{ borderColor: "var(--color-border)" }}>
              <p className="text-xs text-gray-500 mb-2">追加する単語を選んでください</p>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {result.words.map((w) => (
                  <button key={w.surface}
                    onClick={() => setCheckedWords((prev) => {
                      const s = new Set(prev); s.has(w.surface) ? s.delete(w.surface) : s.add(w.surface); return s;
                    })}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    <div
                      className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border"
                      style={checkedWords.has(w.surface)
                        ? { background: "var(--color-accent)", borderColor: "var(--color-accent)" }
                        : { borderColor: "#d1d5db" }}
                    >
                      {checkedWords.has(w.surface) && <CheckCircle2 className="h-4 w-4 text-white" />}
                    </div>
                    <span className="font-medium text-gray-900">{w.surface}</span>
                    <span className="text-xs text-gray-500">{w.reading}</span>
                    <span className="ml-auto text-xs text-gray-400">{w.meaning.slice(0, 12)}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={handleAddSelectedWords}
                disabled={checkedWords.size === 0 || addingAll}
                className="mt-2 w-full rounded-xl py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--color-accent)" }}
              >
                {checkedWords.size}語を単語帳に追加
              </button>
            </div>
          )}

          <div className="space-y-2">
            {result.words.map((word, i) => {
              const expanded = expandedWords.has(i);
              const hasDetail = word.inflectionType || word.inflectionForm || word.auxiliaryMeaning || word.grammarNote;
              return (
                <div key={i} className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)" }}>
                  <button
                    onClick={() => hasDetail && toggleWord(i)}
                    className="w-full flex items-start gap-3 p-3 text-left hover:bg-gray-50 transition"
                    disabled={!hasDetail}
                  >
                    <div
                      className="flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm"
                      style={{ backgroundColor: word.colorCode || "var(--color-accent)" }}
                    >
                      {word.surface.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-gray-900">{word.surface}</span>
                        <span className="text-xs text-gray-400">{word.reading}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {word.partOfSpeech}
                        </span>
                        {word.inflectionForm && (
                          <span className="inline-block rounded-md px-2 py-0.5 text-xs text-red-700" style={{ background: "#fee2e2" }}>
                            {word.inflectionForm}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{word.meaning}</p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAddWord(word); }}
                        className="flex h-7 w-7 items-center justify-center rounded-full transition"
                        style={addedWords.has(word.surface)
                          ? { background: "#dcfce7", color: "#16a34a" }
                          : { background: "var(--color-surface)", color: "var(--color-accent)" }}
                        aria-label="単語帳に追加"
                      >
                        {addedWords.has(word.surface)
                          ? <CheckCircle2 className="h-4 w-4" />
                          : <Plus className="h-4 w-4" />}
                      </button>
                      {hasDetail && (
                        expanded
                          ? <ChevronUp className="h-4 w-4 text-gray-400" />
                          : <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </button>
                  {expanded && hasDetail && (
                    <div className="border-t px-4 py-3 space-y-2 bg-gray-50" style={{ borderColor: "var(--color-border)" }}>
                      {word.inflectionType && (
                        <div>
                          <p className="text-xs font-medium text-gray-400">活用の種類</p>
                          <p className="text-sm text-gray-800 mt-0.5">{word.inflectionType}</p>
                        </div>
                      )}
                      {word.auxiliaryMeaning && (
                        <div>
                          <p className="text-xs font-medium text-gray-400">助動詞の意味</p>
                          <p className="text-sm text-red-700 mt-0.5">{word.auxiliaryMeaning}</p>
                        </div>
                      )}
                      {word.grammarNote && (
                        <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2">
                          <p className="text-xs font-medium text-yellow-700">📝 入試重要ポイント</p>
                          <p className="text-sm text-yellow-900 mt-0.5">{word.grammarNote}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: "var(--color-accent)" }} />
      </div>
    }>
      <ResultContent />
    </Suspense>
  );
}
