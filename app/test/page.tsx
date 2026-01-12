"use client";

import { useState } from "react";
import { Play, BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";

type TestMode = "meaning" | "partOfSpeech" | "conjugation";
type QuestionCount = 10 | 20 | 30;

export default function TestPage() {
  const router = useRouter();
  const [testMode, setTestMode] = useState<TestMode>("meaning");
  const [questionCount, setQuestionCount] = useState<QuestionCount>(10);

  const handleStart = () => {
    const params = new URLSearchParams({
      mode: testMode,
      count: questionCount.toString(),
    });
    router.push(`/test/play?${params.toString()}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900">
      <main className="flex flex-1 flex-col px-5 pt-20 py-6 pb-24">
        <div className="mx-auto w-full max-w-md space-y-8">
          {/* 説明 */}
          <div className="text-center">
            <BookOpen className="mx-auto mb-3 h-12 w-12 text-gray-400" />
            <p className="text-sm text-gray-600">
              単語帳に登録された単語でテストを行います
            </p>
          </div>

          {/* テストモード選択 */}
          <section>
            <h2 className="mb-4 text-sm font-medium text-gray-700">
              テストモードを選択
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => setTestMode("meaning")}
                className={`w-full rounded-xl border-2 px-4 py-4 text-left transition ${
                  testMode === "meaning"
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">意味を答える</p>
                    <p className="mt-1 text-xs text-gray-500">
                      単語を見て、意味を選択
                    </p>
                  </div>
                  {testMode === "meaning" && (
                    <div className="h-5 w-5 rounded-full bg-gray-900"></div>
                  )}
                </div>
              </button>

              <button
                onClick={() => setTestMode("partOfSpeech")}
                className={`w-full rounded-xl border-2 px-4 py-4 text-left transition ${
                  testMode === "partOfSpeech"
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">品詞を答える</p>
                    <p className="mt-1 text-xs text-gray-500">
                      単語を見て、品詞を選択
                    </p>
                  </div>
                  {testMode === "partOfSpeech" && (
                    <div className="h-5 w-5 rounded-full bg-gray-900"></div>
                  )}
                </div>
              </button>

              <button
                onClick={() => setTestMode("conjugation")}
                className={`w-full rounded-xl border-2 px-4 py-4 text-left transition ${
                  testMode === "conjugation"
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">活用形を答える</p>
                    <p className="mt-1 text-xs text-gray-500">
                      単語を見て、活用形を選択
                    </p>
                  </div>
                  {testMode === "conjugation" && (
                    <div className="h-5 w-5 rounded-full bg-gray-900"></div>
                  )}
                </div>
              </button>
            </div>
          </section>

          {/* 問題数選択 */}
          <section>
            <h2 className="mb-4 text-sm font-medium text-gray-700">
              問題数を選択
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {([10, 20, 30] as QuestionCount[]).map((count) => (
                <button
                  key={count}
                  onClick={() => setQuestionCount(count)}
                  className={`rounded-xl border-2 px-4 py-3 text-center font-medium transition ${
                    questionCount === count
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {count}問
                </button>
              ))}
            </div>
          </section>

          {/* テスト開始ボタン */}
          <button
            onClick={handleStart}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-4 text-base font-medium text-white shadow-lg transition hover:bg-gray-800 active:scale-95"
          >
            <Play className="h-5 w-5" />
            テスト開始
          </button>
        </div>
      </main>

      <Navigation />
    </div>
  );
}

