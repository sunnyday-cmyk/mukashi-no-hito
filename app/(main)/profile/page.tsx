"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, BookOpen, Flame, Trophy, Clock, LogOut, Loader2, Camera } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { UserProfile, Wordbook } from "@/types";
import { SUBJECT_LABELS } from "@/types";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wordbooks, setWordbooks] = useState<Wordbook[]>([]);
  const [masteredCount, setMasteredCount] = useState(0);
  const [quizCount, setQuizCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSchool, setEditSchool] = useState("");
  const [editBio, setEditBio] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }

    const [{ data: prof }, { data: wbs }, { data: mastered }, { data: quizzes }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", session.user.id).single(),
      supabase.from("wordbooks").select("*").eq("user_id", session.user.id).order("updated_at", { ascending: false }),
      supabase.from("word_progress").select("id").eq("user_id", session.user.id).eq("is_mastered", true),
      supabase.from("quiz_results").select("id").eq("user_id", session.user.id),
    ]);

    setProfile(prof as UserProfile);
    setWordbooks((wbs as Wordbook[]) || []);
    setMasteredCount(mastered?.length || 0);
    setQuizCount(quizzes?.length || 0);
    setLoading(false);
  };

  const handleSignOut = async () => {
    if (!confirm("ログアウトしますか？")) return;
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("profiles").update({
      display_name: editName.trim() || null,
      target_school: editSchool.trim() || null,
      bio: editBio.trim() || null,
    }).eq("id", session.user.id);
    setProfile({ ...profile, display_name: editName || null, target_school: editSchool || null, bio: editBio || null });
    setSaving(false);
    setEditMode(false);
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-accent)" }} />
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--color-surface)" }}>
      {/* ヘッダー */}
      <header style={{ background: "var(--color-primary)" }} className="safe-area-top px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-white">プロフィール</h1>
          <div className="flex gap-2">
            <button onClick={() => {
              setEditName(profile?.display_name || "");
              setEditSchool(profile?.target_school || "");
              setEditBio(profile?.bio || "");
              setEditMode(!editMode);
            }} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
              <Settings className="h-5 w-5 text-white" />
            </button>
            <button onClick={handleSignOut}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
              <LogOut className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        {/* アバター & ユーザー情報 */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full text-white text-3xl font-bold shadow-lg"
              style={{ background: "var(--color-accent)" }}>
              {(profile?.display_name || profile?.username || "?").charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
              <Flame className="h-4 w-4 text-orange-400" />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-xl font-bold text-white">{profile?.display_name || profile?.username}</p>
            <p className="text-sm text-white/60">@{profile?.username}</p>
            {profile?.target_school && (
              <p className="text-xs text-white/50 mt-0.5">🎯 {profile.target_school}</p>
            )}
          </div>
        </div>

        {/* ストリーク + フォロワー */}
        <div className="flex gap-4 mt-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-400">{profile?.study_streak || 0}</p>
            <p className="text-xs text-white/60">連続日数</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{wordbooks.length}</p>
            <p className="text-xs text-white/60">単語帳</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{masteredCount}</p>
            <p className="text-xs text-white/60">習得語</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{quizCount}</p>
            <p className="text-xs text-white/60">クイズ</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {/* 編集フォーム */}
        {editMode && (
          <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3" style={{ border: "1px solid var(--color-border)" }}>
            <p className="text-sm font-semibold text-gray-900">プロフィール編集</p>
            <input value={editName} onChange={(e) => setEditName(e.target.value)}
              placeholder="表示名"
              className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
              style={{ borderColor: "var(--color-border)" }} />
            <input value={editSchool} onChange={(e) => setEditSchool(e.target.value)}
              placeholder="志望校（例: 東京大学）"
              className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
              style={{ borderColor: "var(--color-border)" }} />
            <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)}
              placeholder="一言自己紹介"
              className="w-full rounded-xl border px-3 py-2.5 text-sm resize-none h-16 focus:outline-none"
              style={{ borderColor: "var(--color-border)" }} />
            <div className="flex gap-2">
              <button onClick={() => setEditMode(false)}
                className="flex-1 rounded-xl border py-2.5 text-sm font-medium"
                style={{ borderColor: "var(--color-border)" }}>
                キャンセル
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: "var(--color-accent)" }}>
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        )}

        {/* bio */}
        {profile?.bio && !editMode && (
          <div className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: "1px solid var(--color-border)" }}>
            <p className="text-sm text-gray-700">{profile.bio}</p>
          </div>
        )}

        {/* 単語帳グリッド */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">マイ単語帳</h2>
            <button onClick={() => router.push("/wordbook")}
              className="text-xs" style={{ color: "var(--color-accent)" }}>
              すべて見る
            </button>
          </div>
          {wordbooks.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-gray-400">
              <BookOpen className="h-10 w-10 mb-2 opacity-40" />
              <p className="text-sm">単語帳がありません</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {wordbooks.slice(0, 6).map((wb) => (
                <button key={wb.id} onClick={() => router.push(`/wordbook/${wb.id}`)}
                  className="flex flex-col rounded-2xl p-4 text-white text-left shadow-sm active:scale-[0.97] transition"
                  style={{ background: wb.cover_color || "var(--color-accent)", minHeight: "100px" }}>
                  <span className="text-2xl font-bold">{wb.title.charAt(0)}</span>
                  <p className="mt-auto text-sm font-semibold leading-tight truncate">{wb.title}</p>
                  <p className="text-xs text-white/70">{wb.word_count}語 · {SUBJECT_LABELS[wb.subject as import("@/types").Subject]}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ランキングへ */}
        <button onClick={() => router.push("/ranking")}
          className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 shadow-sm active:scale-[0.98] transition"
          style={{ border: "1px solid var(--color-border)" }}>
          <Trophy className="h-8 w-8 flex-shrink-0" style={{ color: "var(--color-accent)" }} />
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-gray-900">ランキングを見る</p>
            <p className="text-xs text-gray-400">クイズ正答率・連続日数・習得語数で競おう</p>
          </div>
        </button>
      </main>
    </div>
  );
}
