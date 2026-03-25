"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, MessageCircle, Clock, BookOpen, ChevronRight, Flame, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { Post, UserProfile } from "@/types";
import { SUBJECT_LABELS } from "@/types";

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const [{ data: prof }, { data: postsData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", session.user.id).single(),
      supabase
        .from("posts")
        .select("*, profiles:user_id(username, display_name, avatar_url), wordbooks:wordbook_id(title, subject)")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    if (prof) setProfile(prof as UserProfile);
    setPosts((postsData as Post[]) || []);
    setLoading(false);
  };

  const handleLike = async (postId: string, isLiked: boolean) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    if (isLiked) {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", session.user.id);
    } else {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: session.user.id });
    }
    loadData();
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--color-surface)" }}>
      {/* ヘッダー */}
      <header style={{ background: "var(--color-primary)" }} className="sticky top-0 z-40 safe-area-top px-4 pt-3 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">昔の人</h1>
          <div className="flex gap-2">
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
              <Bell className="h-5 w-5 text-white" />
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
              <MessageCircle className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        {/* ストリーク / クイックアクセス */}
        {profile && (
          <div className="flex items-center gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1">
            <div className="flex-shrink-0 flex items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1.5">
              <Flame className="h-3.5 w-3.5 text-white" />
              <span className="text-xs font-bold text-white">{profile.study_streak}日連続</span>
            </div>
            <button
              onClick={() => router.push("/translate")}
              className="flex-shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-xs text-white">
              🔍 今日の解析
            </button>
            <button
              onClick={() => router.push("/wordbook")}
              className="flex-shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-xs text-white">
              📚 単語帳
            </button>
            <button
              onClick={() => router.push("/ranking")}
              className="flex-shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-xs text-white">
              🏆 ランキング
            </button>
          </div>
        )}
      </header>

      <main className="px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-accent)" }} />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <BookOpen className="h-16 w-16 mb-4 opacity-30" style={{ color: "var(--color-accent)" }} />
            <h2 className="text-lg font-bold text-gray-700 mb-2">フィードが空です</h2>
            <p className="text-sm text-gray-400 mb-6">古文を解析すると、ここに投稿が流れます</p>
            <button
              onClick={() => router.push("/translate")}
              className="rounded-2xl px-6 py-3 text-sm font-semibold text-white"
              style={{ background: "var(--color-accent)" }}>
              最初の解析をしてみる
            </button>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} onLike={handleLike} />
          ))
        )}
      </main>
    </div>
  );
}

function PostCard({ post, onLike }: { post: Post; onLike: (id: string, isLiked: boolean) => void }) {
  const router = useRouter();
  const typeLabels: Record<string, string> = {
    study_note: "勉強メモ",
    quiz_result: "クイズ結果",
    word_added: "単語追加",
  };
  const typeIcons: Record<string, string> = {
    study_note: "📖",
    quiz_result: "🏆",
    word_added: "✨",
  };

  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
      {/* カードヘッダー */}
      <div className="flex items-center gap-3 p-4 pb-2">
        <button
          onClick={() => router.push(`/profile/${post.user_id}`)}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white font-bold"
          style={{ background: "var(--color-accent)" }}>
          {(post.profiles?.display_name || post.profiles?.username || "?").charAt(0).toUpperCase()}
        </button>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">
            {post.profiles?.display_name || post.profiles?.username || "ユーザー"}
          </p>
          <p className="text-xs text-gray-400">
            {new Date(post.created_at).toLocaleDateString("ja-JP", { month: "long", day: "numeric" })}
          </p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
          {typeIcons[post.post_type]} {typeLabels[post.post_type] || post.post_type}
        </span>
      </div>

      {/* コンテンツ */}
      {post.original_text && (
        <div className="mx-4 mb-2 rounded-xl p-3" style={{ background: "var(--color-surface)" }}>
          <p className="text-xs text-gray-400 mb-1">
            {post.subject ? SUBJECT_LABELS[post.subject] : ""} 原文
          </p>
          <p className="font-serif-ja text-sm text-gray-800 line-clamp-3">{post.original_text}</p>
          {post.translation && (
            <>
              <div className="my-2 border-t" style={{ borderColor: "var(--color-border)" }} />
              <p className="text-xs text-gray-400 mb-1">現代語訳</p>
              <p className="text-sm text-gray-700 line-clamp-2">{post.translation}</p>
            </>
          )}
        </div>
      )}

      {/* アクション */}
      <div className="flex items-center gap-1 px-4 py-3 border-t" style={{ borderColor: "var(--color-border)" }}>
        <button
          onClick={() => onLike(post.id, !!post.is_liked)}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition"
          style={post.is_liked
            ? { background: "#fee2e2", color: "#ef4444" }
            : { color: "#6b7280" }}>
          {post.is_liked ? "❤️" : "🤍"} {post.likes_count}
        </button>
        <button className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-gray-500">
          💬 {post.comments_count}
        </button>
      </div>
    </div>
  );
}
