"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCcw, Loader2, Edit3, ArrowRight } from "lucide-react";
import Tesseract from "tesseract.js";
import Navigation from "@/components/Navigation";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/useProfile";

export default function ScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string>("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [statusText, setStatusText] = useState("文字を読み取っています...");
  const { refetch: refetchProfile } = useProfile();

  useEffect(() => {
    const startCamera = async () => {
      setLoading(true);
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e) {
        setError(
          "カメラを開始できませんでした。権限とデバイス設定を確認してください。"
        );
      } finally {
        setLoading(false);
      }
    };

    startCamera();

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCaptured(dataUrl);
    setOcrText("");
    video.pause();
  };

  const handleRetake = () => {
    setCaptured(null);
    setOcrText("");
    setError(null);
    videoRef.current?.play();
  };

  const handleOcr = async () => {
    if (!captured) return;
    setOcrLoading(true);
    setStatusText("文字を読み取っています...");
    setError(null);
    try {
      const { data } = await Tesseract.recognize(captured, "jpn_vert+jpn", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setStatusText("文字を読み取っています...");
          } else if (m.status === "loading tesseract core") {
            setStatusText("OCRエンジンを読み込み中...");
          } else if (m.status === "initializing api") {
            setStatusText("日本語縦書きモデルを準備しています...");
          }
        },
      });
      setOcrText(data.text.trim());
    } catch (e) {
      setError("文字の読み取りに失敗しました。やり直すか撮影し直してください。");
    } finally {
      setOcrLoading(false);
    }
  };

  const [analyzing, setAnalyzing] = useState(false);

  const handleProceed = async () => {
    if (!ocrText.trim()) {
      setError("テキストが入力されていません。");
      return;
    }

    setAnalyzing(true);
    setError(null);
    setStatusText("古文を解析しています...");

    try {
      // 認証トークンを取得
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("ログインが必要です。");
        setAnalyzing(false);
        router.push("/login");
        return;
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ text: ocrText.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "解析に失敗しました");
      }

      const result = await response.json();
      
      // クレジット情報を更新（解析が完了したため）
      await refetchProfile();
      
      // 解析結果をクエリパラメータとして結果画面に渡す
      const params = new URLSearchParams({
        text: ocrText.trim(),
        result: JSON.stringify(result),
      });
      window.location.href = `/result?${params.toString()}`;
    } catch (e) {
      console.error("解析エラー:", e);
      setError(
        e instanceof Error
          ? e.message
          : "古文の解析中にエラーが発生しました。もう一度お試しください。"
      );
      setAnalyzing(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <Header />
      
      {/* カメラプレビューエリア（ヘッダーとナビゲーションの間の全画面） */}
      <div className="relative flex-1 overflow-hidden">
        {!captured ? (
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            autoPlay
            playsInline
            muted
          />
        ) : (
          <img
            src={captured}
            alt="撮影した画像のプレビュー"
            className="h-full w-full object-contain bg-black"
          />
        )}

        {/* OCR ローディングオーバーレイ */}
        {(ocrLoading || analyzing) && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
            <Loader2 className="mb-3 h-10 w-10 animate-spin text-white" />
            <p className="text-sm text-gray-100">{statusText}</p>
          </div>
        )}

        {/* エラーメッセージ */}
        {error && !captured && (
          <div className="absolute top-4 left-1/2 z-20 -translate-x-1/2 rounded-xl bg-red-500/90 px-4 py-2 text-sm text-white backdrop-blur">
            {error}
          </div>
        )}

        {/* 読み取り結果編集エリア（撮影後） */}
        {captured && ocrText && (
          <div className="absolute inset-x-4 top-4 z-20 rounded-2xl bg-white/95 p-4 backdrop-blur">
            <div className="mb-3 flex items-center gap-2 text-sm text-gray-900">
              <Edit3 className="h-4 w-4" />
              <span>読み取り結果（編集できます）</span>
            </div>
            <textarea
              value={ocrText}
              onChange={(e) => setOcrText(e.target.value)}
              className="h-32 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-300"
            />
            <button
              type="button"
              onClick={handleProceed}
              disabled={analyzing || !ocrText.trim()}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gray-900 text-sm font-medium text-white shadow-lg transition hover:bg-gray-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-80"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  解析中...
                </>
              ) : (
                <>
                  次へ（解析へ）
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* 下部コントロールエリア（ナビゲーションの上） */}
        <div className="absolute inset-x-0 bottom-0 z-20 pb-20">
          {/* グラデーションオーバーレイ */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
          
          {/* ボタン群 */}
          <div className="relative flex items-center justify-center px-5">
            {!captured ? (
              /* シャッターボタン（丸い大きな白い枠の中にアイコン） */
              <button
                type="button"
                onClick={handleCapture}
                className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/10 shadow-2xl backdrop-blur transition active:scale-95"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-gray-900">
                  <Camera className="h-8 w-8" />
                </span>
              </button>
            ) : (
              <div className="flex w-full max-w-md items-center gap-3">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full border-2 border-white/50 bg-white/10 px-4 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
                >
                  <RefreshCcw className="h-5 w-5" />
                  やり直す
                </button>
                <button
                  type="button"
                  onClick={handleOcr}
                  disabled={ocrLoading}
                  className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-gray-900 shadow-lg transition hover:bg-gray-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-80"
                >
                  {ocrLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Camera className="h-5 w-5" />
                      この画像で解析
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Navigation />
    </div>
  );
}

