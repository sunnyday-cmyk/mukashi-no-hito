"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { X, RotateCcw, BookPlus, Check } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import Navigation from "@/components/Navigation";

interface Word {
  surface: string;
  partOfSpeech: string;
  conjugation: string;
  meaning: string;
  colorCode: string;
}

interface AnalysisResult {
  words: Word[];
  translation: string;
  explanation: string;
}

export default function ResultPage() {
  const searchParams = useSearchParams();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [originalText, setOriginalText] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isVertical, setIsVertical] = useState(true); // 縦書き/横書き切り替え
  const [selectedWord, setSelectedWord] = useState<Word | null>(null); // 選択された単語
  const [savedToWordbook, setSavedToWordbook] = useState(false); // 単語帳に保存済みかどうか
  const [historySaved, setHistorySaved] = useState(false); // 履歴に保存済みかどうか

  // 単語が選択されたときに保存状態をリセット
  useEffect(() => {
    setSavedToWordbook(false);
  }, [selectedWord]);

  useEffect(() => {
    const text = searchParams.get("text");
    const resultParam = searchParams.get("result");

    if (text) {
      setOriginalText(text);
    }

    if (resultParam) {
      try {
        const parsed = JSON.parse(resultParam);
        setResult(parsed);
      } catch (e) {
        console.error("結果のパースエラー:", e);
      }
    }

    setLoading(false);
  }, [searchParams]);

  // 解析結果を履歴に自動保存
  useEffect(() => {
    const saveToHistory = async () => {
      if (!result || !originalText || historySaved) return;

      try {
        await db.history.add({
          originalText: originalText,
          translation: result.translation,
          resultJson: JSON.stringify(result),
          createdAt: new Date(),
        });
        setHistorySaved(true);
        console.log("履歴に保存しました");
      } catch (error) {
        console.error("履歴の保存に失敗しました:", error);
      }
    };

    saveToHistory();
  }, [result, originalText, historySaved]);

  // 単語帳に追加する処理
  const handleAddToWordbook = async () => {
    if (!selectedWord) return;

    try {
      // 重複チェック（同じ表記と品詞の組み合わせが既に存在するか）
      const allWords = await db.wordbook
        .where("surface")
        .equals(selectedWord.surface)
        .toArray();
      
      const existing = allWords.find(
        (item) => item.partOfSpeech === selectedWord.partOfSpeech
      );

      if (existing) {
        alert("この単語は既に単語帳に登録されています。");
        return;
      }

      await db.wordbook.add({
        surface: selectedWord.surface,
        partOfSpeech: selectedWord.partOfSpeech,
        meaning: selectedWord.meaning,
        conjugation: selectedWord.conjugation || undefined,
        colorCode: selectedWord.colorCode || undefined,
        createdAt: new Date(),
      });

      setSavedToWordbook(true);
      setTimeout(() => {
        setSavedToWordbook(false);
        setSelectedWord(null);
      }, 1500);
    } catch (error) {
      console.error("単語帳への保存に失敗しました:", error);
      alert("単語帳への保存に失敗しました。");
    }
  };

  // 原文を単語ごとに分割して表示用データを作成
  const getTextWithWords = () => {
    if (!result || !originalText) return [];
    
    const words: Array<{ word: Word | null; text: string }> = [];
    let currentIndex = 0;
    
    // 単語の位置を特定（順番にマッチング）
    for (const word of result.words) {
      // 現在位置から単語を検索
      const wordIndex = originalText.indexOf(word.surface, currentIndex);
      
      if (wordIndex === -1) {
        // 単語が見つからない場合はスキップ
        continue;
      }
      
      // 単語の前にテキストがある場合
      if (wordIndex > currentIndex) {
        const beforeText = originalText.slice(currentIndex, wordIndex);
        if (beforeText.trim()) {
          words.push({
            word: null,
            text: beforeText,
          });
        }
      }
      
      // 単語を追加
      words.push({
        word: word,
        text: word.surface,
      });
      
      currentIndex = wordIndex + word.surface.length;
    }
    
    // 残りのテキスト
    if (currentIndex < originalText.length) {
      const remainingText = originalText.slice(currentIndex);
      if (remainingText.trim()) {
        words.push({
          word: null,
          text: remainingText,
        });
      }
    }
    
    return words;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
        <p className="mb-4 text-gray-600">解析結果が見つかりませんでした。</p>
        <Link
          href="/"
          className="rounded-full bg-gray-900 px-6 py-3 text-sm text-white transition hover:bg-gray-800"
        >
          トップに戻る
        </Link>
      </div>
    );
  }

  const textWithWords = getTextWithWords();

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-5 py-4">
          <h1 className="text-lg font-medium">解析結果</h1>
        </div>
      </header>

      <main className="flex-1 px-5 py-6 pb-24">
        {/* 原文エリア */}
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-500">原文</h2>
            {/* 縦書き/横書き切り替えスイッチ */}
            <button
              onClick={() => setIsVertical(!isVertical)}
              className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 transition hover:bg-gray-50 active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {isVertical ? "横書き" : "縦書き"}
            </button>
          </div>
          <div
            className={`rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-6 ${
              isVertical ? "writing-vertical overflow-x-auto" : ""
            }`}
            style={
              isVertical
                ? {
                    writingMode: "vertical-rl",
                    textOrientation: "upright",
                    maxHeight: "60vh",
                    overflowY: "auto",
                    overflowX: "auto",
                    WebkitOverflowScrolling: "touch",
                    scrollbarWidth: "thin",
                  }
                : {
                    minHeight: "120px",
                  }
            }
          >
            <div
              className={`${isVertical ? "" : "flex flex-wrap"} gap-1 leading-relaxed`}
            >
              {textWithWords.map((item, index) => {
                if (item.word) {
                  return (
                    <span
                      key={index}
                      onClick={() => setSelectedWord(item.word)}
                      className="cursor-pointer rounded px-1.5 py-0.5 font-medium transition hover:opacity-80 active:scale-95"
                      style={{
                        backgroundColor: item.word.colorCode,
                        color: "white",
                      }}
                    >
                      {item.text}
                    </span>
                  );
                } else {
                  return (
                    <span key={index} className="text-gray-900">
                      {item.text}
                    </span>
                  );
                }
              })}
            </div>
          </div>
        </section>

        {/* 現代語訳 */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-gray-500">現代語訳</h2>
          <div className="rounded-xl border border-gray-200 bg-blue-50 p-4">
            <p className="leading-relaxed text-gray-900">{result.translation}</p>
          </div>
        </section>

        {/* 文法的説明 */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-gray-500">
            文法的な重要ポイント
          </h2>
          <div className="rounded-xl border border-gray-200 bg-amber-50 p-4">
            <p className="leading-relaxed text-gray-900">{result.explanation}</p>
          </div>
        </section>

        {/* 単語一覧（参考用） */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-gray-500">単語一覧</h2>
          <div className="space-y-2">
            {result.words.map((word, index) => (
              <div
                key={index}
                onClick={() => setSelectedWord(word)}
                className="flex cursor-pointer flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 transition hover:bg-gray-50 active:scale-[0.98]"
              >
                <span
                  className="rounded px-2 py-1 text-sm font-medium text-white"
                  style={{ backgroundColor: word.colorCode }}
                >
                  {word.surface}
                </span>
                <span className="text-sm text-gray-600">
                  {word.partOfSpeech}
                  {word.conjugation && `・${word.conjugation}`}
                </span>
                <span className="text-sm text-gray-900">{word.meaning}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* 単語詳細ポップアップ */}
      {selectedWord && (
        <>
          {/* オーバーレイ */}
          <div
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity duration-200"
            onClick={() => setSelectedWord(null)}
            style={{ animation: "fadeIn 0.2s ease-out" }}
          />
          {/* ポップアップ */}
          <div
            className="fixed left-1/2 top-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2"
            style={{
              animation: "slideUp 0.3s ease-out",
            }}
          >
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="rounded-lg px-3 py-2 text-lg font-medium text-white"
                    style={{ backgroundColor: selectedWord.colorCode }}
                  >
                    {selectedWord.surface}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedWord(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200 active:scale-95"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">品詞</p>
                  <p className="text-base text-gray-900">{selectedWord.partOfSpeech}</p>
                </div>
                {selectedWord.conjugation && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-500">活用形</p>
                    <p className="text-base text-gray-900">{selectedWord.conjugation}</p>
                  </div>
                )}
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">意味</p>
                  <p className="text-base leading-relaxed text-gray-900">
                    {selectedWord.meaning}
                  </p>
                </div>
                {/* 単語帳に追加ボタン */}
                <button
                  onClick={handleAddToWordbook}
                  disabled={savedToWordbook}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-green-600"
                >
                  {savedToWordbook ? (
                    <>
                      <Check className="h-4 w-4" />
                      単語帳に追加しました
                    </>
                  ) : (
                    <>
                      <BookPlus className="h-4 w-4" />
                      単語帳に追加
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      <Navigation />
    </div>
  );
}
