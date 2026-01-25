"use client";

import { useState, useEffect } from "react";
import { Play, BookOpen, CheckSquare, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import { db, WordbookItem } from "@/lib/db";

type TestMode = "meaning" | "partOfSpeech" | "inflectionForm";
type QuestionCount = 10 | 20 | 30;

export default function TestPage() {
  const router = useRouter();
  const [testMode, setTestMode] = useState<TestMode>("meaning");
  const [questionCount, setQuestionCount] = useState<QuestionCount>(10);
  const [words, setWords] = useState<WordbookItem[]>([]);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showWordSelection, setShowWordSelection] = useState(false);

  useEffect(() => {
    loadWords();
  }, []);

  const loadWords = async () => {
    try {
      const allWords = await db.wordbook
        .orderBy("createdAt")
        .reverse()
        .toArray();
      setWords(allWords);
      // デフォルトで全ての単語を選択
      const allIds = new Set(allWords.map((w) => w.id).filter((id): id is number => id !== undefined));
      setSelectedWordIds(allIds);
    } catch (error) {
      console.error("単語帳の読み込みに失敗しました:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWordSelection = (id: number | undefined) => {
    if (!id) return;
    const newSelected = new Set(selectedWordIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedWordIds(newSelected);
  };

  const selectAll = () => {
    const allIds = new Set(words.map((w) => w.id).filter((id): id is number => id !== undefined));
    setSelectedWordIds(allIds);
  };

  const deselectAll = () => {
    setSelectedWordIds(new Set());
  };

  const handleStart = () => {
    if (selectedWordIds.size === 0) {
      alert("テストする単語を選択してください");
      return;
    }

    const params = new URLSearchParams({
      mode: testMode,
      count: questionCount.toString(),
      wordIds: Array.from(selectedWordIds).join(","),
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
            {!loading && (
              <p className="mt-2 text-xs text-gray-500">
                登録単語数: {words.length}語 / 選択中: {selectedWordIds.size}語
              </p>
            )}
          </div>

          {/* 単語選択セクション */}
          {!loading && words.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-700">
                  出題する単語を選択
                </h2>
                <button
                  onClick={() => setShowWordSelection(!showWordSelection)}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  {showWordSelection ? "閉じる" : "単語を選択"}
                </button>
              </div>

              {showWordSelection && (
                <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs text-gray-600">
                      {selectedWordIds.size}個選択中
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={selectAll}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        全て選択
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={deselectAll}
                        className="text-xs text-gray-600 hover:text-gray-700"
                      >
                        全て解除
                      </button>
                    </div>
                  </div>
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {words.map((word) => (
                      <button
                        key={word.id}
                        onClick={() => toggleWordSelection(word.id)}
                        className="flex w-full items-center gap-3 rounded-lg bg-white p-3 text-left transition hover:bg-gray-100"
                      >
                        {selectedWordIds.has(word.id!) ? (
                          <CheckSquare className="h-5 w-5 flex-shrink-0 text-blue-600" />
                        ) : (
                          <Square className="h-5 w-5 flex-shrink-0 text-gray-300" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block rounded px-2 py-0.5 text-xs font-medium text-white"
                              style={{ backgroundColor: word.colorCode || "#AA96DA" }}
                            >
                              {word.surface}
                            </span>
                            {word.reading && (
                              <span className="text-xs text-gray-500">
                                {word.reading}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-gray-600 line-clamp-1">
                            {word.meaning}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

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
                onClick={() => setTestMode("inflectionForm")}
                className={`w-full rounded-xl border-2 px-4 py-4 text-left transition ${
                  testMode === "inflectionForm"
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
                  {testMode === "inflectionForm" && (
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
            disabled={loading || selectedWordIds.size === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-4 text-base font-medium text-white shadow-lg transition hover:bg-gray-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="h-5 w-5" />
            {loading ? "読み込み中..." : `テスト開始 (${selectedWordIds.size}語)`}
          </button>

          {!loading && words.length === 0 && (
            <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-6 text-center">
              <BookOpen className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-600">単語帳に単語がありません</p>
              <p className="mt-1 text-xs text-gray-500">
                まずは解析結果から単語を登録してください
              </p>
            </div>
          )}
        </div>
      </main>

      <Navigation />
    </div>
  );
}

