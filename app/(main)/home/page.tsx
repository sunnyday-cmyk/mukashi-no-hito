"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, MessageCircle, BookOpen, Flame, Loader2, Heart } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { Post, UserProfile } from "@/types";
import { SUBJECT_LABELS } from "@/types";

/** シードで投入する公式単語帳タイトル（is_official が未設定でもヒットさせる） */
const OFFICIAL_WORDBOOK_TITLE = "英検２級レベル";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  const hour = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  if (hour < 24) return `${hour}時間前`;
  return `${day}日前`;
}

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [myId, setMyId] = useState<string | null>(null);
  const [officialWordbooks, setOfficialWordbooks] = useState<
    { id: string; title: string; word_count: number; cover_color: string | null; subject: string }[]
  >([]);

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setMyId(null);
      setProfile(null);
      setPosts([]);
      setOfficialWordbooks([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    setMyId(session.user.id);

    const [{ data: prof }, { data: postsData }, { count: unread }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", session.user.id).single(),
      supabase
        .from("posts")
        .select("*, profiles:user_id(username, display_name, avatar_url), wordbooks:wordbook_id(title, subject)")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .eq("is_read", false),
    ]);

    if (prof) setProfile(prof as UserProfile);
    setPosts((postsData as Post[]) || []);
    setUnreadCount(unread || 0);

    let officialRows: { id: string; title: string; word_count: number; cover_color: string | null; subject: string }[] =
      [];
    const { data: byFlag, error: errFlag } = await supabase
      .from("wordbooks")
      .select("id,title,word_count,cover_color,subject")
      .eq("is_public", true)
      .eq("is_official", true)
      .order("title");
    if (errFlag) {
      console.error("[home] wordbooks is_official query:", errFlag.message);
    } else if (byFlag?.length) {
      officialRows = byFlag;
    }

    if (officialRows.length === 0) {
      const { data: byTitle, error: errTitle } = await supabase
        .from("wordbooks")
        .select("id,title,word_count,cover_color,subject")
        .eq("is_public", true)
        .eq("title", OFFICIAL_WORDBOOK_TITLE)
        .order("title");
      if (errTitle) {
        console.error("[home] wordbooks title fallback:", errTitle.message);
      } else if (byTitle?.length) {
        officialRows = byTitle;
      }
    }

    setOfficialWordbooks(officialRows);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "INITIAL_SESSION" || event === "SIGNED_IN") && session) {
        void loadData();
      }
      if (event === "SIGNED_OUT") {
        setMyId(null);
        setProfile(null);
        setPosts([]);
        setOfficialWordbooks([]);
        setUnreadCount(0);
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [loadData]);

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!myId) return;
    if (isLiked) {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", myId);
    } else {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: myId });
    }
    // 楽観的更新
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              is_liked: !isLiked,
              likes_count: isLiked ? p.likes_count - 1 : p.likes_count + 1,
            }
          : p
      )
    );
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--color-surface)" }}>
      {/* ヘッダー */}
      <header
        style={{ background: "var(--color-primary)" }}
        className="sticky top-0 z-40 safe-area-top px-4 pt-3 pb-3"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">STUDY ROYALE</h1>
          <div className="flex gap-2">
            {/* 通知ベル（未読バッジ付き） */}
            <button
              onClick={() => router.push("/notifications")}
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition active:bg-white/20"
              aria-label="通知"
            >
              <Bell className="h-5 w-5 text-white" />
              {unreadCount > 0 && (
                <span
                  className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{ background: "#ef4444" }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* AI勉強相談チャット */}
            <button
              onClick={() => router.push("/chat")}
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition active:bg-white/20"
              aria-label="AI勉強相談"
            >
              <MessageCircle className="h-5 w-5 text-white" />
              {/* 新機能バッジ */}
              <span
                className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white"
                style={{ background: "var(--color-accent)" }}
              >
                AI
              </span>
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
              className="flex-shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-xs text-white transition active:bg-white/25">
              🔍 今日の解析
            </button>
            <button
              onClick={() => router.push("/wordbook")}
              className="flex-shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-xs text-white transition active:bg-white/25">
              📚 単語帳
            </button>
            <button
              onClick={() => router.push("/chat")}
              className="flex-shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-xs text-white transition active:bg-white/25">
              🤖 AI相談
            </button>
          </div>
        )}
      </header>

      <main className="px-4 py-4 space-y-4">
        {!loading && officialWordbooks.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-bold text-gray-700">公式おすすめ</h2>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {officialWordbooks.map((wb) => (
                <button
                  key={wb.id}
                  type="button"
                  onClick={() => router.push(`/wordbook/${wb.id}`)}
                  className="flex h-36 w-36 flex-shrink-0 flex-col justify-between rounded-2xl p-3 text-left text-white shadow-md transition active:scale-[0.98]"
                  style={{ background: wb.cover_color || "var(--color-accent)" }}
                >
                  <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-semibold w-fit">公式</span>
                  <div>
                    <p className="text-sm font-bold leading-tight line-clamp-3">{wb.title}</p>
                    <p className="mt-1 text-xs text-white/80">{wb.word_count}語 · {SUBJECT_LABELS[wb.subject as import("@/types").Subject] || wb.subject}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
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
            <PostCard key={post.id} post={post} myId={myId} onLike={handleLike} />
          ))
        )}
      </main>
    </div>
  );
}

function PostCard({
  post,
  myId,
  onLike,
}: {
  post: Post;
  myId: string | null;
  onLike: (id: string, isLiked: boolean) => void;
}) {
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

  const posterName = post.profiles?.display_name || post.profiles?.username || "ユーザー";

  return (
    <div
      className="rounded-2xl bg-white shadow-sm overflow-hidden transition active:scale-[0.99]"
      style={{ border: "1px solid var(--color-border)" }}
    >
      {/* カードヘッダー — タップで詳細へ */}
      <button
        onClick={() => router.push(`/posts/${post.id}`)}
        className="w-full flex items-center gap-3 p-4 pb-2 text-left"
      >
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white font-bold"
          style={{ background: "var(--color-accent)" }}
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/profile/${post.user_id}`);
          }}
        >
          {posterName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">{posterName}</p>
          <p className="text-xs text-gray-400">{timeAgo(post.created_at)}</p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
          {typeIcons[post.post_type] || "📝"} {typeLabels[post.post_type] || post.post_type}
        </span>
      </button>

      {/* コンテンツ — タップで詳細へ */}
      {post.original_text && (
        <button
          onClick={() => router.push(`/posts/${post.id}`)}
          className="w-full mx-4 mb-2 rounded-xl p-3 text-left w-[calc(100%-32px)]"
          style={{ background: "var(--color-surface)" }}
        >
          {post.subject && (
            <p className="text-xs text-gray-400 mb-1">
              {SUBJECT_LABELS[post.subject]} 原文
            </p>
          )}
          <p className="font-serif-ja text-sm text-gray-800 line-clamp-3">{post.original_text}</p>
          {post.translation && (
            <>
              <div className="my-2 border-t" style={{ borderColor: "var(--color-border)" }} />
              <p className="text-xs text-gray-400 mb-1">現代語訳</p>
              <p className="text-sm text-gray-700 line-clamp-2">{post.translation}</p>
            </>
          )}
        </button>
      )}

      {/* アクション */}
      <div
        className="flex items-center gap-1 px-4 py-3 border-t"
        style={{ borderColor: "var(--color-border)" }}
      >
        <button
          onClick={() => onLike(post.id, !!post.is_liked)}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition active:scale-90"
          style={
            post.is_liked
              ? { background: "#fee2e2", color: "#ef4444" }
              : { color: "#9ca3af" }
          }
        >
          <Heart className={`h-3.5 w-3.5 ${post.is_liked ? "fill-current" : ""}`} />
          {post.likes_count}
        </button>
        <button
          onClick={() => router.push(`/posts/${post.id}`)}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-gray-400"
        >
          💬 {post.comments_count}
        </button>
        {/* 詳細を見るリンク */}
        <button
          onClick={() => router.push(`/posts/${post.id}`)}
          className="ml-auto text-xs transition"
          style={{ color: "var(--color-accent)" }}
        >
          詳細を見る →
        </button>
      </div>
    </div>
  );
}
