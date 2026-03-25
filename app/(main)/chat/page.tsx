"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// 相談カテゴリーのクイックアクセス
const QUICK_PROMPTS = [
  "古文の助動詞が苦手です。覚え方を教えて",
  "漢文の返り点の読み方が分からない",
  "英単語を効率よく暗記する方法は？",
  "受験まで3ヶ月、何をすべき？",
  "モチベーションが上がらない時はどうすれば？",
  "古文の敬語の見分け方を教えて",
];

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }

    const { data } = await supabase
      .from("ai_chat_messages")
      .select("id, role, content")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: true })
      .limit(40);

    if (data && data.length > 0) {
      setMessages(data as Message[]);
    } else {
      // 初回はウェルカムメッセージ
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: "こんにちは！古先生だよ。\n古文・漢文・英語はもちろん、受験勉強全般の悩みを何でも相談してね。一緒に合格を目指そう！📚",
      }]);
    }
    setHistoryLoading(false);
  };

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }

      // ウェルカムメッセージを除いた履歴
      const history = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message: msg, history }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "エラーが発生しました");

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "ごめん、今ちょっとつながりにくいみたい。もう一度試してみて！",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    if (!confirm("会話履歴をリセットしますか？")) return;
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "会話をリセットしたよ。また何でも気軽に聞いてね！📚",
    }]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--color-surface)" }}>
      {/* ヘッダー */}
      <header
        style={{ background: "var(--color-primary)" }}
        className="sticky top-0 z-40 safe-area-top"
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: "var(--color-accent)" }}
              >
                古
              </div>
              <div>
                <p className="text-sm font-bold text-white">古先生</p>
                <p className="text-xs text-white/50">AI勉強相談</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleClear}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
            aria-label="会話をリセット"
          >
            <RotateCcw className="h-4 w-4 text-white" />
          </button>
        </div>
      </header>

      {/* メッセージ一覧 */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-2">
        {historyLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-accent)" }} />
          </div>
        ) : (
          <>
            {/* メッセージバブル */}
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* アバター（AIのみ） */}
                  {msg.role === "assistant" && (
                    <div
                      className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: "var(--color-accent)" }}
                    >
                      古
                    </div>
                  )}

                  {/* バブル */}
                  <div
                    className="max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm"
                    style={
                      msg.role === "user"
                        ? {
                            background: "var(--color-accent)",
                            color: "white",
                            borderBottomRightRadius: "4px",
                          }
                        : {
                            background: "white",
                            color: "#1a1a2e",
                            border: "1px solid var(--color-border)",
                            borderBottomLeftRadius: "4px",
                          }
                    }
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* ローディング表示 */}
              {loading && (
                <div className="flex items-end gap-2">
                  <div
                    className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: "var(--color-accent)" }}
                  >
                    古
                  </div>
                  <div
                    className="rounded-2xl px-4 py-3 bg-white shadow-sm"
                    style={{ border: "1px solid var(--color-border)", borderBottomLeftRadius: "4px" }}
                  >
                    <div className="flex gap-1 items-center h-5">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="h-2 w-2 rounded-full animate-bounce"
                          style={{
                            background: "var(--color-accent)",
                            animationDelay: `${i * 0.15}s`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* クイックプロンプト（履歴が少ない時のみ表示） */}
            {messages.length <= 1 && !loading && (
              <div className="mt-6">
                <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" /> よく聞かれる相談
                </p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => handleSend(p)}
                      className="rounded-full border px-3 py-1.5 text-xs text-left transition active:scale-95"
                      style={{
                        borderColor: "var(--color-accent)",
                        color: "var(--color-accent)",
                        background: "rgba(124,111,224,0.05)",
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </>
        )}
      </main>

      {/* 入力エリア */}
      <div
        className="sticky bottom-0 border-t bg-white px-4 py-3 pb-safe"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div
          className="flex items-end gap-2 rounded-2xl border px-4 py-2"
          style={{ borderColor: "var(--color-border)" }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="勉強の悩みを相談しよう..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none py-1"
            style={{ maxHeight: "120px", overflowY: "auto" }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-xl text-white transition active:scale-90 disabled:opacity-40"
            style={{ background: "var(--color-accent)" }}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-300 mt-1.5">
          Shift+Enterで改行　　Enterで送信
        </p>
      </div>
    </div>
  );
}
