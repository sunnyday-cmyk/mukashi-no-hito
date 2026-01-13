"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCcw, Loader2, Edit3, ArrowRight, X, Home } from "lucide-react";
import Tesseract from "tesseract.js";
import Navigation from "@/components/Navigation";
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
    <div className="fixed inset-0 bg-black">
      {/* ビデオプレビュー（全画面） */}
      <div className="absolute inset-0">
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
      </div>

      {/* 半透明ヘッダー（映像の上に浮かせる） */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-black/40 backdrop-blur-sm safe-area-top">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between gap-2 px-4">
          {/* ホーム画面へ戻るボタン */}
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm transition hover:bg-black/50 active:scale-95 touch-manipulation"
            aria-label="ホームに戻る"
          >
            <X className="h-6 w-6 text-white drop-shadow-lg" />
          </button>
          <h1 className="text-base font-medium text-white flex-shrink-0">昔の人</h1>
          {loading ? (
            <span className="text-[11px] text-white/70">起動中…</span>
          ) : (
            <div className="w-11" /> {/* スペーサー */}
          )}
        </div>
      </div>

      {/* エラーメッセージ */}
      {error && !captured && (
        <div className="absolute top-20 left-1/2 z-30 -translate-x-1/2 rounded-xl bg-red-500/90 px-4 py-2 text-sm text-white backdrop-blur max-w-[90%]">
          {error}
        </div>
      )}

      {/* OCR ローディングオーバーレイ */}
      {(ocrLoading || analyzing) && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
          <Loader2 className="mb-3 h-10 w-10 animate-spin text-white" />
          <p className="text-sm text-gray-100">{statusText}</p>
        </div>
      )}

      {/* 読み取り結果編集エリア（撮影後） */}
      {captured && ocrText && (
        <div className="absolute inset-x-4 top-20 z-30 rounded-2xl bg-white/95 p-4 backdrop-blur shadow-lg max-h-[60vh] overflow-y-auto">
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

      {/* 下部操作エリア（半透明の黒背景） */}
      {!captured && (
        <div className="absolute bottom-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-sm safe-area-bottom" style={{ paddingBottom: '80px' }}>
          {/* シャッターボタン（下から80-100pxの位置、カメラらしいデザイン） */}
          <div className="flex items-center justify-center py-4">
            <button
              type="button"
              onClick={handleCapture}
              className="relative flex h-20 w-20 items-center justify-center transition active:scale-90 touch-manipulation"
              aria-label="撮影"
            >
              {/* 外側の白い大きな円（太めの枠線） */}
              <div className="absolute inset-0 rounded-full border-4 border-white shadow-lg" />
              {/* 内側の白い塗りつぶしの円 */}
              <div className="absolute inset-2 rounded-full bg-white shadow-inner" />
            </button>
          </div>
        </div>
      )}

      {/* 撮影後のボタン群 */}
      {captured && !ocrText && (
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-black/50 backdrop-blur-sm px-5 py-4 safe-area-bottom">
          <div className="flex w-full items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleRetake}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full border-2 border-white/50 bg-white/10 px-4 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
            >
              <RefreshCcw className="h-5 w-5" />
              やり直す
            </button>
            <button
              type="button"
              onClick={handleOcr}
              disabled={ocrLoading}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-gray-900 shadow-lg transition hover:bg-gray-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-80"
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
        </div>
      )}
    </div>
  );
}
