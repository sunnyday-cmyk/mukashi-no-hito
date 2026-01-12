"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { RotateCcw, BookOpen, Trophy, XCircle } from "lucide-react";
import { WordbookItem } from "@/lib/db";
import Navigation from "@/components/Navigation";

function TestResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [wrongWords, setWrongWords] = useState<WordbookItem[]>([]);
  const [showReview, setShowReview] = useState(false);

  const correct = parseInt(searchParams.get("correct") || "0", 10);
  const wrong = parseInt(searchParams.get("wrong") || "0", 10);
  const total = parseInt(searchParams.get("total") || "0", 10);
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  useEffect(() => {
    const wrongWordsParam = searchParams.get("wrongWords");
    if (wrongWordsParam) {
      try {
        const parsed = JSON.parse(wrongWordsParam);
        setWrongWords(parsed);
      } catch (e) {
        console.error("間違えた単語のパースエラー:", e);
      }
    }
  }, [searchParams]);

  const handleRetry = () => {
    router.push("/test");
  };

  const handleBackToWordbook = () => {
    router.push("/wordbook");
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="flex items-center gap-4 px-5 py-4">
          <h1 className="text-lg font-medium">テスト結果</h1>
        </div>
      </header>

      <main className="flex flex-1 flex-col px-5 pt-20 py-6 pb-24">
        <div className="mx-auto w-full max-w-md space-y-6">
          {/* 結果サマリー */}
          <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-8 text-center">
            <div className="mb-4">
              {accuracy >= 80 ? (
                <Trophy className="mx-auto h-16 w-16 text-yellow-500" />
              ) : (
                <XCircle className="mx-auto h-16 w-16 text-gray-400" />
              )}
            </div>
            <p className="mb-2 text-3xl font-bold text-gray-900">
              {accuracy}%
            </p>
            <p className="mb-4 text-sm text-gray-600">正答率</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-green-50 p-4">
                <p className="text-2xl font-bold text-green-700">{correct}</p>
                <p className="text-xs text-green-600">正解</p>
              </div>
              <div className="rounded-xl bg-red-50 p-4">
                <p className="text-2xl font-bold text-red-700">{wrong}</p>
                <p className="text-xs text-red-600">不正解</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              全{total}問中 {correct}問正解
            </p>
          </div>

          {/* 間違えた単語を復習 */}
          {wrongWords.length > 0 && (
            <div>
              {!showReview ? (
                <button
                  onClick={() => setShowReview(true)}
                  className="w-full rounded-xl border-2 border-gray-200 bg-white px-6 py-4 text-left font-medium text-gray-900 transition hover:border-gray-300 hover:bg-gray-50 active:scale-95"
                >
                  <div className="flex items-center justify-between">
                    <span>間違えた単語を復習 ({wrongWords.length}個)</span>
                    <BookOpen className="h-5 w-5 text-gray-400" />
                  </div>
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-medium text-gray-700">
                      間違えた単語
                    </h2>
                    <button
                      onClick={() => setShowReview(false)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      閉じる
                    </button>
                  </div>
                  <div className="space-y-2">
                    {wrongWords.map((word, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-gray-200 bg-white p-4"
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className="flex-shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-white"
                            style={{
                              backgroundColor: word.colorCode || "#AA96DA",
                            }}
                          >
                            {word.surface}
                          </span>
                          <div className="flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-600">
                                {word.partOfSpeech}
                              </span>
                              {word.conjugation && (
                                <>
                                  <span className="text-gray-300">・</span>
                                  <span className="text-xs text-gray-500">
                                    {word.conjugation}
                                  </span>
                                </>
                              )}
                            </div>
                            <p className="text-sm leading-relaxed text-gray-900">
                              {word.meaning}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* アクションボタン */}
          <div className="space-y-3 pt-4">
            <button
              onClick={handleRetry}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-4 text-base font-medium text-white shadow-lg transition hover:bg-gray-800 active:scale-95"
            >
              <RotateCcw className="h-5 w-5" />
              もう一度テスト
            </button>
            <button
              onClick={handleBackToWordbook}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-6 py-4 text-base font-medium text-gray-900 transition hover:border-gray-300 hover:bg-gray-50 active:scale-95"
            >
              <BookOpen className="h-5 w-5" />
              単語帳に戻る
            </button>
          </div>
        </div>
      </main>

      <Navigation />
    </div>
  );
}

export default function TestResultPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-white">読み込み中...</div>}>
      <TestResultContent />
    </Suspense>
  );
}

