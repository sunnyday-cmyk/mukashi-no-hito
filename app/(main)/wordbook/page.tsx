"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Globe, BookOpen, Search, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { Wordbook, Subject } from "@/types";
import { SUBJECT_LABELS } from "@/types";

const SUBJECT_COLORS: Record<Subject | "all", string> = {
  all: "var(--color-accent)",
  japanese_classical: "#FF6B6B",
  chinese_classical: "#4ECDC4",
  english: "#F38181",
};

const COVER_COLORS = [
  "#7c6fe0","#FF6B6B","#4ECDC4","#F38181","#95E1D3",
  "#AA96DA","#1a1a2e","#3b82f6","#f59e0b","#10b981",
];

export default function WordbookPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"mine" | "discover">("mine");
  const [wordbooks, setWordbooks] = useState<Wordbook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWordbooks();
  }, []);

  const loadWordbooks = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("wordbooks")
      .select("*")
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false });

    setWordbooks(data || []);
    setLoading(false);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--color-surface)" }}>
      {/* ヘッダー */}
      <header style={{ background: "var(--color-primary)" }} className="safe-area-top px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">単語帳</h1>
          <button
            onClick={() => router.push("/wordbook/new")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
          >
            <Plus className="h-5 w-5 text-white" />
          </button>
        </div>
        {/* タブ */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setTab("mine")}
            className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${tab === "mine" ? "bg-white text-[#1a1a2e]" : "text-white/60"}`}
          >
            マイ単語帳
          </button>
          <button
            onClick={() => { setTab("discover"); router.push("/wordbook/discover"); }}
            className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${tab === "discover" ? "bg-white text-[#1a1a2e]" : "text-white/60"}`}
          >
            みんなの単語帳
          </button>
        </div>
      </header>

      <main className="p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-accent)" }} />
          </div>
        ) : wordbooks.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <BookOpen className="h-14 w-14 mb-4" style={{ color: "var(--color-accent)", opacity: 0.4 }} />
            <p className="text-gray-600 font-medium">単語帳がありません</p>
            <p className="text-sm text-gray-400 mt-1">「＋」ボタンから作成してください</p>
            <button
              onClick={() => router.push("/wordbook/new")}
              className="mt-4 flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-white"
              style={{ background: "var(--color-accent)" }}
            >
              <Plus className="h-4 w-4" />
              新しい単語帳を作る
            </button>
          </div>
        ) : (
          <>
            {wordbooks.map((wb) => (
              <button
                key={wb.id}
                onClick={() => router.push(`/wordbook/${wb.id}`)}
                className="w-full flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm text-left transition active:scale-[0.98]"
              >
                <div
                  className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-white text-xl font-bold shadow-sm"
                  style={{ backgroundColor: wb.cover_color || "var(--color-accent)" }}
                >
                  {wb.title.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <p className="font-semibold text-gray-900 truncate pr-2">{wb.title}</p>
                    {wb.is_public && (
                      <Globe className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "var(--color-accent)" }} />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="text-xs rounded-full px-2 py-0.5 text-white"
                      style={{ backgroundColor: SUBJECT_COLORS[wb.subject as Subject] || "var(--color-accent)" }}
                    >
                      {SUBJECT_LABELS[wb.subject as Subject] || wb.subject}
                    </span>
                    <span className="text-xs text-gray-400">{wb.word_count}語</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </button>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
