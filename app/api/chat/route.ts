import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SYSTEM_PROMPT = `あなたは「昔の人」というアプリの専属AI家庭教師です。
名前は「古先生（こせんせい）」。厳しくも優しい、熱血予備校講師のキャラクターです。

【あなたの役割】
- 高校生・大学受験生の勉強全般の悩みに親身に答える
- 古文・漢文・英語・数学・物理・化学・生物・日本史・世界史など全科目対応
- 特に古文・漢文は最も得意な専門分野
- モチベーション維持、学習方法、受験戦略のアドバイスも行う

【回答スタイル】
- 親しみやすく、でも本質を突いた回答を心がける
- 長すぎず、スマホで読みやすい分量（200〜400字程度）
- 具体例や語呂合わせを使って分かりやすく説明する
- 生徒の気持ちに寄り添い、自信を持たせる言葉をかける
- 「〜だよ」「〜だね」など親しみやすいタメ口・敬語のミックス
- 回答の最後に「次の質問も待ってるよ！」など一言添える

【禁止事項】
- 答えを直接教えるだけの丸投げ回答（考え方・解き方を教える）
- 勉強と関係のない話題（雑談は軽くOK）
- 個人情報の聞き取り・SNS誘導
`;

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Supabase設定エラー" }, { status: 500 });
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
    }

    let body: { message?: string; history?: Array<{ role: "user" | "assistant"; content: string }> };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "リクエストの解析に失敗しました" }, { status: 400 });
    }

    const { message, history = [] } = body;
    if (!message?.trim()) {
      return NextResponse.json({ error: "メッセージが空です" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "APIキーが設定されていません" }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey });

    // 直近20件の会話履歴 + 今回のメッセージ
    const messages: Anthropic.MessageParam[] = [
      ...history.slice(-20).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message.trim() },
    ];

    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    });

    const assistantContent = response.content[0];
    if (assistantContent.type !== "text") {
      return NextResponse.json({ error: "予期しないレスポンス形式" }, { status: 500 });
    }

    const assistantMessage = assistantContent.text;

    // チャット履歴をSupabaseに保存（非同期・エラー無視）
    Promise.all([
      supabase.from("ai_chat_messages").insert({
        user_id: user.id,
        role: "user",
        content: message.trim(),
      }),
      supabase.from("ai_chat_messages").insert({
        user_id: user.id,
        role: "assistant",
        content: assistantMessage,
      }),
    ]).catch(console.error);

    return NextResponse.json({ message: assistantMessage });
  } catch (error) {
    console.error("チャットAPIエラー:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "エラーが発生しました", details: msg }, { status: 500 });
  }
}
