"use client";

import { useEffect, useState } from "react";
import { Trophy, Flame, BookOpen, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { RankingEntry } from "@/types";

type RankTab = "quiz" | "streak" | "words";
type Period = "week" | "month" | "all";

interface QuizRankRow {
  user_id: string;
  avg_accuracy: number;
  profiles: { username: string; display_name: string | null; avatar_url: string | null };
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function RankingPage() {
  const [tab, setTab] = useState<RankTab>("quiz");
  const [period, setPeriod] = useState<Period>("week");
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [myRank, setMyRank] = useState<RankingEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [tab, period]);

  const load = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    let rawEntries: RankingEntry[] = [];

    if (tab === "quiz") {
      const since = period === "week"
        ? new Date(Date.now() - 7 * 86400000).toISOString()
        : period === "month"
          ? new Date(Date.now() - 30 * 86400000).toISOString()
          : "1970-01-01";

      const { data } = await supabase
        .from("quiz_results")
        .select("user_id, accuracy, profiles:user_id(username, display_name, avatar_url)")
        .gte("created_at", since);

      const grouped = new Map<string, { sum: number; count: number; profile: { username: string; display_name: string | null; avatar_url: string | null } }>();
      (data || []).forEach((row: Record<string, unknown>) => {
        const uid = row.user_id as string;
        const acc = row.accuracy as number;
        const prof = row.profiles as { username: string; display_name: string | null; avatar_url: string | null };
        if (!grouped.has(uid)) grouped.set(uid, { sum: 0, count: 0, profile: prof });
        const g = grouped.get(uid)!;
        g.sum += acc; g.count += 1;
      });

      rawEntries = Array.from(grouped.entries())
        .map(([uid, g]) => ({
          rank: 0,
          user_id: uid,
          username: g.profile?.username || "ユーザー",
          display_name: g.profile?.display_name || null,
          avatar_url: g.profile?.avatar_url || null,
          value: Math.round((g.sum / g.count) * 10) / 10,
          is_me: uid === session.user.id,
        }))
        .sort((a, b) => b.value - a.value)
        .map((e, i) => ({ ...e, rank: i + 1 }));

    } else if (tab === "streak") {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, study_streak")
        .order("study_streak", { ascending: false })
        .limit(50);

      rawEntries = (data || []).map((row: Record<string, unknown>, i) => ({
        rank: i + 1,
        user_id: row.id as string,
        username: row.username as string || "ユーザー",
        display_name: row.display_name as string | null,
        avatar_url: row.avatar_url as string | null,
        value: row.study_streak as number || 0,
        is_me: row.id === session.user.id,
      }));

    } else {
      // words mastered
      const { data } = await supabase
        .from("word_progress")
        .select("user_id, profiles:user_id(username, display_name, avatar_url)")
        .eq("is_mastered", true);

      const grouped = new Map<string, { count: number; profile: Record<string, unknown> }>();
      (data || []).forEach((row: Record<string, unknown>) => {
        const uid = row.user_id as string;
        if (!grouped.has(uid)) grouped.set(uid, { count: 0, profile: row.profiles as Record<string, unknown> });
        grouped.get(uid)!.count++;
      });

      rawEntries = Array.from(grouped.entries())
        .map(([uid, g]) => ({
          rank: 0,
          user_id: uid,
          username: (g.profile?.username as string) || "ユーザー",
          display_name: (g.profile?.display_name as string | null) || null,
          avatar_url: (g.profile?.avatar_url as string | null) || null,
          value: g.count,
          is_me: uid === session.user.id,
        }))
        .sort((a, b) => b.value - a.value)
        .map((e, i) => ({ ...e, rank: i + 1 }));
    }

    setEntries(rawEntries.slice(0, 50));
    setMyRank(rawEntries.find((e) => e.is_me) || null);
    setLoading(false);
  };

  const valueLabel = (entry: RankingEntry) => {
    if (tab === "quiz") return `${entry.value}%`;
    if (tab === "streak") return `${entry.value}日`;
    return `${entry.value}語`;
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--color-surface)" }}>
      <header style={{ background: "var(--color-primary)" }} className="sticky top-0 z-40 safe-area-top px-4 pt-4 pb-4">
        <h1 className="text-xl font-bold text-white mb-3">ランキング</h1>

        {/* タブ */}
        <div className="flex rounded-xl bg-white/10 p-1 gap-1 mb-3">
          {([["quiz", "クイズ", Trophy], ["streak", "連続", Flame], ["words", "習得", BookOpen]] as const).map(([t, label, Icon]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium transition ${tab === t ? "bg-white text-[#1a1a2e]" : "text-white/70"}`}>
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>

        {/* 期間フィルター（クイズのみ） */}
        {tab === "quiz" && (
          <div className="flex gap-2">
            {([["week", "今週"], ["month", "今月"], ["all", "全期間"]] as const).map(([p, label]) => (
              <button key={p} onClick={() => setPeriod(p)}
                className="rounded-full px-3 py-1 text-xs font-medium transition"
                style={period === p
                  ? { background: "var(--color-accent)", color: "white" }
                  : { background: "rgba(255,255,255,0.15)", color: "white" }}>
                {label}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="pb-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-accent)" }} />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-gray-400">
            <Trophy className="h-12 w-12 mb-3 opacity-40" />
            <p>まだデータがありません</p>
          </div>
        ) : (
          <div>
            {/* 上位3人 */}
            <div className="flex items-end justify-center gap-3 px-6 py-6 bg-gradient-to-b from-[#1a1a2e] to-[#f8f7ff]">
              {[entries[1], entries[0], entries[2]].map((entry, i) => {
                if (!entry) return <div key={i} className="w-20" />;
                const heights = ["h-20", "h-28", "h-16"];
                return (
                  <div key={entry.user_id} className="flex flex-col items-center gap-1">
                    <span className="text-xl">{MEDALS[entry.rank - 1]}</span>
                    <div
                      className="flex w-16 items-center justify-center rounded-full text-white font-bold text-lg"
                      style={{ height: "56px", background: "var(--color-accent)" }}>
                      {(entry.display_name || entry.username).charAt(0).toUpperCase()}
                    </div>
                    <p className="text-xs font-medium text-white max-w-[64px] truncate text-center">
                      {entry.display_name || entry.username}
                    </p>
                    <p className="text-xs font-bold" style={{ color: "var(--color-accent-light)" }}>
                      {valueLabel(entry)}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* 4位以下 */}
            <div className="px-4 space-y-2">
              {entries.slice(3).map((entry) => (
                <div key={entry.user_id}
                  className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm"
                  style={{
                    border: entry.is_me ? "2px solid var(--color-accent)" : "1px solid var(--color-border)"
                  }}>
                  <span className="w-6 text-center text-sm font-bold text-gray-400">{entry.rank}</span>
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-white font-bold text-sm"
                    style={{ background: entry.is_me ? "var(--color-accent)" : "#94a3b8" }}>
                    {(entry.display_name || entry.username).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {entry.display_name || entry.username}
                      {entry.is_me && <span className="ml-1 text-xs" style={{ color: "var(--color-accent)" }}>（あなた）</span>}
                    </p>
                  </div>
                  <span className="text-sm font-bold" style={{ color: "var(--color-accent)" }}>
                    {valueLabel(entry)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 自分の順位を固定表示 */}
      {myRank && !myRank.is_me && (
        <div
          className="fixed bottom-20 left-4 right-4 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-xl"
          style={{ background: "var(--color-primary)", zIndex: 50 }}>
          <span className="text-sm font-bold text-white">あなたは {myRank.rank}位</span>
          <span className="text-sm text-white/70 flex-1">{valueLabel(myRank)}</span>
        </div>
      )}
    </div>
  );
}
