"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, ArrowLeft, Search, LogIn, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { Group } from "@/types";

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"my" | "discover">("my");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPublic, setNewPublic] = useState(true);
  const [creating, setCreating] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const [{ data: mine }, { data: all }] = await Promise.all([
      supabase
        .from("groups")
        .select("*, group_members!inner(user_id)")
        .eq("group_members.user_id", session.user.id),
      supabase.from("groups").select("*").eq("is_public", true).order("member_count", { ascending: false }).limit(30),
    ]);

    setMyGroups(mine as Group[] || []);
    setGroups(all as Group[] || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: grp } = await supabase.from("groups").insert({
      name: newName.trim(),
      description: newDesc.trim() || null,
      is_public: newPublic,
      created_by: session.user.id,
    }).select("id").single();

    if (grp) {
      await supabase.from("group_members").insert({
        group_id: grp.id, user_id: session.user.id, role: "owner",
      });
      router.push(`/groups/${grp.id}`);
    }
    setCreating(false);
  };

  const handleJoinByCode = async () => {
    if (!inviteCode.trim()) return;
    setJoining(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: grp } = await supabase.from("groups").select("id").eq("invite_code", inviteCode.trim()).single();
    if (!grp) { alert("招待コードが見つかりません"); setJoining(false); return; }

    await supabase.from("group_members").upsert({
      group_id: grp.id, user_id: session.user.id, role: "member",
    }, { onConflict: "group_id,user_id" });

    router.push(`/groups/${grp.id}`);
    setJoining(false);
  };

  const displayed = tab === "my" ? myGroups : groups.filter((g) =>
    !search.trim() || g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--color-surface)" }}>
      <header style={{ background: "var(--color-primary)" }} className="safe-area-top px-4 pt-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <h1 className="text-lg font-bold text-white">グループ</h1>
          </div>
          <button onClick={() => setShowCreate(!showCreate)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
            <Plus className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* 招待コード入力 */}
        <div className="flex gap-2 mb-3">
          <input value={inviteCode} onChange={(e) => setInviteCode(e.target.value)}
            placeholder="招待コードで参加..."
            className="flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none"
          />
          <button onClick={handleJoinByCode} disabled={joining || !inviteCode.trim()}
            className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "var(--color-accent)" }}>
            {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex rounded-xl bg-white/10 p-1 gap-1">
          <button onClick={() => setTab("my")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${tab === "my" ? "bg-white text-[#1a1a2e]" : "text-white/70"}`}>
            参加中
          </button>
          <button onClick={() => setTab("discover")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${tab === "discover" ? "bg-white text-[#1a1a2e]" : "text-white/70"}`}>
            見つける
          </button>
        </div>
      </header>

      {/* グループ作成フォーム */}
      {showCreate && (
        <div className="mx-4 mt-4 rounded-2xl bg-white p-4 shadow-sm space-y-3"
          style={{ border: "1px solid var(--color-border)" }}>
          <p className="text-sm font-semibold text-gray-900">新しいグループを作る</p>
          <input value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="グループ名 *"
            className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
            style={{ borderColor: "var(--color-border)" }} />
          <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
            placeholder="グループの説明（任意）"
            className="w-full rounded-xl border px-3 py-2.5 text-sm resize-none h-16 focus:outline-none"
            style={{ borderColor: "var(--color-border)" }} />
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">公開グループ</span>
            <button onClick={() => setNewPublic(!newPublic)}
              className="relative h-6 w-11 rounded-full transition"
              style={{ background: newPublic ? "var(--color-accent)" : "#d1d5db" }}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${newPublic ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
          <button onClick={handleCreate} disabled={creating || !newName.trim()}
            className="w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--color-accent)" }}>
            {creating ? "作成中..." : "グループを作成"}
          </button>
        </div>
      )}

      <main className="px-4 py-4 space-y-3">
        {tab === "discover" && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="グループを検索"
              className="w-full rounded-xl border bg-white pl-9 pr-4 py-2.5 text-sm focus:outline-none"
              style={{ borderColor: "var(--color-border)" }} />
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-accent)" }} />
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-gray-400">
            <Users className="h-12 w-12 mb-3 opacity-40" />
            <p>{tab === "my" ? "参加中のグループがありません" : "グループが見つかりません"}</p>
          </div>
        ) : (
          displayed.map((g) => (
            <button key={g.id} onClick={() => router.push(`/groups/${g.id}`)}
              className="w-full flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm text-left transition active:scale-[0.98]"
              style={{ border: "1px solid var(--color-border)" }}>
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-white font-bold text-xl"
                style={{ background: "var(--color-accent)" }}>
                {g.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{g.name}</p>
                {g.description && <p className="text-xs text-gray-400 truncate">{g.description}</p>}
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Users className="h-3 w-3" />{g.member_count}人
                  </span>
                  {!g.is_public && <span className="text-xs text-gray-400">🔒 非公開</span>}
                </div>
              </div>
            </button>
          ))
        )}
      </main>
    </div>
  );
}
