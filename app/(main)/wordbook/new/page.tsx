"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { Subject } from "@/types";
import { SUBJECT_LABELS } from "@/types";

const SUBJECTS: Subject[] = ["japanese_classical", "chinese_classical", "english"];
const COVER_COLORS = [
  "#7c6fe0","#FF6B6B","#4ECDC4","#F38181","#95E1D3",
  "#AA96DA","#1a1a2e","#3b82f6","#f59e0b","#10b981",
];

export default function NewWordbookPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState<Subject>("japanese_classical");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [coverColor, setCoverColor] = useState(COVER_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!title.trim()) { setError("タイトルを入力してください"); return; }
    setLoading(true); setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }

    const { data, error: err } = await supabase
      .from("wordbooks")
      .insert({
        user_id: session.user.id,
        title: title.trim(),
        subject,
        description: description.trim() || null,
        is_public: isPublic,
        cover_color: coverColor,
      })
      .select("id")
      .single();

    if (err || !data) {
      setError("作成に失敗しました");
      setLoading(false);
      return;
    }

    router.replace(`/wordbook/${data.id}`);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--color-surface)" }}>
      <header style={{ background: "var(--color-primary)" }} className="safe-area-top px-4 pt-4 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <h1 className="text-lg font-bold text-white">新しい単語帳</h1>
        </div>
      </header>

      <main className="p-4 space-y-5">
        {/* プレビュー */}
        <div className="flex justify-center">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-3xl text-white text-4xl font-bold shadow-lg"
            style={{ backgroundColor: coverColor }}
          >
            {title.charAt(0) || "📖"}
          </div>
        </div>

        {/* カバーカラー */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">カバーカラー</p>
          <div className="flex flex-wrap gap-2">
            {COVER_COLORS.map((c) => (
              <button key={c} onClick={() => setCoverColor(c)}
                className="h-8 w-8 rounded-full transition active:scale-90"
                style={{
                  backgroundColor: c,
                  border: coverColor === c ? "3px solid var(--color-primary)" : "3px solid transparent",
                  boxShadow: coverColor === c ? "0 0 0 2px white inset" : "none",
                }}
              />
            ))}
          </div>
        </div>

        {/* タイトル */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">タイトル *</label>
          <input
            value={title}
            onChange={(e) => { setTitle(e.target.value); setError(null); }}
            placeholder="例: 古文頻出単語 300"
            className="w-full rounded-xl border bg-white px-4 py-3 text-sm focus:outline-none"
            style={{ borderColor: "var(--color-border)" }}
          />
        </div>

        {/* 科目 */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">科目</p>
          <div className="flex gap-2">
            {SUBJECTS.map((s) => (
              <button key={s} onClick={() => setSubject(s)}
                className="flex-1 rounded-xl py-2 text-sm font-medium transition active:scale-95"
                style={subject === s
                  ? { background: "var(--color-accent)", color: "white" }
                  : { background: "white", color: "#374151", border: "1px solid var(--color-border)" }}
              >
                {SUBJECT_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* 説明 */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">説明（任意）</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="この単語帳について説明してください"
            className="w-full rounded-xl border bg-white px-4 py-3 text-sm resize-none h-20 focus:outline-none"
            style={{ borderColor: "var(--color-border)" }}
          />
        </div>

        {/* 公開設定 */}
        <div className="flex items-center justify-between rounded-xl bg-white p-4"
          style={{ border: "1px solid var(--color-border)" }}>
          <div>
            <p className="text-sm font-medium text-gray-900">みんなに公開する</p>
            <p className="text-xs text-gray-400 mt-0.5">他のユーザーが検索・コピーできます</p>
          </div>
          <button onClick={() => setIsPublic(!isPublic)}
            className="relative h-6 w-11 rounded-full transition"
            style={{ background: isPublic ? "var(--color-accent)" : "#d1d5db" }}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isPublic ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <button onClick={handleCreate} disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-semibold text-white disabled:opacity-60"
          style={{ background: "var(--color-accent)" }}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "単語帳を作成"}
        </button>
      </main>
    </div>
  );
}
