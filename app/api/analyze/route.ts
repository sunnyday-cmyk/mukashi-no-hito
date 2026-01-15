import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// APIキーを環境変数から取得
const getAnthropicClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEYが設定されていません");
  }
  return new Anthropic({
    apiKey: apiKey,
  });
};

// レスポンスの型定義
interface Word {
  surface: string; // 表記
  partOfSpeech: string; // 品詞
  conjugation: string; // 活用形
  meaning: string; // 意味
  colorCode: string; // 色コード（例: "#FF6B6B"）
}

interface AnalysisResponse {
  correctedText?: string; // 補正済みの本文（OCRノイズ補正後）
  words: Word[];
  translation: string; // 現代語訳
  explanation: string; // 文法的な重要ポイント
  credits: number; // 残りクレジット数
  isSubscribed: boolean; // サブスクリプション状態
}

export async function POST(request: NextRequest) {
  try {
    // ========== 門番処理: 認証とクレジットチェック ==========
    
    // Supabaseクライアントの初期化（サーバーサイド用）
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Supabase環境変数が設定されていません" },
        { status: 500 }
      );
    }

    // リクエストヘッダーから認証トークンを取得
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "認証が必要です。ログインしてください。" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // ユーザー認証
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "認証に失敗しました。再度ログインしてください。" },
        { status: 401 }
      );
    }

    // profilesテーブルからcreditsとis_subscribedを取得
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("credits, is_subscribed")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("プロフィール取得エラー:", profileError);
      return NextResponse.json(
        { error: "ユーザー情報の取得に失敗しました。" },
        { status: 500 }
      );
    }

    const credits = profile?.credits ?? 0;
    const isSubscribed = profile?.is_subscribed ?? false;

    // クレジット判定ロジック
    if (!isSubscribed && credits <= 0) {
      return NextResponse.json(
        {
          error: "クレジットが不足しています。サブスクリプションに加入するか、クレジットを購入してください。",
          credits: credits,
          isSubscribed: isSubscribed,
        },
        { status: 403 }
      );
    }

    // ========== 通常の解析処理 ==========

    // APIキーの確認
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEYが環境変数に設定されていません");
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEYが設定されていません。.env.localファイルを確認してください。" },
        { status: 500 }
      );
    }

    // リクエストボディの取得とバリデーション
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: "リクエストボディの解析に失敗しました" },
        { status: 400 }
      );
    }

    const { text } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "古文テキストが提供されていません" },
        { status: 400 }
      );
    }

    // Anthropicクライアントの初期化
    const anthropic = getAnthropicClient();

    // デバッグ: Claudeに送る直前のプロンプトをログ出力
    console.log("=== Claude API Request Debug ===");
    console.log("Original text length:", text.length);
    console.log("Original text preview:", text.substring(0, 100) + "...");

    const prompt = `あなたは日本の一流の古文講師です。入力されるテキストはブラウザ版OCR（Tesseract.js）で生成されたものであり、以下の特有のノイズが含まれる可能性があります。これらを文脈から【自動補正】した上で解析してください。

**文字の形状による誤認補正**: 
  例：「候」→「侯」、「自」→「目」、「けり」→「けり（一部欠損）」など、古文として不自然な漢字やかなを、正しい文法に基づき修正する。
**縦書き特有の乱れの補完**: 
  改行位置が不自然だったり、行の順番が微妙に入れ替わっている場合、意味が通る古文として再構築する。
**不要なノイズの除去**: 
  トリミングの端に残ったページ番号、ルビの一部、または記号などのゴミは無視し、古文の本文のみを抽出する。

【解析する古文（OCR生データ）】
${text}

【出力構成】
以下のJSON形式で、解析結果を返してください。JSON以外のテキストは一切含めないでください。

{
  "correctedText": "補正済みの本文（読み取り結果の補正後）",
  "words": [
    {
      "surface": "単語の表記（補正後の表記）",
      "partOfSpeech": "品詞（例: 名詞、動詞、助動詞、助詞など）",
      "conjugation": "活用形（例: 未然形、連用形、終止形など。該当しない場合は空文字列）",
      "meaning": "現代語での意味",
      "colorCode": "#FF6B6B"
    }
  ],
  "translation": "全文の現代語訳",
  "explanation": "文法的な重要ポイントや注意すべき点を簡潔に説明"
}

【色コードについて】
単語の重要度や種類に応じて、以下のような色コードを割り当ててください：
- 動詞・助動詞: #FF6B6B（赤系）
- 名詞: #4ECDC4（青緑系）
- 助詞: #95E1D3（薄い青緑系）
- 形容詞・形容動詞: #F38181（ピンク系）
- その他: #AA96DA（紫系）

【注意事項】
- JSON形式のみを返し、マークダウンやコードブロックは使用しないでください
- 単語は文の順序通りに配列に格納してください
- 色コードは上記のカテゴリに基づいて適切に割り当ててください
- correctedTextフィールドには、OCRノイズを補正した後の正しい古文テキストを格納してください`;

    // デバッグ: プロンプト全体をログ出力（開発環境のみ）
    if (process.env.NODE_ENV === "development") {
      console.log("Full prompt:", prompt);
    }

    // Claude APIを呼び出し
    const message = await anthropic.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }).catch((error) => {
      console.error("Claude API呼び出しエラー:", error);
      throw new Error(
        error.message || "Claude APIの呼び出しに失敗しました"
      );
    });

    // Claudeのレスポンスからテキストを取得
    const content = message.content[0];
    if (content.type !== "text") {
      return NextResponse.json(
        { error: "予期しないレスポンス形式です" },
        { status: 500 }
      );
    }

    let responseText = content.text.trim();

    // マークダウンコードブロックを除去（念のため）
    responseText = responseText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    responseText = responseText.replace(/^```\s*/, "").replace(/\s*```$/, "");

    // JSONをパース
    let analysisResult: AnalysisResponse;
    try {
      analysisResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error("JSONパースエラー:", parseError);
      console.error("レスポンステキスト:", responseText);
      return NextResponse.json(
        { error: "解析結果のパースに失敗しました", rawResponse: responseText },
        { status: 500 }
      );
    }

    // バリデーション
    if (
      !analysisResult.words ||
      !Array.isArray(analysisResult.words) ||
      typeof analysisResult.translation !== "string" ||
      typeof analysisResult.explanation !== "string"
    ) {
      console.error("解析結果のバリデーションエラー:", analysisResult);
      return NextResponse.json(
        { error: "解析結果の形式が正しくありません" },
        { status: 500 }
      );
    }

    // デバッグ: 解析結果の概要をログ出力
    console.log("=== Claude API Response Debug ===");
    console.log("Corrected text:", analysisResult.correctedText?.substring(0, 100) || "N/A");
    console.log("Words count:", analysisResult.words?.length || 0);
    console.log("Translation preview:", analysisResult.translation?.substring(0, 100) || "N/A");

    // ========== クレジット消費処理 ==========
    let updatedCredits = credits;
    if (!isSubscribed) {
      // サブスク会員でない場合、クレジットを1減らす
      updatedCredits = Math.max(0, credits - 1);
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ credits: updatedCredits })
        .eq("id", user.id);

      if (updateError) {
        console.error("クレジット更新エラー:", updateError);
        // エラーが発生しても解析結果は返す（ログに記録）
      }
    }

    // レスポンスにクレジット情報を含める
    const response: AnalysisResponse = {
      ...analysisResult,
      credits: updatedCredits,
      isSubscribed: isSubscribed,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("解析エラー:", error);
    
    // エラーの種類に応じて適切なメッセージを返す
    if (error instanceof Error) {
      if (error.message.includes("ANTHROPIC_API_KEY")) {
        return NextResponse.json(
          { error: "APIキーが正しく設定されていません。.env.localファイルを確認してください。" },
          { status: 500 }
        );
      }
      if (error.message.includes("Claude API")) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }
    }

    // より詳細なエラーメッセージを返す
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // ネットワークエラーやタイムアウトの可能性
    if (errorMessage.includes("fetch") || errorMessage.includes("network")) {
      return NextResponse.json(
        { error: "ネットワークエラーが発生しました。インターネット接続を確認してください。" },
        { status: 500 }
      );
    }
    
    // APIキー関連のエラー
    if (errorMessage.includes("401") || errorMessage.includes("authentication")) {
      return NextResponse.json(
        { error: "APIキーが無効です。.env.localファイルのAPIキーを確認してください。" },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: "古文の解析中にエラーが発生しました",
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

