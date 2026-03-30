"use client";

import { useEffect, useState, use, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Copy, CheckCircle2, XCircle, Trophy, Loader2, Swords } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface BattleQuestion {
  word_id: string;
  front: string;
  reading: string | null;
  back: string;
  options: string[];
}

interface BattleRoom {
  id: string;
  invite_code: string;
  wordbook_id: string;
  host_id: string;
  guest_id: string | null;
  status: "waiting" | "playing" | "finished";
  questions: BattleQuestion[];
  question_count: number;
  host_score: number;
  guest_score: number;
  winner_id: string | null;
  started_at: string | null;
}

interface PlayerProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

type GameState = "waiting" | "countdown" | "playing" | "finished";

export default function BattlePage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const router = useRouter();

  const [room, setRoom] = useState<BattleRoom | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [hostProfile, setHostProfile] = useState<PlayerProfile | null>(null);
  const [guestProfile, setGuestProfile] = useState<PlayerProfile | null>(null);
  const [gameState, setGameState] = useState<GameState>("waiting");
  const [countdown, setCountdown] = useState(3);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [myAnswerCount, setMyAnswerCount] = useState(0);
  const [opponentAnswerCount, setOpponentAnswerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadProfiles = useCallback(async (hostId: string, guestId: string | null) => {
    const ids = [hostId, ...(guestId ? [guestId] : [])];
    const { data } = await supabase.from("profiles").select("id, display_name, username, avatar_url").in("id", ids);
    if (data) {
      setHostProfile(data.find((p) => p.id === hostId) || null);
      if (guestId) setGuestProfile(data.find((p) => p.id === guestId) || null);
    }
  }, []);

  const startCountdown = useCallback(() => {
    setGameState("countdown");
    setCountdown(3);
    let c = 3;
    const tick = () => {
      c--;
      setCountdown(c);
      if (c > 0) {
        countdownRef.current = setTimeout(tick, 1000);
      } else {
        setGameState("playing");
      }
    };
    countdownRef.current = setTimeout(tick, 1000);
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      setMyId(session.user.id);

      const { data: roomData } = await supabase
        .from("battle_rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      if (!roomData) { router.replace("/wordbook"); return; }
      const r = roomData as BattleRoom;
      setRoom(r);
      await loadProfiles(r.host_id, r.guest_id);

      // 既に playing/finished の場合
      if (r.status === "playing") {
        // 既存の回答数を取得
        const { data: answers } = await supabase
          .from("battle_answers")
          .select("user_id, question_index, is_correct")
          .eq("room_id", roomId);
        if (answers) {
          const myAnswers = answers.filter((a) => a.user_id === session.user.id);
          const oppAnswers = answers.filter((a) => a.user_id !== session.user.id);
          setMyAnswerCount(myAnswers.length);
          setMyScore(myAnswers.filter((a) => a.is_correct).length * 10);
          setOpponentAnswerCount(oppAnswers.length);
          setOpponentScore(oppAnswers.filter((a) => a.is_correct).length * 10);
          setQuestionIndex(myAnswers.length);
        }
        startCountdown();
      } else if (r.status === "finished") {
        setGameState("finished");
        const { data: answers } = await supabase
          .from("battle_answers")
          .select("user_id, is_correct")
          .eq("room_id", roomId);
        if (answers) {
          const myAnswers = answers.filter((a) => a.user_id === session.user.id);
          const oppAnswers = answers.filter((a) => a.user_id !== session.user.id);
          setMyScore(myAnswers.filter((a) => a.is_correct).length * 10);
          setOpponentScore(oppAnswers.filter((a) => a.is_correct).length * 10);
        }
      }

      setLoading(false);

      // Realtime 購読
      channel = supabase.channel(`battle:${roomId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "battle_rooms", filter: `id=eq.${roomId}` },
          async (payload) => {
            const updated = payload.new as BattleRoom;
            setRoom(updated);
            if (updated.guest_id && !roomData.guest_id) {
              await loadProfiles(updated.host_id, updated.guest_id);
            }
            if (updated.status === "playing" && roomData.status === "waiting") {
              startCountdown();
            }
            if (updated.status === "finished") {
              setGameState("finished");
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "battle_answers", filter: `room_id=eq.${roomId}` },
          (payload) => {
            const ans = payload.new as { user_id: string; is_correct: boolean };
            if (ans.user_id !== session.user.id) {
              setOpponentAnswerCount((prev) => prev + 1);
              if (ans.is_correct) setOpponentScore((prev) => prev + 10);
            }
          }
        )
        .subscribe();
    };

    init();

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (countdownRef.current) clearTimeout(countdownRef.current);
    };
  }, [roomId, router, loadProfiles, startCountdown]);

  const handleAnswer = async (opt: string) => {
    if (selected || !room || !myId) return;
    setSelected(opt);

    const q = room.questions[questionIndex];
    const isCorrect = opt === q.back;

    await supabase.from("battle_answers").insert({
      room_id: roomId,
      user_id: myId,
      question_index: questionIndex,
      is_correct: isCorrect,
    });

    if (isCorrect) setMyScore((prev) => prev + 10);
    setMyAnswerCount((prev) => prev + 1);

    setTimeout(async () => {
      const nextIndex = questionIndex + 1;
      setSelected(null);

      if (nextIndex >= room.questions.length) {
        // 自分は全問完了 → finishedに更新（相手も完了しているか確認は省略し楽観的に更新）
        const isHost = myId === room.host_id;
        const newScore = isCorrect ? myScore + 10 : myScore;
        const scoreField = isHost ? "host_score" : "guest_score";
        await supabase.from("battle_rooms")
          .update({ [scoreField]: newScore, status: "finished", finished_at: new Date().toISOString() })
          .eq("id", roomId);
        setGameState("finished");
      } else {
        setQuestionIndex(nextIndex);
      }
    }, 800);
  };

  const handleCopyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayName = (profile: PlayerProfile | null) =>
    profile?.display_name || profile?.username || "プレイヤー";

  const avatar = (profile: PlayerProfile | null, fallback: string) => (
    <div
      className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
      style={{ background: "var(--color-accent)" }}
    >
      {profile?.avatar_url ? (
        <Image
          src={profile.avatar_url}
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 rounded-full object-cover"
          unoptimized
        />
      ) : (
        fallback[0]?.toUpperCase() || "?"
      )}
    </div>
  );

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-accent)" }} />
    </div>
  );

  if (!room) return null;

  const isHost = myId === room.host_id;
  const myProfile = isHost ? hostProfile : guestProfile;
  const oppProfile = isHost ? guestProfile : hostProfile;
  const q = room.questions[questionIndex];

  // ============================================================
  // 待機画面
  // ============================================================
  if (gameState === "waiting") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6" style={{ background: "var(--color-surface)" }}>
        <button onClick={() => router.back()} className="absolute top-4 left-4 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>

        <div className="flex h-16 w-16 items-center justify-center rounded-2xl mb-6" style={{ background: "#e11d48" }}>
          <Swords className="h-8 w-8 text-white" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">対戦ルーム</h1>
        <p className="text-sm text-gray-500 mb-8">招待コードを相手に共有してください</p>

        <div className="w-full max-w-xs rounded-3xl bg-white p-6 shadow-sm text-center mb-6" style={{ border: "1px solid var(--color-border)" }}>
          <p className="text-xs text-gray-400 mb-2">招待コード</p>
          <p className="text-4xl font-bold tracking-[0.3em] mb-4" style={{ color: "var(--color-primary)" }}>
            {room.invite_code}
          </p>
          <button
            onClick={handleCopyCode}
            className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-sm font-medium text-white transition"
            style={{ background: copied ? "#22c55e" : "var(--color-accent)" }}
          >
            <Copy className="h-4 w-4" />
            {copied ? "コピーしました！" : "コードをコピー"}
          </button>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center gap-2">
            {avatar(hostProfile, displayName(hostProfile))}
            <span className="text-sm font-medium">{displayName(hostProfile)}</span>
          </div>
          <span className="text-gray-400 font-bold">VS</span>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 border-2 border-dashed border-gray-300">
              <span className="text-gray-400 text-xs">?</span>
            </div>
            <span className="text-sm text-gray-400">待機中...</span>
          </div>
        </div>

        <p className="text-xs text-gray-400">相手が参加すると自動的に対戦が始まります</p>
        <p className="text-xs text-gray-400 mt-1">{room.questions.length}問 · 4択クイズ</p>
      </div>
    );
  }

  // ============================================================
  // カウントダウン
  // ============================================================
  if (gameState === "countdown") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center" style={{ background: "var(--color-primary)" }}>
        <div className="flex items-center gap-6 mb-8">
          <div className="text-center">
            {avatar(hostProfile, displayName(hostProfile))}
            <p className="text-xs text-white/70 mt-1">{displayName(hostProfile)}</p>
          </div>
          <span className="text-white/60 font-bold text-xl">VS</span>
          <div className="text-center">
            {avatar(guestProfile, displayName(guestProfile))}
            <p className="text-xs text-white/70 mt-1">{displayName(guestProfile)}</p>
          </div>
        </div>
        <p className="text-8xl font-bold text-white">{countdown > 0 ? countdown : "GO!"}</p>
        <p className="text-white/50 mt-4 text-sm">対戦スタート</p>
      </div>
    );
  }

  // ============================================================
  // 結果画面
  // ============================================================
  if (gameState === "finished") {
    const iWon = myScore > opponentScore;
    const isDraw = myScore === opponentScore;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6" style={{ background: "var(--color-surface)" }}>
        <div className="text-6xl mb-4">
          {isDraw ? "🤝" : iWon ? "🏆" : "💪"}
        </div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--color-primary)" }}>
          {isDraw ? "引き分け！" : iWon ? "勝利！" : "惜敗..."}
        </h2>
        <p className="text-sm text-gray-500 mb-8">
          {isDraw ? "同点でした！" : iWon ? "おめでとう！" : "次は勝てる！"}
        </p>

        <div className="flex gap-4 w-full max-w-xs mb-8">
          <div className="flex-1 rounded-2xl bg-white p-4 text-center shadow-sm" style={{ border: `2px solid ${iWon || isDraw ? "var(--color-accent)" : "var(--color-border)"}` }}>
            {avatar(myProfile, displayName(myProfile))}
            <p className="text-xs text-gray-500 mt-2 mb-1 truncate">{displayName(myProfile)}</p>
            <p className="text-3xl font-bold" style={{ color: "var(--color-accent)" }}>{myScore}</p>
            <p className="text-xs text-gray-400">点</p>
          </div>
          <div className="flex items-center text-gray-400 font-bold text-lg">VS</div>
          <div className="flex-1 rounded-2xl bg-white p-4 text-center shadow-sm" style={{ border: `2px solid ${!iWon || isDraw ? "var(--color-accent)" : "var(--color-border)"}` }}>
            {avatar(oppProfile, displayName(oppProfile))}
            <p className="text-xs text-gray-500 mt-2 mb-1 truncate">{displayName(oppProfile)}</p>
            <p className="text-3xl font-bold" style={{ color: "var(--color-accent)" }}>{opponentScore}</p>
            <p className="text-xs text-gray-400">点</p>
          </div>
        </div>

        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={() => router.push(`/wordbook/${room.wordbook_id}`)}
            className="flex-1 rounded-2xl border py-3 text-sm font-medium"
            style={{ borderColor: "var(--color-border)" }}
          >
            単語帳へ
          </button>
          <button
            onClick={() => router.push(`/wordbook/${room.wordbook_id}`)}
            className="flex-1 rounded-2xl py-3 text-sm font-semibold text-white"
            style={{ background: "#e11d48" }}
          >
            もう一度
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // 対戦中
  // ============================================================
  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--color-surface)" }}>
      {/* ヘッダー：スコアボード */}
      <header style={{ background: "var(--color-primary)" }} className="safe-area-top px-4 pt-3 pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {avatar(myProfile, displayName(myProfile))}
            <div>
              <p className="text-xs text-white/60 leading-none">あなた</p>
              <p className="text-lg font-bold text-white leading-tight">{myScore}pt</p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-white/60">{questionIndex + 1} / {room.questions.length}</p>
            <div className="h-1.5 w-20 rounded-full bg-white/20 overflow-hidden mt-1">
              <div
                className="h-full rounded-full bg-white/80 transition-all"
                style={{ width: `${((questionIndex) / room.questions.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs text-white/60 leading-none">相手</p>
              <p className="text-lg font-bold text-white leading-tight">{opponentScore}pt</p>
            </div>
            {avatar(oppProfile, displayName(oppProfile))}
          </div>
        </div>

        {/* 相手の進捗 */}
        <p className="text-center text-[10px] text-white/40">
          相手: {opponentAnswerCount}/{room.questions.length}問回答済み
        </p>
      </header>

      {/* 問題 */}
      <main className="flex flex-1 flex-col items-center justify-center p-4 gap-5">
        {q && (
          <>
            <div
              className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-sm"
              style={{ border: "1px solid var(--color-border)" }}
            >
              <p className="text-xs text-gray-400 mb-3">この単語の意味は？</p>
              <p className="font-serif-ja text-3xl font-bold" style={{ color: "var(--color-primary)" }}>
                {q.front}
              </p>
              {q.reading && (
                <p className="mt-2 text-sm text-gray-400">{q.reading}</p>
              )}
            </div>

            <div className="w-full max-w-sm space-y-2.5">
              {q.options.map((opt) => {
                const isSelected = selected === opt;
                const isCorrect = opt === q.back;
                let style: React.CSSProperties = { background: "white", borderColor: "var(--color-border)" };
                let textColor = "text-gray-900";
                if (selected) {
                  if (isCorrect) { style = { background: "#f0fdf4", borderColor: "#22c55e" }; textColor = "text-green-700"; }
                  else if (isSelected && !isCorrect) { style = { background: "#fef2f2", borderColor: "#ef4444" }; textColor = "text-red-600"; }
                }
                return (
                  <button
                    key={opt}
                    onClick={() => handleAnswer(opt)}
                    disabled={!!selected}
                    className={`w-full flex items-center justify-between rounded-2xl border-2 px-4 py-3.5 text-sm font-medium text-left transition active:scale-[0.98] ${textColor}`}
                    style={style}
                  >
                    <span>{opt}</span>
                    {selected && isCorrect && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                    {selected && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-red-500" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
