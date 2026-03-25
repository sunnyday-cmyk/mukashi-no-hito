"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Flame, Loader2, UserPlus, UserCheck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { UserProfile, Wordbook } from "@/types";
import { SUBJECT_LABELS } from "@/types";

export default function UserProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wordbooks, setWordbooks] = useState<Wordbook[]>([]);
  const [masteredCount, setMasteredCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => { load(); }, [userId]);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setMyId(session?.user.id || null);

    const [{ data: prof }, { data: wbs }, { data: mastered }, followData] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("wordbooks").select("*").eq("user_id", userId).eq("is_public", true).order("updated_at", { ascending: false }),
      supabase.from("word_progress").select("id").eq("user_id", userId).eq("is_mastered", true),
      session
        ? supabase.from("follows").select("id").eq("follower_id", session.user.id).eq("following_id", userId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    setProfile(prof as UserProfile);
    setWordbooks((wbs as Wordbook[]) || []);
    setMasteredCount(mastered?.length || 0);
    setIsFollowing(!!(followData as { data: Record<string, unknown> | null }).data);
    setLoading(false);
  };

  const toggleFollow = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !myId || myId === userId) return;

    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", myId).eq("following_id", userId);
    } else {
      await supabase.from("follows").insert({ follower_id: myId, following_id: userId });
    }
    setIsFollowing(!isFollowing);
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-accent)" }} />
    </div>
  );

  if (!profile) return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-gray-500">ユーザーが見つかりません</p>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--color-surface)" }}>
      <header style={{ background: "var(--color-primary)" }} className="safe-area-top px-4 pt-4 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <h1 className="text-lg font-bold text-white flex-1">{profile.display_name || profile.username}</h1>
          {myId && myId !== userId && (
            <button onClick={toggleFollow}
              className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition"
              style={isFollowing
                ? { background: "rgba(255,255,255,0.2)", color: "white" }
                : { background: "var(--color-accent)", color: "white" }}>
              {isFollowing ? <><UserCheck className="h-4 w-4" /> フォロー中</> : <><UserPlus className="h-4 w-4" /> フォロー</>}
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex h-18 w-18 items-center justify-center rounded-full text-white text-3xl font-bold shadow-lg"
            style={{ background: "var(--color-accent)", width: "72px", height: "72px" }}>
            {(profile.display_name || profile.username).charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-xl font-bold text-white">{profile.display_name || profile.username}</p>
            <p className="text-sm text-white/60">@{profile.username}</p>
            {profile.target_school && (
              <p className="text-xs text-white/50 mt-0.5">🎯 {profile.target_school}</p>
            )}
            {profile.bio && <p className="text-xs text-white/70 mt-1">{profile.bio}</p>}
          </div>
        </div>

        <div className="flex gap-4 mt-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-400">{profile.study_streak}</p>
            <p className="text-xs text-white/60">連続日数</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{wordbooks.length}</p>
            <p className="text-xs text-white/60">公開単語帳</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{masteredCount}</p>
            <p className="text-xs text-white/60">習得語</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">公開単語帳</h2>
        {wordbooks.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-gray-400">
            <BookOpen className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm">公開単語帳がありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {wordbooks.map((wb) => (
              <button key={wb.id} onClick={() => router.push(`/wordbook/${wb.id}`)}
                className="flex flex-col rounded-2xl p-4 text-white text-left shadow-sm active:scale-[0.97] transition"
                style={{ background: wb.cover_color || "var(--color-accent)", minHeight: "100px" }}>
                <span className="text-2xl font-bold">{wb.title.charAt(0)}</span>
                <p className="mt-auto text-sm font-semibold leading-tight">{wb.title}</p>
                <p className="text-xs text-white/70">
                  {wb.word_count}語 · {SUBJECT_LABELS[wb.subject as import("@/types").Subject]}
                </p>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
