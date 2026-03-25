"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Copy, Check, BookOpen, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { Group, GroupMember } from "@/types";

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setMyId(session?.user.id || null);

    const [{ data: grp }, { data: mems }] = await Promise.all([
      supabase.from("groups").select("*").eq("id", id).single(),
      supabase.from("group_members").select("*, profiles:user_id(username, display_name, avatar_url)").eq("group_id", id),
    ]);

    setGroup(grp as Group);
    setMembers((mems as GroupMember[]) || []);
    setIsMember(mems?.some((m: GroupMember) => m.user_id === session?.user.id) || false);
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!myId) { router.replace("/login"); return; }
    setJoining(true);
    await supabase.from("group_members").upsert({
      group_id: id, user_id: myId, role: "member",
    }, { onConflict: "group_id,user_id" });
    await supabase.from("groups").update({ member_count: (group?.member_count || 0) + 1 }).eq("id", id);
    setIsMember(true);
    setJoining(false);
    load();
  };

  const handleLeave = async () => {
    if (!myId || !confirm("グループを退出しますか？")) return;
    await supabase.from("group_members").delete().eq("group_id", id).eq("user_id", myId);
    router.replace("/groups");
  };

  const copyInviteCode = async () => {
    if (!group?.invite_code) return;
    await navigator.clipboard.writeText(group.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-accent)" }} />
    </div>
  );

  if (!group) return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-gray-500">グループが見つかりません</p>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--color-surface)" }}>
      <header style={{ background: "var(--color-accent)" }} className="safe-area-top px-4 pt-4 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <h1 className="text-lg font-bold text-white flex-1">{group.name}</h1>
          {isMember ? (
            <button onClick={handleLeave}
              className="rounded-full border border-white/30 px-3 py-1.5 text-xs text-white">
              退出
            </button>
          ) : (
            <button onClick={handleJoin} disabled={joining}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold"
              style={{ color: "var(--color-accent)" }}>
              {joining ? "参加中..." : "参加する"}
            </button>
          )}
        </div>
        {group.description && <p className="text-sm text-white/80">{group.description}</p>}
        <div className="flex items-center gap-3 mt-3">
          <span className="flex items-center gap-1 text-xs text-white/70">
            <Users className="h-3.5 w-3.5" />{group.member_count}人
          </span>
          {!group.is_public && <span className="text-xs text-white/70">🔒 非公開</span>}
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {/* 招待コード */}
        {isMember && group.invite_code && (
          <div className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: "1px solid var(--color-border)" }}>
            <p className="text-xs font-medium text-gray-500 mb-2">招待コード</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-xl bg-gray-50 px-3 py-2 text-sm font-mono text-gray-900">
                {group.invite_code}
              </code>
              <button onClick={copyInviteCode}
                className="flex h-9 w-9 items-center justify-center rounded-xl transition"
                style={{ background: copied ? "#dcfce7" : "var(--color-accent)" }}>
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-white" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">このコードを共有して友達を招待しよう</p>
          </div>
        )}

        {/* メンバー一覧 */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">メンバー ({members.length}人)</h2>
          <div className="space-y-2">
            {members.map((m) => (
              <button key={m.id} onClick={() => router.push(`/profile/${m.user_id}`)}
                className="w-full flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm text-left"
                style={{ border: "1px solid var(--color-border)" }}>
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white font-bold"
                  style={{ background: m.user_id === myId ? "var(--color-accent)" : "#94a3b8" }}>
                  {((m.profiles?.display_name || m.profiles?.username || "?").charAt(0)).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {m.profiles?.display_name || m.profiles?.username}
                    {m.user_id === myId && <span className="ml-1 text-xs text-gray-400">（あなた）</span>}
                  </p>
                  {m.role === "owner" && (
                    <span className="text-xs font-medium" style={{ color: "var(--color-accent)" }}>オーナー</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
