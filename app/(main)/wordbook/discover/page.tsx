"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Copy, BookOpen, Users, Star, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { copyWordbookToMyLibrary } from "@/lib/copyWordbook";
import type { Wordbook, Subject } from "@/types";
import { SUBJECT_LABELS } from "@/types";

const SUBJECTS: Array<Subject | "all"> = ["all", "japanese_classical", "chinese_classical", "english"];

export default function DiscoverPage() {
  const router = useRouter();
  const [wordbooks, setWordbooks] = useState<Wordbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<Subject | "all">("all");
  const [sort, setSort] = useState<"copy_count" | "created_at">("copy_count");
  const [copying, setCopying] = useState<string | null>(null);

  useEffect(() => { load(); }, [subjectFilter, sort]);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("wordbooks")
      .select("*, profiles:user_id(username, display_name)")
      .eq("is_public", true)
      .order(sort, { ascending: false })
      .limit(50);
    if (subjectFilter !== "all") q = q.eq("subject", subjectFilter);
    const { data } = await q;
    setWordbooks((data as Wordbook[]) || []);
    setLoading(false);
  };

  const filtered = wordbooks.filter((wb) =>
    !search.trim() ||
    wb.title.toLowerCase().includes(search.toLowerCase()) ||
    (wb.tags || []).some((t) => t.includes(search))
  );

  const handleCopy = async (wb: Wordbook) => {
    setCopying(wb.id);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }

    const result = await copyWordbookToMyLibrary(supabase, wb, session.user.id);
    if ("newWordbookId" in result) {
      router.push(`/wordbook/${result.newWordbookId}`);
    } else {
      alert(result.error);
    }
    setCopying(null);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--color-surface)" }}>
      <header style={{ background: "var(--color-primary)" }} className="safe-area-top px-4 pt-4 pb-4">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <h1 className="text-lg font-bold text-white">みんなの単語帳</h1>
        </div>
        {/* 検索 */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="タイトル・タグで検索"
            className="w-full rounded-xl bg-white/10 pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:bg-white/20"
          />
        </div>
        {/* 科目フィルター */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {SUBJECTS.map((s) => (
            <button key={s} onClick={() => setSubjectFilter(s)}
              className="flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition"
              style={subjectFilter === s
                ? { background: "var(--color-accent)", color: "white" }
                : { background: "rgba(255,255,255,0.15)", color: "white" }}>
              {s === "all" ? "すべて" : SUBJECT_LABELS[s]}
            </button>
          ))}
        </div>
      </header>

      {/* ソート */}
      <div className="flex gap-2 px-4 py-3">
        {([["copy_count", "人気順"], ["created_at", "新着順"]] as const).map(([v, label]) => (
          <button key={v} onClick={() => setSort(v)}
            className="rounded-full px-3 py-1 text-xs font-medium transition"
            style={sort === v
              ? { background: "var(--color-accent)", color: "white" }
              : { background: "white", color: "#374151", border: "1px solid var(--color-border)" }}>
            {label}
          </button>
        ))}
      </div>

      <main className="px-4 pb-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-accent)" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-gray-400">
            <BookOpen className="h-12 w-12 mb-3 opacity-40" />
            <p>見つかりませんでした</p>
          </div>
        ) : (
          filtered.map((wb) => (
            <div key={wb.id} className="rounded-2xl bg-white p-4 shadow-sm"
              style={{ border: "1px solid var(--color-border)" }}>
              <div className="flex items-start gap-3">
                <div
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-white text-lg font-bold"
                  style={{ backgroundColor: wb.cover_color || "var(--color-accent)" }}>
                  {wb.title.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-1">
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight flex-1">{wb.title}</h3>
                    {wb.is_official && (
                      <span className="flex-shrink-0 rounded-full px-2 py-0.5 text-xs text-white" style={{ background: "#f59e0b" }}>公式</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs rounded-full px-2 py-0.5 text-white"
                      style={{ background: "var(--color-accent)" }}>
                      {SUBJECT_LABELS[wb.subject as Subject] || wb.subject}
                    </span>
                    <span className="text-xs text-gray-400">{wb.word_count}語</span>
                    <span className="flex items-center gap-0.5 text-xs text-gray-400">
                      <Users className="h-3 w-3" />{wb.copy_count}
                    </span>
                  </div>
                  {(wb.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(wb.tags || []).slice(0, 3).map((t) => (
                        <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => router.push(`/wordbook/${wb.id}`)}
                  className="flex-1 rounded-xl border py-2 text-xs font-medium transition"
                  style={{ borderColor: "var(--color-border)", color: "#374151" }}>
                  中身を見る
                </button>
                <button onClick={() => handleCopy(wb)} disabled={copying === wb.id}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-white transition"
                  style={{ background: "var(--color-accent)" }}>
                  {copying === wb.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <><Copy className="h-3.5 w-3.5" />コピーして使う</>}
                </button>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
