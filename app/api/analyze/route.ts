import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Subject } from "@/types";

const getAnthropicClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEYが設定されていません");
  return new Anthropic({ apiKey });
};

function buildPrompt(text: string, subject: Subject): string {
  if (subject === "japanese_classical") {
    return `あなたは大学入試の古文を専門とする一流の予備校講師です。以下の古文テキストを**全文漏らさず**解析してください。

【重要】OCRノイズの自動補正
入力テキストはGoogle Cloud Vision APIで生成されたものであり、以下のノイズが含まれる可能性があります：
- 文字の形状による誤認（例：「候」→「侯」、「自」→「目」）
- 縦書き特有の改行位置の乱れや行の順番の入れ替わり
- ページ番号、ルビの一部、記号などの不要なノイズ

【解析する古文（OCR生データ）】
${text}

【解析の必須要件】
1. **全文解析の徹底**: 入力された古文を**最初から最後まで一文字も漏らさず**解析してください。
2. **大学入試レベルの文法解析**:
   - 動詞・形容詞・形容動詞: 活用の種類と活用形
   - 助動詞: 意味（過去・完了・推量・意志・打消・受身・使役・尊敬・謙譲など）と活用形
   - 助詞: 種類（格助詞・接続助詞・副助詞・終助詞など）
   - 重要文法: 係り結び、敬語の種類、識別が必要な語など

【出力構成】以下のJSON形式のみで返してください。JSONのみ、マークダウン不要。
{
  "correctedText": "補正済みの本文",
  "words": [
    {
      "surface": "単語の表記",
      "reading": "よみがな",
      "partOfSpeech": "品詞",
      "inflectionType": "活用の種類（なしは空文字）",
      "inflectionForm": "活用形（なしは空文字）",
      "meaning": "現代語での意味",
      "auxiliaryMeaning": "助動詞の意味（なしは空文字）",
      "grammarNote": "入試重要ポイント（なければ空文字）",
      "importance": 3,
      "colorCode": "#FF6B6B"
    }
  ],
  "translation": "全文の現代語訳",
  "explanation": "文法的な重要ポイントや注意すべき点",
  "grammar_points": [
    { "text": "該当箇所", "explanation": "文法説明" }
  ]
}
【色コード規則】動詞・助動詞: #FF6B6B / 名詞: #4ECDC4 / 助詞: #95E1D3 / 形容詞・形容動詞: #F38181 / その他: #AA96DA
【注意】全文を必ず解析すること。途中で終わらせないこと。`;
  }

  if (subject === "chinese_classical") {
    return `あなたは大学入試の漢文を専門とする一流の予備校講師です。以下の漢文テキストを解析してください。

【解析する漢文】
${text}

【解析の必須要件】
1. 書き下し文を作成してください
2. 全文を現代語訳してください
3. 重要な句法・文法ポイントを解析してください（返り点、再読文字、句法など）
4. 重要単語を抽出し、意味を説明してください

【出力構成】以下のJSON形式のみで返してください。JSONのみ、マークダウン不要。
{
  "correctedText": "原文（補正済み）",
  "kundokuText": "書き下し文",
  "words": [
    {
      "surface": "漢字",
      "reading": "よみ",
      "partOfSpeech": "品詞",
      "inflectionType": "",
      "inflectionForm": "",
      "meaning": "意味・用法",
      "auxiliaryMeaning": "",
      "grammarNote": "句法・重要ポイント（なければ空文字）",
      "importance": 3,
      "colorCode": "#FF6B6B"
    }
  ],
  "translation": "現代語訳",
  "explanation": "重要な句法・文法ポイントの解説",
  "grammar_points": [
    { "text": "該当箇所", "explanation": "句法の説明" }
  ]
}
【色コード規則】動詞: #FF6B6B / 名詞: #4ECDC4 / 助字: #95E1D3 / 形容詞: #F38181 / その他: #AA96DA`;
  }

  // english
  return `You are an expert English teacher for Japanese high school students preparing for university entrance exams. Analyze the following English text.

【English text to analyze】
${text}

【Requirements】
1. Translate the full text into natural Japanese
2. Extract important vocabulary (especially words at CEFR B2+ level)
3. Explain important grammar structures
4. For each word, provide part of speech, Japanese meaning, and importance score

【Output】Return ONLY the following JSON. No markdown, no extra text.
{
  "correctedText": "Original text (corrected if needed)",
  "words": [
    {
      "surface": "English word",
      "reading": "pronunciation hint (katakana)",
      "partOfSpeech": "品詞 (e.g. 名詞, 動詞, 形容詞)",
      "inflectionType": "",
      "inflectionForm": "",
      "meaning": "日本語の意味",
      "auxiliaryMeaning": "",
      "grammarNote": "用法・入試ポイント（なければ空文字）",
      "importance": 3,
      "colorCode": "#FF6B6B"
    }
  ],
  "translation": "日本語訳（全文）",
  "explanation": "重要な文法構造・表現の解説",
  "grammar_points": [
    { "text": "grammar structure", "explanation": "説明" }
  ]
}
Color codes: Verbs #FF6B6B / Nouns #4ECDC4 / Conjunctions #95E1D3 / Adjectives/Adverbs #F38181 / Others #AA96DA`;
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Supabase環境変数が設定されていません" }, { status: 500 });
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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("credits, is_subscribed")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: "ユーザー情報の取得に失敗しました" }, { status: 500 });
    }

    const credits: number = profile?.credits ?? 0;
    const isSubscribed: boolean = profile?.is_subscribed ?? false;

    if (!isSubscribed && credits <= 0) {
      return NextResponse.json(
        { error: "クレジットが不足しています。", credits, isSubscribed },
        { status: 403 }
      );
    }

    let body: { text?: string; subject?: Subject };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "リクエストボディの解析に失敗しました" }, { status: 400 });
    }

    const { text, subject = "japanese_classical" } = body;
    if (!text?.trim()) {
      return NextResponse.json({ error: "テキストが提供されていません" }, { status: 400 });
    }

    const anthropic = getAnthropicClient();
    const prompt = buildPrompt(text.trim(), subject);

    const message = await anthropic.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "予期しないレスポンス形式です" }, { status: 500 });
    }

    let responseText = content.text
      .trim()
      .replace(/^```json\s*/, "")
      .replace(/\s*```$/, "")
      .replace(/^```\s*/, "");

    let analysisResult: Record<string, unknown>;
    try {
      analysisResult = JSON.parse(responseText);
    } catch {
      return NextResponse.json({ error: "解析結果のパースに失敗しました", rawResponse: responseText }, { status: 500 });
    }

    if (
      !analysisResult.correctedText ||
      !Array.isArray(analysisResult.words) ||
      analysisResult.words.length === 0 ||
      typeof analysisResult.translation !== "string"
    ) {
      return NextResponse.json(
        { error: "解析結果の形式が正しくありません", details: `Words: ${(analysisResult.words as unknown[])?.length ?? 0}` },
        { status: 500 }
      );
    }

    // クレジット消費
    let updatedCredits = credits;
    if (!isSubscribed) {
      updatedCredits = Math.max(0, credits - 1);
      await supabase.from("profiles").update({ credits: updatedCredits }).eq("id", user.id);
    }

    return NextResponse.json({ ...analysisResult, credits: updatedCredits, isSubscribed });
  } catch (error) {
    console.error("解析エラー:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "解析中にエラーが発生しました", details: msg }, { status: 500 });
  }
}
