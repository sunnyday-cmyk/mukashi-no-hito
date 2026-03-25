"use client";

import { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Heart, Send, Loader2, BookOpen, Languages, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { Post, PostComment } from "@/types";
import { SUBJECT_LABELS } from "@/types";

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

const POST_TYPE_LABEL: Record<string, string> = {
  study_note: "勉強メモ",
  quiz_result: "クイズ結果",
  word_added: "単語追加",
};
const POST_TYPE_ICON: Record<string, string> = {
  study_note: "📖",
  quiz_result: "🏆",
  word_added: "✨",
};

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentInput, setCommentInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    setMyId(session?.user.id || null);

    const [{ data: postData }, { data: commentsData }, likeData] = await Promise.all([
      supabase
        .from("posts")
        .select("*, profiles:user_id(username, display_name, avatar_url)")
        .eq("id", id)
        .single(),
      supabase
        .from("post_comments")
        .select("*, profiles:user_id(username, display_name, avatar_url)")
        .eq("post_id", id)
        .order("created_at", { ascending: true }),
      session
        ? supabase
            .from("post_likes")
            .select("id")
            .eq("post_id", id)
            .eq("user_id", session.user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    if (postData) {
      setPost(postData as Post);
      setLikesCount((postData as Post).likes_count || 0);
    }
    setComments((commentsData as PostComment[]) || []);
    setLiked(!!(likeData as { data: Record<string, unknown> | null }).data);
    setLoading(false);
  };

  const handleLike = async () => {
    if (!myId) return;
    if (liked) {
      await supabase.from("post_likes").delete().eq("post_id", id).eq("user_id", myId);
      setLiked(false);
      setLikesCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from("post_likes").insert({ post_id: id, user_id: myId });
      setLiked(true);
      setLikesCount((c) => c + 1);
    }
  };

  const handleComment = async () => {
    if (!commentInput.trim() || !myId) return;
    setSubmitting(true);

    const { data } = await supabase
      .from("post_comments")
      .insert({ post_id: id, user_id: myId, body: commentInput.trim() })
      .select("*, profiles:user_id(username, display_name, avatar_url)")
      .single();

    if (data) {
      setComments((prev) => [...prev, data as PostComment]);
      setCommentInput("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
    setSubmitting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("このコメントを削除しますか？")) return;
    await supabase.from("post_comments").delete().eq("id", commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-accent)" }} />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p className="text-gray-500">投稿が見つかりません</p>
        <button onClick={() => router.back()} className="mt-4 text-sm" style={{ color: "var(--color-accent)" }}>
          戻る
        </button>
      </div>
    );
  }

  const posterName = post.profiles?.display_name || post.profiles?.username || "ユーザー";
  const posterInitial = posterName.charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--color-surface)" }}>
      {/* ヘッダー */}
      <header
        style={{ background: "var(--color-primary)" }}
        className="sticky top-0 z-40 safe-area-top px-4 py-3"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <h1 className="text-base font-bold text-white flex-1">投稿の詳細</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {/* 投稿本体 */}
        <div className="bg-white mx-4 mt-4 rounded-2xl shadow-sm overflow-hidden"
          style={{ border: "1px solid var(--color-border)" }}>
          {/* 投稿者情報 */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            <button
              onClick={() => router.push(`/profile/${post.user_id}`)}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-white font-bold"
              style={{ background: "var(--color-accent)" }}
            >
              {posterInitial}
            </button>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{posterName}</p>
              <p className="text-xs text-gray-400">{timeAgo(post.created_at)}</p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
              {POST_TYPE_ICON[post.post_type] || "📝"} {POST_TYPE_LABEL[post.post_type] || post.post_type}
            </span>
          </div>

          {/* 科目バッジ */}
          {post.subject && (
            <div className="px-4 pb-2">
              <span
                className="inline-block rounded-full px-3 py-0.5 text-xs text-white font-medium"
                style={{ background: "var(--color-accent)" }}
              >
                {SUBJECT_LABELS[post.subject]}
              </span>
            </div>
          )}

          {/* 本文コンテンツ */}
          {post.original_text && (
            <div className="mx-4 mb-3 rounded-xl p-4" style={{ background: "var(--color-surface)" }}>
              <div className="flex items-center gap-1.5 mb-2" style={{ color: "var(--color-primary)" }}>
                <BookOpen className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">原文</span>
              </div>
              <p className="font-serif-ja text-sm text-gray-900 leading-loose whitespace-pre-wrap">
                {post.original_text}
              </p>

              {post.translation && (
                <>
                  <div className="my-3 border-t" style={{ borderColor: "var(--color-border)" }} />
                  <div className="flex items-center gap-1.5 mb-2" style={{ color: "#4338ca" }}>
                    <Languages className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">現代語訳</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {post.translation}
                  </p>
                </>
              )}
            </div>
          )}

          {/* いいね */}
          <div className="flex items-center gap-3 px-4 py-3 border-t" style={{ borderColor: "var(--color-border)" }}>
            <button
              onClick={handleLike}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition active:scale-90"
              style={liked
                ? { background: "#fee2e2", color: "#ef4444" }
                : { background: "#f3f4f6", color: "#6b7280" }}
            >
              <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
              {likesCount}
            </button>
            <span className="text-xs text-gray-400">{comments.length}件のコメント</span>
          </div>
        </div>

        {/* コメント一覧 */}
        <div className="px-4 mt-4 space-y-3 pb-32">
          <h2 className="text-sm font-semibold text-gray-700">コメント</h2>

          {comments.length === 0 ? (
            <div className="rounded-2xl bg-white p-6 text-center shadow-sm"
              style={{ border: "1px solid var(--color-border)" }}>
              <p className="text-sm text-gray-400">まだコメントはありません</p>
              <p className="text-xs text-gray-300 mt-1">最初のコメントを書いてみよう</p>
            </div>
          ) : (
            comments.map((c) => {
              const name = c.profiles?.display_name || c.profiles?.username || "ユーザー";
              return (
                <div key={c.id} className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm"
                  style={{ border: "1px solid var(--color-border)" }}>
                  <button
                    onClick={() => router.push(`/profile/${c.user_id}`)}
                    className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ background: c.user_id === myId ? "var(--color-accent)" : "#94a3b8" }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-900">{name}</p>
                      <p className="text-xs text-gray-300 flex-shrink-0">{timeAgo(c.created_at)}</p>
                    </div>
                    <p className="text-sm text-gray-700 mt-1 leading-relaxed whitespace-pre-wrap">{c.body}</p>
                  </div>
                  {c.user_id === myId && (
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      className="flex-shrink-0 h-7 w-7 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* コメント入力エリア（固定） */}
      <div
        className="fixed bottom-0 left-0 right-0 border-t bg-white px-4 py-3 pb-safe z-40"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div
          className="flex items-center gap-2 rounded-2xl border px-3 py-2"
          style={{ borderColor: "var(--color-border)" }}
        >
          <input
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
            placeholder={myId ? "コメントを入力..." : "ログインしてコメントしよう"}
            disabled={!myId}
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none py-1"
          />
          <button
            onClick={handleComment}
            disabled={!commentInput.trim() || submitting || !myId}
            className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-xl text-white transition active:scale-90 disabled:opacity-40"
            style={{ background: "var(--color-accent)" }}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
