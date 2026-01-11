"use client";

import { useEffect, useState } from "react";
import { Search, Trash2, BookOpen, Filter } from "lucide-react";
import { db, WordbookItem } from "@/lib/db";
import Navigation from "@/components/Navigation";

export default function WordbookPage() {
  const [words, setWords] = useState<WordbookItem[]>([]);
  const [filteredWords, setFilteredWords] = useState<WordbookItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPartOfSpeech, setSelectedPartOfSpeech] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWords();
  }, []);

  // 品詞の一覧を取得
  const partOfSpeechList = Array.from(
    new Set(words.map((word) => word.partOfSpeech))
  ).sort();

  useEffect(() => {
    // 検索クエリと品詞でフィルタリング
    let filtered = words;

    // 品詞でフィルタリング
    if (selectedPartOfSpeech) {
      filtered = filtered.filter(
        (word) => word.partOfSpeech === selectedPartOfSpeech
      );
    }

    // 検索クエリでフィルタリング
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (word) =>
          word.surface.toLowerCase().includes(query) ||
          word.partOfSpeech.toLowerCase().includes(query) ||
          word.meaning.toLowerCase().includes(query) ||
          (word.conjugation && word.conjugation.toLowerCase().includes(query))
      );
    }

    setFilteredWords(filtered);
  }, [searchQuery, selectedPartOfSpeech, words]);

  const loadWords = async () => {
    try {
      const allWords = await db.wordbook
        .orderBy("createdAt")
        .reverse()
        .toArray();
      setWords(allWords);
      setFilteredWords(allWords);
    } catch (error) {
      console.error("単語帳の読み込みに失敗しました:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number | undefined) => {
    if (!id) return;
    if (!confirm("この単語を削除しますか？")) return;

    try {
      await db.wordbook.delete(id);
      loadWords(); // リストを再読み込み
    } catch (error) {
      console.error("単語の削除に失敗しました:", error);
      alert("単語の削除に失敗しました。");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="flex items-center gap-4 px-5 py-4">
          <h1 className="text-lg font-medium">単語帳</h1>
        </div>
      </header>

      <main className="flex-1 px-5 py-6 pb-24">
        {/* 検索バー */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="単語、品詞、意味で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-gray-300 focus:bg-white"
            />
          </div>
        </div>

        {/* 品詞フィルター */}
        {partOfSpeechList.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-xs font-medium text-gray-500">品詞で絞り込み</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedPartOfSpeech("")}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  selectedPartOfSpeech === ""
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                すべて
              </button>
              {partOfSpeechList.map((pos) => (
                <button
                  key={pos}
                  onClick={() =>
                    setSelectedPartOfSpeech(
                      selectedPartOfSpeech === pos ? "" : pos
                    )
                  }
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    selectedPartOfSpeech === pos
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-600">読み込み中...</p>
          </div>
        ) : filteredWords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <BookOpen className="mb-4 h-12 w-12 text-gray-300" />
            <p className="text-gray-600">
              {searchQuery.trim() === ""
                ? "まだ単語が登録されていません"
                : "検索結果が見つかりませんでした"}
            </p>
            {searchQuery.trim() === "" && (
              <p className="mt-2 text-sm text-gray-400">
                解析結果から単語を登録すると、ここに表示されます
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredWords.map((word) => (
              <div
                key={word.id}
                className="group relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
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
                    <div className="mt-2 text-xs text-gray-400">
                      {new Date(word.createdAt).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(word.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 opacity-0 transition hover:bg-red-100 hover:text-red-600 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 統計情報 */}
        {words.length > 0 && (
          <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
            <p className="text-sm text-gray-600">
              登録単語数: <span className="font-medium">{words.length}</span>
              {searchQuery.trim() !== "" && (
                <>
                  {" "}
                  / 検索結果:{" "}
                  <span className="font-medium">{filteredWords.length}</span>
                </>
              )}
            </p>
          </div>
        )}
      </main>
      <Navigation />
    </div>
  );
}

