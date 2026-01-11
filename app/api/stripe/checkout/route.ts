import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase環境変数が設定されていません");
}

// @ts-ignore
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
});

export async function POST(request: NextRequest) {
  try {
    // 認証トークンを取得
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

    // Stripe Checkoutセッションを作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: {
              name: "昔の人 プレミアムプラン",
              description: "古文解析アプリ「昔の人」の月額サブスクリプション",
            },
            recurring: {
              interval: "month",
            },
            unit_amount: 500, // 500円（税込）
          },
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

