"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db, WordbookItem } from "@/lib/db";
import Navigation from "@/components/Navigation";
import { Loader2 } from "lucide-react";

type TestMode = "meaning" | "partOfSpeech" | "conjugation";

interface Question {
  word: WordbookItem;
  options: string[];
  correctAnswer: string;
  mode: TestMode;
}

function TestPlayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [words, setWords] = useState<WordbookItem[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [results, setResults] = useState<{ correct: number; wrong: number }>({
    correct: 0,
    wrong: 0,
  });
  const [wrongWords, setWrongWords] = useState<WordbookItem[]>([]);

  const mode = (searchParams.get("mode") || "meaning") as TestMode;
  const count = parseInt(searchParams.get("count") || "10", 10);

  useEffect(() => {
    loadWords();
  }, []);

  useEffect(() => {
    if (words.length > 0) {
      generateQuestions();
    }
  }, [words, mode, count]);

  const loadWords = async () => {
    try {
      const allWords = await db.wordbook.toArray();
      if (allWords.length < 4) {
        alert("単語帳に4つ以上の単語が必要です。");
        router.push("/wordbook");
        return;
      }
      setWords(allWords);
    } catch (error) {
      console.error("単語の読み込みに失敗しました:", error);
      alert("単語の読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const generateQuestions = () => {
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    const selectedWords = shuffled.slice(0, Math.min(count, words.length));
    const generatedQuestions: Question[] = [];

    selectedWords.forEach((word) => {
      let correctAnswer: string;
      let options: string[];

      if (mode === "meaning") {
        correctAnswer = word.meaning;
        // 他の単語から意味を3つ選ぶ
        const otherMeanings = words
          .filter((w) => w.id !== word.id)
          .map((w) => w.meaning)
          .filter((m) => m !== correctAnswer);
        const shuffledMeanings = [...otherMeanings]
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        options = [correctAnswer, ...shuffledMeanings].sort(
          () => Math.random() - 0.5
        );
      } else if (mode === "partOfSpeech") {
        correctAnswer = word.partOfSpeech;
        const otherPOS = Array.from(
          new Set(words.filter((w) => w.id !== word.id).map((w) => w.partOfSpeech))
        ).filter((pos) => pos !== correctAnswer);
        const shuffledPOS = [...otherPOS]
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        options = [correctAnswer, ...shuffledPOS].sort(
          () => Math.random() - 0.5
        );
      } else {
        // conjugation
        correctAnswer = word.conjugation || "なし";
        const otherConj = Array.from(
          new Set(
            words
              .filter((w) => w.id !== word.id && w.conjugation)
              .map((w) => w.conjugation || "なし")
          )
        ).filter((c) => c !== correctAnswer);
        const shuffledConj = [...otherConj]
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        options = [correctAnswer, ...shuffledConj].sort(
          () => Math.random() - 0.5
        );
      }

      generatedQuestions.push({
        word,
        options,
        correctAnswer,
        mode,
      });
    });

    setQuestions(generatedQuestions);
  };

  const handleAnswer = (answer: string) => {
    if (selectedAnswer !== null) return; // 既に回答済み

    const currentQuestion = questions[currentIndex];
    const correct = answer === currentQuestion.correctAnswer;

    setSelectedAnswer(answer);
    setIsCorrect(correct);

    // 結果を更新
    const newResults = {
      correct: correct ? results.correct + 1 : results.correct,
      wrong: correct ? results.wrong : results.wrong + 1,
    };
    setResults(newResults);

    const newWrongWords = correct
      ? wrongWords
      : [...wrongWords, currentQuestion.word];
    setWrongWords(newWrongWords);

    // 次の問題へ（1.5秒後）
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
      } else {
        // テスト終了
        const params = new URLSearchParams({
          correct: newResults.correct.toString(),
          wrong: newResults.wrong.toString(),
          total: questions.length.toString(),
          wrongWords: JSON.stringify(newWrongWords),
        });
        router.push(`/test/result?${params.toString()}`);
      }
    }, 1500);
  };

  if (loading || questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900">
      <main className="flex flex-1 flex-col px-5 pt-20 py-6 pb-24">
        <div className="mx-auto w-full max-w-md space-y-6">
          {/* 進捗表示 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-lg font-medium">問題 {currentIndex + 1}</h1>
              <span className="text-sm text-gray-500">
                {currentIndex + 1} / {questions.length}
              </span>
            </div>
            {/* 進捗バー */}
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-gray-900 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          {/* 問題表示 */}
          <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-8 text-center">
            <div className="mb-4">
              <span
                className="inline-block rounded-lg px-4 py-3 text-2xl font-medium text-white"
                style={{
                  backgroundColor: currentQuestion.word.colorCode || "#AA96DA",
                }}
              >
                {currentQuestion.word.surface}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {mode === "meaning"
                ? "この単語の意味は？"
                : mode === "partOfSpeech"
                ? "この単語の品詞は？"
                : "この単語の活用形は？"}
            </p>
          </div>

          {/* フィードバック表示 */}
          {selectedAnswer !== null && (
            <div
              className={`rounded-2xl p-6 text-center ${
                isCorrect
                  ? "bg-green-50 border-2 border-green-200 test-feedback-correct"
                  : "bg-red-50 border-2 border-red-200 test-feedback-wrong"
              }`}
            >
              <p
                className={`text-2xl font-bold ${
                  isCorrect ? "text-green-700" : "text-red-700"
                }`}
              >
                {isCorrect ? "ピンポン！" : "ブブー"}
              </p>
              {!isCorrect && (
                <p className="mt-2 text-sm text-gray-600">
                  正解: {currentQuestion.correctAnswer}
                </p>
              )}
            </div>
          )}

          {/* 選択肢 */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrectOption = option === currentQuestion.correctAnswer;
              let buttonClass =
                "w-full rounded-xl border-2 px-6 py-4 text-left font-medium transition active:scale-95";

              if (selectedAnswer !== null) {
                if (isCorrectOption) {
                  buttonClass += " border-green-500 bg-green-50 text-green-900";
                } else if (isSelected) {
                  buttonClass += " border-red-500 bg-red-50 text-red-900";
                } else {
                  buttonClass += " border-gray-200 bg-gray-50 text-gray-500";
                }
              } else {
                buttonClass += " border-gray-200 bg-white text-gray-900 hover:border-gray-300 hover:bg-gray-50";
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswer(option)}
                  disabled={selectedAnswer !== null}
                  className={buttonClass}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {selectedAnswer !== null && isCorrectOption && (
                      <span className="text-green-600">✓</span>
                    )}
                    {selectedAnswer !== null && isSelected && !isCorrectOption && (
                      <span className="text-red-600">✗</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      <Navigation />
    </div>
  );
}

export default function TestPlayPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <p className="text-sm text-gray-600">読み込み中...</p>
        </div>
      </div>
    }>
      <TestPlayContent />
    </Suspense>
  );
}

