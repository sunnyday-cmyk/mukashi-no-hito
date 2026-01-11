import { createClient } from "@supabase/supabase-js";

// 環境変数の取得（クライアントとサーバーの両方で動作）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 環境変数の検証
if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage =
    "❌ Supabase環境変数が設定されていません。\n" +
    "   .env.localファイルに以下を追加してください：\n" +
    "   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co\n" +
    "   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key\n\n" +
    "   Supabase Dashboard: https://app.supabase.com/\n" +
    "   Settings > API から取得できます。";

  if (typeof window === "undefined") {
    // サーバーサイドでのエラー
    console.error(errorMessage);
  } else {
    // クライアントサイドでのエラー
    console.error(errorMessage);
  }
  
  // 開発環境ではエラーを投げる
  if (process.env.NODE_ENV === "development") {
    throw new Error(
      "Supabase環境変数が設定されていません。.env.localファイルを確認してください。"
    );
  }
}

// 環境変数が設定されている場合のみクライアントを作成
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase環境変数が設定されていません。NEXT_PUBLIC_SUPABASE_URLとNEXT_PUBLIC_SUPABASE_ANON_KEYを設定してください。"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

