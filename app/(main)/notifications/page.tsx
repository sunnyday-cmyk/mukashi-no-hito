"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, Heart, MessageCircle, UserPlus, Loader2, CheckCheck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface Notification {
  id: string;
  user_id: string;
  from_user_id: string | null;
  type: "like" | "comment" | "follow";
  post_id: string | null;
  comment_body: string | null;
  is_read: boolean;
  created_at: string;
  from_profile?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

const TYPE_ICON = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
};

const TYPE_COLOR = {
  like: "#ef4444",
  comment: "#7c6fe0",
  follow: "#22c55e",
};

const TYPE_LABEL = {
  like: "があなたの投稿にいいねしました",
  comment: "があなたの投稿にコメントしました",
  follow: "があなたをフォローしました",
};

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

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }

    const { data } = await supabase
      .from("notifications")
      .select("*, from_profile:from_user_id(username, display_name, avatar_url)")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    setNotifications((data as Notification[]) || []);
    setLoading(false);

    // ページ表示時に全件既読にする
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", session.user.id)
      .eq("is_read", false);
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", session.user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setMarkingAll(false);
  };

  const handleTap = (n: Notification) => {
    if (n.post_id) {
      router.push(`/posts/${n.post_id}`);
    } else if (n.from_user_id && n.type === "follow") {
      router.push(`/profile/${n.from_user_id}`);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen" style={{ background: "var(--color-surface)" }}>
      {/* ヘッダー */}
      <header
        style={{ background: "var(--color-primary)" }}
        className="sticky top-0 z-40 safe-area-top px-4 pt-3 pb-3"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">通知</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-white/60">{unreadCount}件の未読</p>
            )}
          </div>
          {notifications.some((n) => !n.is_read) && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs text-white"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              すべて既読
            </button>
          )}
        </div>
      </header>

      <main className="divide-y" style={{ borderColor: "var(--color-border)" }}>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-accent)" }} />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center px-6">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full mb-4"
              style={{ background: "var(--color-border)" }}
            >
              <Bell className="h-8 w-8" style={{ color: "var(--color-accent)", opacity: 0.5 }} />
            </div>
            <p className="text-gray-600 font-medium">通知はありません</p>
            <p className="text-sm text-gray-400 mt-1">
              いいね・コメント・フォローがあると<br />ここに表示されます
            </p>
          </div>
        ) : (
          notifications.map((n) => {
            const Icon = TYPE_ICON[n.type];
            const color = TYPE_COLOR[n.type];
            const fromName =
              n.from_profile?.display_name || n.from_profile?.username || "ユーザー";
            const fromInitial = fromName.charAt(0).toUpperCase();

            return (
              <button
                key={n.id}
                onClick={() => handleTap(n)}
                className="flex w-full items-start gap-3 px-4 py-4 text-left transition active:bg-gray-50"
                style={!n.is_read ? { background: "rgba(124,111,224,0.04)" } : {}}
              >
                {/* 相手のアバター + 通知タイプアイコン */}
                <div className="relative flex-shrink-0">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full text-white font-bold"
                    style={{ background: "var(--color-accent)" }}
                  >
                    {fromInitial}
                  </div>
                  <div
                    className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white"
                    style={{ backgroundColor: color }}
                  >
                    <Icon className="h-3 w-3 text-white" />
                  </div>
                </div>

                {/* テキスト */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 leading-snug">
                    <span className="font-semibold">{fromName}</span>
                    <span className="text-gray-600">{TYPE_LABEL[n.type]}</span>
                  </p>
                  {n.comment_body && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      「{n.comment_body}」
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                </div>

                {/* 未読ドット */}
                {!n.is_read && (
                  <div
                    className="flex-shrink-0 mt-1 h-2.5 w-2.5 rounded-full"
                    style={{ background: "var(--color-accent)" }}
                  />
                )}
              </button>
            );
          })
        )}
      </main>
    </div>
  );
}
