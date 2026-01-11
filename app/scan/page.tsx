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
    <div className="relative min-h-screen bg-black text-white">
      <Header />
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
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      </div>

      {/* OCR ローディングオーバーレイ */}
      {(ocrLoading || analyzing) && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
          <Loader2 className="mb-3 h-10 w-10 animate-spin text-white" />
          <p className="text-sm text-gray-100">{statusText}</p>
        </div>
      )}

      <div className="relative z-10 flex h-full flex-col">
        <header className="flex items-center justify-between px-5 pt-5 text-sm text-gray-200">
          <span>カメラ撮影</span>
          {loading && <span className="text-[11px] text-gray-400">起動中…</span>}
        </header>

        {error && (
          <div className="mx-5 mt-3 rounded-xl bg-red-500/20 px-3 py-2 text-[13px] text-red-100">
            {error}
          </div>
        )}

        <div className="flex flex-1 flex-col justify-end pb-8">
          {/* 読み取り結果編集エリア */}
          {ocrText && (
            <div className="mx-5 mb-5 rounded-2xl bg-white/10 p-4 backdrop-blur">
              <div className="mb-3 flex items-center gap-2 text-sm text-gray-100">
                <Edit3 className="h-4 w-4" />
                <span>読み取り結果（編集できます）</span>
              </div>
              <textarea
                value={ocrText}
                onChange={(e) => setOcrText(e.target.value)}
                className="h-32 w-full resize-none rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
              />
              <button
                type="button"
                onClick={handleProceed}
                disabled={analyzing || !ocrText.trim()}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-medium text-black shadow-lg transition hover:bg-gray-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-80"
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

          {/* 下部ボタン群 */}
          {!captured ? (
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={handleCapture}
                className="group flex h-16 w-16 items-center justify-center rounded-full bg-white text-black shadow-lg transition active:scale-95"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-white transition group-active:scale-95">
                  <Camera className="h-6 w-6" />
                </span>
              </button>
            </div>
          ) : (
            <div className="flex w-full items-center justify-center gap-3 px-5">
              <button
                type="button"
                onClick={handleRetake}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
              >
                <RefreshCcw className="h-4 w-4" />
                やり直す
              </button>
              <button
                type="button"
                onClick={handleOcr}
                disabled={ocrLoading}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-black shadow-lg transition hover:bg-gray-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-80"
              >
                <Camera className="h-4 w-4" />
                この画像で解析
              </button>
            </div>
          )}
        </div>
      </div>
      <Navigation />
    </div>
  );
}

