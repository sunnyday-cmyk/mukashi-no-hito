"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Play, Brain, Trash2, Globe, Lock, Loader2, Swords, LogIn } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { Wordbook, Word } from "@/types";
import { SUBJECT_LABELS } from "@/types";

export default function WordbookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [wordbook, setWordbook] = useState<Wordbook | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [addFront, setAddFront] = useState("");
  const [addBack, setAddBack] = useState("");
  const [addReading, setAddReading] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [battleLoading, setBattleLoading] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();

    const [{ data: wb }, { data: wds }] = await Promise.all([
      supabase.from("wordbooks").select("*").eq("id", id).single(),
      supabase.from("words").select("*").eq("wordbook_id", id).order("sort_order").order("created_at"),
    ]);

    if (wb) {
      setWordbook(wb as Wordbook);
      setIsOwner(session?.user.id === wb.user_id);
    }
    setWords(wds as Word[] || []);
    setLoading(false);
  };

  const togglePublic = async () => {
    if (!wordbook) return;
    const { error } = await supabase
      .from("wordbooks")
      .update({ is_public: !wordbook.is_public })
      .eq("id", id);
    if (!error) setWordbook({ ...wordbook, is_public: !wordbook.is_public });
  };

  const handleAddWord = async () => {
    if (!addFront.trim() || !addBack.trim()) return;
    setAddLoading(true);
    const { data } = await supabase.from("words").insert({
      wordbook_id: id,
      front: addFront.trim(),
      reading: addReading.trim() || null,
      back: addBack.trim(),
      sort_order: words.length,
    }).select().single();

    if (data) {
      setWords((prev) => [...prev, data as Word]);
      setAddFront(""); setAddBack(""); setAddReading("");
    }
    setAddLoading(false);
  };

  const handleDeleteWord = async (wordId: string) => {
    if (!confirm("この単語を削除しますか？")) return;
    await supabase.from("words").delete().eq("id", wordId);
    setWords((prev) => prev.filter((w) => w.id !== wordId));
  };

  const generateInviteCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  const handleCreateBattle = async () => {
    if (words.length < 4) { alert("対戦には4語以上必要です"); return; }
    setBattleLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }

    // 問題セットを生成（最大10問）
    const shuffled = [...words].sort(() => Math.random() - 0.5).slice(0, Math.min(10, words.length));
    const questions = shuffled.map((word) => {
      const others = words.filter((w) => w.id !== word.id).sort(() => Math.random() - 0.5).slice(0, 3).map((w) => w.back);
      const options = [...others, word.back].sort(() => Math.random() - 0.5);
      return { word_id: word.id, front: word.front, reading: word.reading || null, back: word.back, options };
    });

    let inviteCode = generateInviteCode();
    let attempts = 0;
    while (attempts < 5) {
      const { data, error } = await supabase.from("battle_rooms").insert({
        invite_code: inviteCode,
        wordbook_id: id,
        host_id: session.user.id,
        questions,
        question_count: questions.length,
      }).select("id").single();
      if (!error && data) {
        router.push(`/battle/${data.id}`);
        return;
      }
      inviteCode = generateInviteCode();
      attempts++;
    }
    alert("ルームの作成に失敗しました。もう一度試してください。");
    setBattleLoading(false);
  };

  const handleJoinBattle = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) { alert("6文字の招待コードを入力してください"); return; }
    setJoinLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }

    const { data: room } = await supabase
      .from("battle_rooms")
      .select("id, host_id, status")
      .eq("invite_code", code)
      .eq("status", "waiting")
      .single();

    if (!room) { alert("有効な招待コードが見つかりません"); setJoinLoading(false); return; }
    if (room.host_id === session.user.id) { alert("自分が作成したルームには参加できません"); setJoinLoading(false); return; }

    await supabase.from("battle_rooms").update({
      guest_id: session.user.id,
      status: "playing",
      started_at: new Date().toISOString(),
    }).eq("id", room.id);

    router.push(`/battle/${room.id}`);
  };

  const handleDeleteWordbook = async () => {
    if (!confirm(`「${wordbook?.title}」を削除しますか？この操作は元に戻せません。`)) return;
    await supabase.from("wordbooks").delete().eq("id", id);
    router.replace("/wordbook");
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-accent)" }} />
    </div>
  );

  if (!wordbook) return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-gray-500">単語帳が見つかりません</p>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--color-surface)" }}>
      {/* ヘッダー */}
      <header style={{ background: wordbook.cover_color || "var(--color-accent)" }} className="safe-area-top px-4 pt-4 pb-5">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/20">
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          {isOwner && (
            <div className="flex gap-2">
              <button onClick={togglePublic}
                className="flex h-9 items-center gap-1 rounded-full bg-black/20 px-3 text-xs text-white">
                {wordbook.is_public ? <><Globe className="h-3.5 w-3.5" /> 公開中</> : <><Lock className="h-3.5 w-3.5" /> 非公開</>}
              </button>
              <button onClick={handleDeleteWordbook}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/20">
                <Trash2 className="h-4 w-4 text-white" />
              </button>
            </div>
          )}
        </div>
        <div className="mt-4">
          <h1 className="text-2xl font-bold text-white">{wordbook.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-white/70">{SUBJECT_LABELS[wordbook.subject as import("@/types").Subject] || wordbook.subject}</span>
            <span className="text-white/40">·</span>
            <span className="text-xs text-white/70">{wordbook.word_count}語</span>
          </div>
          {wordbook.description && <p className="text-sm text-white/70 mt-1">{wordbook.description}</p>}
        </div>
      </header>

      {/* アクションボタン */}
      <div className="flex gap-2 p-4 pb-2">
        <button onClick={() => router.push(`/wordbook/${id}/study`)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-3 text-xs font-semibold text-white shadow"
          style={{ background: "var(--color-primary)" }}>
          <Brain className="h-3.5 w-3.5" /> フラッシュ
        </button>
        <button onClick={() => router.push(`/wordbook/${id}/test`)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-3 text-xs font-semibold text-white shadow"
          style={{ background: "var(--color-accent)" }}>
          <Play className="h-3.5 w-3.5" /> テスト
        </button>
        <button
          onClick={handleCreateBattle}
          disabled={battleLoading || words.length < 4}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-3 text-xs font-semibold text-white shadow disabled:opacity-50"
          style={{ background: "#e11d48" }}>
          {battleLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Swords className="h-3.5 w-3.5" />}
          対戦する
        </button>
      </div>

      {/* 招待コードで参加 */}
      <div className="px-4 pb-2">
        {!showJoinInput ? (
          <button
            onClick={() => setShowJoinInput(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border py-2.5 text-xs font-medium transition"
            style={{ borderColor: "var(--color-border)", color: "#6b7280" }}>
            <LogIn className="h-3.5 w-3.5" /> 招待コードで参加
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="招待コード (6文字)"
              className="flex-1 rounded-xl border px-3 py-2 text-sm font-mono uppercase tracking-widest focus:outline-none"
              style={{ borderColor: "var(--color-border)" }}
            />
            <button
              onClick={handleJoinBattle}
              disabled={joinLoading || joinCode.length !== 6}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "#e11d48" }}>
              {joinLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "参加"}
            </button>
          </div>
        )}
      </div>

      <div className="px-4 space-y-3">
        {/* 単語追加フォーム */}
        {isOwner && (
          <div>
            <button onClick={() => setShowAddForm(!showAddForm)}
              className="flex w-full items-center gap-2 rounded-2xl border bg-white px-4 py-3 text-sm font-medium transition"
              style={{ borderColor: "var(--color-border)", color: "var(--color-accent)" }}>
              <Plus className="h-4 w-4" />
              単語を追加
            </button>
            {showAddForm && (
              <div className="mt-2 rounded-2xl bg-white p-4 shadow-sm space-y-3"
                style={{ border: "1px solid var(--color-border)" }}>
                <input value={addFront} onChange={(e) => setAddFront(e.target.value)}
                  placeholder="表（単語）*" className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
                  style={{ borderColor: "var(--color-border)" }} />
                <input value={addReading} onChange={(e) => setAddReading(e.target.value)}
                  placeholder="読み（ひらがな）" className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
                  style={{ borderColor: "var(--color-border)" }} />
                <input value={addBack} onChange={(e) => setAddBack(e.target.value)}
                  placeholder="裏（意味）*" className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
                  style={{ borderColor: "var(--color-border)" }} />
                <button onClick={handleAddWord} disabled={addLoading || !addFront.trim() || !addBack.trim()}
                  className="w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: "var(--color-accent)" }}>
                  {addLoading ? "追加中..." : "追加"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 単語一覧 */}
        <div className="space-y-2 pb-4">
          {words.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center text-gray-400">
              <p>まだ単語がありません</p>
              {isOwner && <p className="text-xs mt-1">上の「単語を追加」からどうぞ</p>}
            </div>
          ) : (
            words.map((word) => (
              <div key={word.id}
                className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
                style={{ border: "1px solid var(--color-border)" }}>
                <div className="flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: word.color_code || "var(--color-accent)" }}>
                  {word.front.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-semibold text-gray-900">{word.front}</span>
                    {word.reading && <span className="text-xs text-gray-400">{word.reading}</span>}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{word.back}</p>
                </div>
                {isOwner && (
                  <button onClick={() => handleDeleteWord(word.id)}
                    className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-300 hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
