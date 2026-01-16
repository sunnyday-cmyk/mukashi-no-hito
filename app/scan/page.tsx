"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, RefreshCcw, Loader2, Edit3, ArrowRight, X, Home, Crop } from "lucide-react";
import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import Navigation from "@/components/Navigation";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/useProfile";
import type { Area } from "react-easy-crop";

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
  
  // トリミング関連の状態
  const [showCrop, setShowCrop] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

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
    setShowCrop(true); // トリミング画面を表示
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    video.pause();
  };

  const handleRetake = () => {
    setCaptured(null);
    setOcrText("");
    setError(null);
    setShowCrop(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    videoRef.current?.play();
  };
  
  // トリミング完了時のコールバック
  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    console.log("=== トリミング範囲更新 ===");
    console.log("相対座標:", croppedArea);
    console.log("ピクセル座標:", croppedAreaPixels);
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);
  
  // トリミングした画像を取得する関数
  const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<string> => {
    console.log("=== トリミング処理開始 ===");
    console.log("トリミング範囲（ピクセル）:", pixelCrop);
    
    const image = await createImage(imageSrc);
    console.log("元画像サイズ:", image.width, "x", image.height);
    
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    
    if (!ctx) {
      throw new Error("Canvas context not available");
    }
    
    // react-easy-cropのcroppedAreaPixelsは既に元画像のピクセル座標なので、そのまま使用
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    
    console.log("Canvasサイズ:", canvas.width, "x", canvas.height);
    
    // 元画像から指定範囲を切り出してCanvasに描画
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );
    
    console.log("Canvas描画完了");
    
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas is empty"));
            return;
          }
          console.log("Blob生成完了 - サイズ:", blob.size, "bytes");
          const reader = new FileReader();
          reader.addEventListener("load", () => {
            const result = reader.result as string;
            console.log("Base64変換完了 - 長さ:", result.length);
            console.log("=== トリミング処理完了 ===");
            resolve(result);
          });
          reader.addEventListener("error", (error) => reject(error));
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        0.9
      );
    });
  };
  
  // 画像を読み込むヘルパー関数
  const createImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.src = url;
    });
  };

  // トリミング画面からOCRを実行（Google Cloud Vision API使用）
  const handleCropAndOcr = async () => {
    if (!captured || !croppedAreaPixels) {
      console.error("トリミングデータが不足しています:", { captured: !!captured, croppedAreaPixels });
      setError("トリミング範囲が設定されていません。");
      return;
    }
    
    setOcrLoading(true);
    setStatusText("画像を切り出しています...");
    setError(null);
    setShowCrop(false);
    
    try {
      // トリミングした画像を取得
      console.log("=== OCR処理開始 ===");
      console.log("トリミング範囲:", croppedAreaPixels);
      const croppedImageUrl = await getCroppedImg(captured, croppedAreaPixels);
      
      // デバッグ: トリミング後の画像データを確認
      console.log("=== トリミング後の画像データ ===");
      console.log("Base64データ長:", croppedImageUrl.length);
      console.log("Base64プレビュー:", croppedImageUrl.substring(0, 100) + "...");
      
      // Google Cloud Vision APIに送信
      setStatusText("文字を読み取っています...");
      
      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageData: croppedImageUrl, // トリミング済みのBase64形式の画像データ
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "OCR処理に失敗しました");
      }

      const result = await response.json();
      
      // デバッグ: OCR直後の生テキストをコンソールに出力
      const rawOcrText = result.text || "";
      console.log("=== Google Vision API OCR Raw Text Debug ===");
      console.log("OCR生テキスト（長さ）:", rawOcrText.length);
      console.log("OCR生テキスト（全文）:");
      console.log(rawOcrText);
      console.log("============================================");
      
      if (!rawOcrText) {
        setError("テキストが検出されませんでした。範囲を調整して再度お試しください。");
        setShowCrop(true); // エラー時はトリミング画面に戻る
        return;
      }
      
      setOcrText(rawOcrText);
    } catch (e) {
      console.error("OCR処理エラー:", e);
      setError(
        e instanceof Error
          ? e.message
          : "文字の読み取りに失敗しました。やり直すか撮影し直してください。"
      );
      setShowCrop(true); // エラー時はトリミング画面に戻る
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

      // デバッグ: Claudeに送る直前のテキストをログ出力
      const textToAnalyze = ocrText.trim();
      console.log("=== Claude API Request (Client Side) ===");
      console.log("送信するテキスト（長さ）:", textToAnalyze.length);
      console.log("送信するテキスト（全文）:");
      console.log(textToAnalyze);
      console.log("=========================================");

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ text: textToAnalyze }),
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
        ) : showCrop ? (
          // トリミング画面
          <div className="relative h-full w-full bg-black">
            <Cropper
              image={captured}
              crop={crop}
              zoom={zoom}
              aspect={2 / 3} // 縦長の比率（2:3）
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              cropShape="rect"
              showGrid={true}
              style={{
                containerStyle: {
                  width: "100%",
                  height: "100%",
                  position: "relative",
                },
              }}
            />
          </div>
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
        <div className="mx-auto flex h-14 max-w-md items-center justify-center gap-2 px-4">
          <h1 className="text-base font-medium text-white flex-shrink-0">昔の人</h1>
          {loading && <span className="text-[11px] text-white/70">起動中…</span>}
        </div>
      </div>

      {/* ホーム画面へ戻るボタン（画面左下） */}
      <button
        type="button"
        onClick={() => router.push('/')}
        className="fixed bottom-24 left-4 z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-black/60 backdrop-blur-md border-2 border-white/30 transition hover:bg-black/80 active:scale-95 touch-manipulation safe-area-bottom shadow-lg"
        aria-label="ホームに戻る"
      >
        <X className="h-6 w-6 text-white drop-shadow-lg" />
      </button>

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

      {/* トリミング画面の操作ガイドとボタン */}
      {captured && showCrop && (
        <>
          {/* 操作ガイド（上部） */}
          <div className="absolute top-20 left-0 right-0 z-40 px-4">
            <div className="mx-auto max-w-md rounded-xl bg-black/70 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <Crop className="h-5 w-5 flex-shrink-0 text-white mt-0.5" />
                <div className="flex-1 text-sm text-white">
                  <p className="font-medium mb-1">解析範囲を選択</p>
                  <p className="text-xs text-white/80">
                    ピンチで拡大縮小、ドラッグで位置調整ができます。縦長の古文に合わせて範囲を選択してください。
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* ズームコントロール（中央右側） */}
          <div className="absolute right-4 top-1/2 z-40 -translate-y-1/2">
            <div className="flex flex-col items-center gap-2 rounded-full bg-black/70 p-2 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(prev + 0.1, 3))}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30 active:scale-95"
                aria-label="拡大"
              >
                +
              </button>
              <div className="h-16 w-0.5 bg-white/30" />
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(prev - 0.1, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30 active:scale-95"
                aria-label="縮小"
              >
                −
              </button>
            </div>
          </div>
          
          {/* ボタン群（下部） */}
          <div className="absolute bottom-0 left-0 right-0 z-40 bg-black/70 backdrop-blur-sm px-5 py-4 safe-area-bottom">
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
                onClick={handleCropAndOcr}
                disabled={ocrLoading || !croppedAreaPixels}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-gray-900 shadow-lg transition hover:bg-gray-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-80"
              >
                {ocrLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Crop className="h-5 w-5" />
                    この範囲を解析
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* 撮影後のボタン群（トリミング画面を閉じた後、OCR結果がない場合） */}
      {captured && !showCrop && !ocrText && (
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
              onClick={() => setShowCrop(true)}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-gray-900 shadow-lg transition hover:bg-gray-100 active:scale-95"
            >
              <Crop className="h-5 w-5" />
              範囲を選択
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
