"use client";

import { useEffect, useState } from "react";
import { Clock, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { db, HistoryItem } from "@/lib/db";
import Navigation from "@/components/Navigation";

export default function HistoryPage() {
  const router = useRouter();
  const [histories, setHistories] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistories();
  }, []);

  const loadHistories = async () => {
    try {
      const allHistories = await db.history
        .orderBy("createdAt")
        .reverse()
        .toArray();
      setHistories(allHistories);
    } catch (error) {
      console.error("履歴の読み込みに失敗しました:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number | undefined) => {
    if (!id) return;
    if (!confirm("この履歴を削除しますか？")) return;

    try {
      await db.history.delete(id);
      loadHistories(); // リストを再読み込み
    } catch (error) {
      console.error("履歴の削除に失敗しました:", error);
      alert("履歴の削除に失敗しました。");
    }
  };

  const handleItemClick = (history: HistoryItem) => {
    // 結果画面に遷移（クエリパラメータでデータを渡す）
    const params = new URLSearchParams({
      text: history.originalText,
      result: history.resultJson,
    });
    router.push(`/result?${params.toString()}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="flex items-center gap-4 px-5 py-4">
          <h1 className="text-lg font-medium">履歴</h1>
        </div>
      </header>

      <main className="flex-1 px-5 py-6 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-600">読み込み中...</p>
          </div>
        ) : histories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Clock className="mb-4 h-12 w-12 text-gray-300" />
            <p className="text-gray-600">まだ履歴がありません</p>
            <p className="mt-2 text-sm text-gray-400">
              古文を解析すると、ここに履歴が表示されます
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {histories.map((history) => (
              <div
                key={history.id}
                className="group relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div
                  onClick={() => handleItemClick(history)}
                  className="w-full cursor-pointer text-left"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <p className="flex-1 text-sm leading-relaxed text-gray-900 line-clamp-2">
                      {history.originalText}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(history.id);
                      }}
                      className="ml-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 opacity-0 transition hover:bg-red-100 hover:text-red-600 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      {new Date(history.createdAt).toLocaleString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="mt-2 rounded-lg bg-blue-50 p-2">
                    <p className="text-xs text-gray-600 line-clamp-1">
                      {history.translation}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Navigation />
    </div>
  );
}

