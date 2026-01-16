import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // 環境変数の確認
    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    if (!apiKey) {
      console.error("GOOGLE_VISION_API_KEY環境変数が設定されていません");
      return NextResponse.json(
        { error: "OCR APIキーが設定されていません" },
        { status: 500 }
      );
    }

    // リクエストボディの取得
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: "リクエストボディの解析に失敗しました" },
        { status: 400 }
      );
    }

    const { imageData } = body;

    if (!imageData || typeof imageData !== "string") {
      return NextResponse.json(
        { error: "画像データが提供されていません" },
        { status: 400 }
      );
    }

    // Base64データの前処理（data:image/jpeg;base64, などのプレフィックスを除去）
    const base64Image = imageData.replace(/^data:image\/[a-z]+;base64,/, "");

    // Google Cloud Vision APIにリクエスト
    const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

    const response = await fetch(visionApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: base64Image,
            },
            features: [
              {
                type: "DOCUMENT_TEXT_DETECTION", // 縦書き・横書き両対応の高精度OCR
                maxResults: 1,
              },
            ],
            imageContext: {
              languageHints: ["ja"], // 日本語に最適化
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Google Vision API エラー:", errorData);
      return NextResponse.json(
        {
          error: "OCR処理に失敗しました",
          details: errorData.error?.message || `HTTP ${response.status}`,
        },
        { status: response.status }
      );
    }

    const result = await response.json();

    // レスポンスの解析
    if (
      !result.responses ||
      !result.responses[0] ||
      !result.responses[0].fullTextAnnotation
    ) {
      return NextResponse.json(
        { error: "テキストが検出されませんでした", text: "" },
        { status: 200 }
      );
    }

    const detectedText =
      result.responses[0].fullTextAnnotation.text || "";

    // デバッグ: OCR結果をログ出力
    console.log("=== Google Vision API OCR Result ===");
    console.log("Detected text length:", detectedText.length);
    console.log("Detected text preview:", detectedText.substring(0, 100));

    return NextResponse.json({
      text: detectedText.trim(),
    });
  } catch (error) {
    console.error("OCR処理エラー:", error);
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        error: "OCR処理中にエラーが発生しました",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

