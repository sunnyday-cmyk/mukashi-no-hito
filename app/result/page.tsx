"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Languages, Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
import Navigation from "@/components/Navigation";
import type { AnalysisResult, Word } from "@/app/types/analysis";

function ResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [originalText, setOriginalText] = useState("");
  const [expandedWords, setExpandedWords] = useState<Set<number>>(new Set());

  useEffect(() => {
    const resultParam = searchParams.get("result");
    const textParam = searchParams.get("text");

    if (!resultParam) {
      router.push("/");
      return;
    }

    try {
      const parsedResult: AnalysisResult = JSON.parse(resultParam);
      setResult(parsedResult);
      setOriginalText(textParam || "");
    } catch (e) {
      console.error("解析結果のパースに失敗:", e);
      router.push("/");
    }
  }, [searchParams, router]);

  const toggleWordExpansion = (index: number) => {
    const newExpanded = new Set(expandedWords);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedWords(newExpanded);
  };

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
          <p className="text-sm text-gray-600">解析結果を読み込んでいます...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white pb-24">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 transition hover:bg-gray-200 active:scale-95"
              aria-label="戻る"
            >
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </button>
            <h1 className="text-lg font-medium text-gray-900">解析結果</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        {/* 補正済み本文 */}
        <section className="rounded-2xl bg-white p-5 shadow-sm border border-gray-200">
          <div className="mb-3 flex items-center gap-2 text-amber-900">
            <BookOpen className="h-5 w-5" />
            <h2 className="text-base font-medium">補正済み本文</h2>
          </div>
          <p className="leading-relaxed text-gray-900 whitespace-pre-wrap font-serif text-base">
            {result.correctedText}
          </p>
        </section>

        {/* 現代語訳 */}
        <section className="rounded-2xl bg-blue-50 p-5 shadow-sm border border-blue-200">
          <div className="mb-3 flex items-center gap-2 text-blue-900">
            <Languages className="h-5 w-5" />
            <h2 className="text-base font-medium">現代語訳</h2>
          </div>
          <p className="leading-relaxed text-gray-800 text-sm">
            {result.translation}
          </p>
        </section>

        {/* 文法解説 */}
        <section className="rounded-2xl bg-purple-50 p-5 shadow-sm border border-purple-200">
          <div className="mb-3 flex items-center gap-2 text-purple-900">
            <Lightbulb className="h-5 w-5" />
            <h2 className="text-base font-medium">重要文法ポイント</h2>
          </div>
          <p className="leading-relaxed text-gray-800 text-sm whitespace-pre-wrap">
            {result.explanation}
          </p>
        </section>

        {/* 詳細品詞分解（カード形式） */}
        <section className="rounded-2xl bg-white p-5 shadow-sm border border-gray-200">
          <div className="mb-4 flex items-center gap-2 text-gray-900">
            <BookOpen className="h-5 w-5" />
            <h2 className="text-base font-medium">詳細品詞分解</h2>
            <span className="ml-auto text-xs text-gray-500">
              {result.words.length}語
            </span>
          </div>

          <div className="space-y-2">
            {result.words.map((word, index) => {
              const isExpanded = expandedWords.has(index);
              const hasDetails = 
                word.inflectionType || 
                word.inflectionForm || 
                word.auxiliaryMeaning || 
                word.grammarNote;

              return (
                <div
                  key={index}
                  className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden transition hover:shadow-md"
                >
                  {/* 基本情報（常に表示） */}
                  <button
                    onClick={() => hasDetails && toggleWordExpansion(index)}
                    className="w-full text-left p-4 flex items-start gap-3 transition hover:bg-gray-100 active:bg-gray-200"
                    disabled={!hasDetails}
                  >
                    <div
                      className="flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-white text-sm font-medium shadow-sm"
                      style={{ backgroundColor: word.colorCode }}
                    >
                      {word.surface.charAt(0)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-medium text-gray-900 text-base">
                          {word.surface}
                        </span>
                        <span className="text-xs text-gray-500">
                          {word.reading}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-gray-300 text-xs text-gray-700">
                          {word.partOfSpeech}
                        </span>
                        {word.inflectionForm && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-red-100 border border-red-300 text-xs text-red-700">
                            {word.inflectionForm}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-700">
                        {word.meaning}
                      </p>
                    </div>

                    {hasDetails && (
                      <div className="flex-shrink-0 mt-2">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    )}
                  </button>

                  {/* 詳細情報（展開時のみ表示） */}
                  {isExpanded && hasDetails && (
                    <div className="px-4 pb-4 pt-2 bg-white border-t border-gray-200 space-y-3">
                      {word.inflectionType && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">活用の種類</p>
                          <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                            {word.inflectionType}
                          </p>
                        </div>
                      )}
                      
                      {word.auxiliaryMeaning && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">助動詞の意味</p>
                          <p className="text-sm text-gray-900 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                            {word.auxiliaryMeaning}
                          </p>
                        </div>
                      )}
                      
                      {word.grammarNote && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">
                            📝 入試重要ポイント
                          </p>
                          <p className="text-sm text-gray-900 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-200 leading-relaxed">
                            {word.grammarNote}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* クレジット情報 */}
        {!result.isSubscribed && (
          <div className="rounded-xl bg-gray-50 px-4 py-3 text-center border border-gray-200">
            <p className="text-xs text-gray-600">
              残りクレジット: <span className="font-medium text-gray-900">{result.credits}</span>
            </p>
          </div>
        )}
      </main>

      <Navigation />
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
      </div>
    }>
      <ResultContent />
    </Suspense>
  );
}
