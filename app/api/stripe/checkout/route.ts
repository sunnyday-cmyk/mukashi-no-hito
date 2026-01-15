import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// Supabase設定はビルド時に確認（NEXT_PUBLIC_変数はビルド時に埋め込まれる）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase環境変数が設定されていません");
}

export async function POST(request: NextRequest) {
  try {
    // ⚠️ 重要: Stripe環境変数は実行時（リクエストごと）に読み込む
    // これにより、Vercelで環境変数を更新した際に最新の値が反映される
    console.log("=== Stripe Environment Variables Debug (Runtime) ===");
    console.log("STRIPE_SECRET_KEY:");
    console.log("  - Exists:", !!process.env.STRIPE_SECRET_KEY);
    console.log("  - Prefix:", process.env.STRIPE_SECRET_KEY?.substring(0, 7) || "undefined");
    console.log("  - Length:", process.env.STRIPE_SECRET_KEY?.length || 0);
    console.log("  - Type:", typeof process.env.STRIPE_SECRET_KEY);
    console.log("NEXT_PUBLIC_STRIPE_PRICE_ID:");
    console.log("  - Exists:", !!process.env.NEXT_PUBLIC_STRIPE_PRICE_ID);
    console.log("  - Value:", process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || "undefined");
    console.log("  - Length:", process.env.NEXT_PUBLIC_STRIPE_PRICE_ID?.length || 0);
    console.log("  - Type:", typeof process.env.NEXT_PUBLIC_STRIPE_PRICE_ID);
    console.log("====================================================");
    
    // 実行時にStripe環境変数を読み込み・検証
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      console.error("❌ STRIPE_SECRET_KEY環境変数が設定されていません");
      throw new Error("STRIPE_SECRET_KEY環境変数が設定されていません。本番用のsk_live_キーを設定してください。");
    }
    
    console.log("✅ Stripe Secret Key検証成功:", stripeSecretKey.substring(0, 7));
    
    // 実行時にStripeクライアントを初期化（キャッシュの影響を受けない）
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-12-18.acacia" as any,
      typescript: true,
    });

    // 認証トークンを取得
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "認証が必要です。ログインしてください。" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
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
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: "認証に失敗しました。再度ログインしてください。" },
        { status: 401 }
      );
    }

    // Stripe環境変数の確認
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEYが環境変数に設定されていません");
      return NextResponse.json(
        { error: "決済システムの設定が完了していません" },
        { status: 500 }
      );
    }

    // 本番用価格IDを環境変数から取得（Vercel設定に合わせてNEXT_PUBLIC_プレフィックス使用）
    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
    if (!priceId) {
      console.error("❌ NEXT_PUBLIC_STRIPE_PRICE_IDが環境変数に設定されていません");
      console.error("Vercel設定を確認してください:");
      console.error("  - 環境変数名: NEXT_PUBLIC_STRIPE_PRICE_ID");
      console.error("  - 期待される値: price_1SpP0LPHP72H6VKu0r4uDFk5");
      console.error("  - スコープ: Production");
      return NextResponse.json(
        { 
          error: "決済システムの設定が完了していません", 
          details: "NEXT_PUBLIC_STRIPE_PRICE_ID環境変数が未設定です"
        },
        { status: 500 }
      );
    }
    
    console.log("✅ 価格ID読み込み成功:", priceId);

    // Stripe Checkoutセッションを作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId, // 本番用の価格ID（price_1SpP0LPHP72H6VKu0r4uDFk5）
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${request.headers.get("origin") || ""}/pricing?success=true`,
      cancel_url: `${request.headers.get("origin") || ""}/pricing?canceled=true`,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe Checkoutエラー:", error);
    const errorMessage =
      error instanceof Error ? error.message : "決済セッションの作成に失敗しました";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

