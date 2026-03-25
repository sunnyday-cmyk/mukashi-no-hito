"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X, ArrowRight, Crop, Edit3 } from "lucide-react";
import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import type { Area } from "react-easy-crop";
import { supabase } from "@/lib/supabaseClient";
import { insertHistory } from "@/lib/supabase-db";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { Subject } from "@/types";
import { SUBJECT_LABELS } from "@/types";

const SUBJECTS: Subject[] = ["japanese_classical", "chinese_classical", "english"];

export default function CameraPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [subject, setSubject] = useState<Subject>("japanese_classical");
  const [showCrop, setShowCrop] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        setError("カメラを起動できませんでした");
      } finally {
        setLoading(false);
      }
    };
    start();
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 1280;
    canvas.height = v.videoHeight || 720;
    canvas.getContext("2d")?.drawImage(v, 0, 0);
    setCaptured(canvas.toDataURL("image/jpeg", 0.9));
    setShowCrop(true);
    v.pause();
  };

  const handleRetake = () => {
    setCaptured(null); setOcrText(""); setError(null);
    setShowCrop(false); setCrop({ x: 0, y: 0 }); setZoom(1); setCroppedAreaPixels(null);
    videoRef.current?.play();
  };

  const onCropComplete = useCallback((_: Area, px: Area) => setCroppedAreaPixels(px), []);

  const createImage = (url: string) => new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = url;
  });

  const getCroppedImg = async (src: string, px: Area) => {
    const img = await createImage(src);
    const canvas = document.createElement("canvas");
    canvas.width = px.width; canvas.height = px.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, px.x, px.y, px.width, px.height, 0, 0, px.width, px.height);
    return canvas.toDataURL("image/jpeg", 0.9);
  };

  const handleCropAndOcr = async () => {
    if (!captured || !croppedAreaPixels) { setError("トリミング範囲を設定してください"); return; }
    setOcrLoading(true); setShowCrop(false); setError(null);
    try {
      const croppedUrl = await getCroppedImg(captured, croppedAreaPixels);
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: croppedUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "OCR失敗");
      if (!data.text) { setError("テキストが検出されませんでした"); setShowCrop(true); return; }
      setOcrText(data.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "OCRに失敗しました");
      setShowCrop(true);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleProceed = async () => {
    if (!ocrText.trim()) { setError("テキストがありません"); return; }
    setAnalyzing(true); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ text: ocrText.trim(), subject }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "解析失敗"); }
      const result = await res.json();

      try {
        await insertHistory(supabase, session.user.id, {
          originalText: ocrText.trim(),
          translation: result.translation || "",
          resultJson: JSON.stringify(result),
        });
      } catch {}

      const params = new URLSearchParams({ text: ocrText.trim(), subject, result: JSON.stringify(result) });
      router.push(`/translate/result?${params.toString()}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
      setAnalyzing(false);
    }
  };

  if (analyzing) return <LoadingSpinner message="AIが解析しています..." />;

  return (
    <div className="fixed inset-0 bg-black">
      {/* ビデオ / 撮影後プレビュー */}
      <div className="absolute inset-0">
        {!captured ? (
          <video ref={videoRef} className="h-full w-full object-cover" autoPlay playsInline muted />
        ) : showCrop ? (
          <div className="relative h-full w-full">
            <Cropper
              image={captured} crop={crop} zoom={zoom} aspect={2 / 3}
              onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete}
              cropShape="rect" showGrid
              style={{ containerStyle: { width: "100%", height: "100%", position: "relative" } }}
            />
          </div>
        ) : (
          <img src={captured} alt="preview" className="h-full w-full object-contain bg-black" />
        )}
      </div>

      {/* ヘッダー */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-black/50 backdrop-blur-sm safe-area-top">
        <div className="flex h-14 items-center justify-between px-4">
          <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <X className="h-5 w-5 text-white" />
          </button>
          <h1 className="text-base font-medium text-white">カメラ</h1>
          <div className="w-9" />
        </div>
      </div>

      {/* エラー */}
      {error && (
        <div className="absolute top-20 inset-x-4 z-40 rounded-xl bg-red-500/90 px-4 py-2 text-sm text-white text-center">
          {error}
        </div>
      )}

      {/* ローディング */}
      {(ocrLoading || analyzing) && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70">
          <Loader2 className="h-10 w-10 animate-spin text-white mb-3" />
          <p className="text-sm text-white">{ocrLoading ? "文字を読み取っています..." : "解析中..."}</p>
        </div>
      )}

      {/* シャッターボタン（撮影前） */}
      {!captured && (
        <>
          <div className="absolute bottom-24 inset-x-0 z-40 flex justify-center gap-2 px-4">
            {SUBJECTS.map((s) => (
              <button key={s} onClick={() => setSubject(s)}
                className="rounded-full px-3 py-1 text-xs font-medium transition"
                style={subject === s
                  ? { background: "var(--color-accent)", color: "white" }
                  : { background: "rgba(255,255,255,0.2)", color: "white" }
                }>
                {SUBJECT_LABELS[s]}
              </button>
            ))}
          </div>
          <div className="absolute bottom-8 inset-x-0 z-40 flex justify-center pb-safe">
            <button onClick={handleCapture}
              className="relative flex h-20 w-20 items-center justify-center transition active:scale-90">
              <div className="absolute inset-0 rounded-full border-4 border-white" />
              <div className="absolute inset-2 rounded-full bg-white" />
            </button>
          </div>
        </>
      )}

      {/* トリミング操作ガイド */}
      {captured && showCrop && (
        <>
          <div className="absolute top-20 inset-x-4 z-40">
            <div className="rounded-xl bg-black/70 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-start gap-2">
                <Crop className="h-4 w-4 text-white mt-0.5 flex-shrink-0" />
                <p className="text-xs text-white">
                  ピンチで拡大・ドラッグで位置調整。解析する範囲を囲んでください。
                </p>
              </div>
            </div>
          </div>
          <div className="absolute bottom-8 inset-x-4 z-40 flex gap-3 pb-safe">
            <button onClick={handleRetake}
              className="flex-1 rounded-2xl border border-white/30 py-3 text-sm font-medium text-white bg-black/40">
              撮り直す
            </button>
            <button onClick={handleCropAndOcr}
              className="flex-1 rounded-2xl py-3 text-sm font-semibold text-white"
              style={{ background: "var(--color-accent)" }}>
              この範囲を解析
            </button>
          </div>
        </>
      )}

      {/* OCR結果編集エリア */}
      {captured && ocrText && !showCrop && (
        <div className="absolute inset-x-4 top-20 z-40 rounded-2xl bg-white/95 p-4 shadow-lg max-h-[60vh] overflow-y-auto">
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-700">
            <Edit3 className="h-4 w-4" />
            <span>読み取り結果（修正できます）</span>
          </div>
          <textarea value={ocrText} onChange={(e) => setOcrText(e.target.value)}
            className="w-full h-28 resize-none rounded-xl border p-3 text-sm text-gray-900 focus:outline-none"
            style={{ borderColor: "var(--color-border)" }} />
          <div className="mt-3 flex gap-2">
            <button onClick={handleRetake}
              className="flex-1 rounded-xl border py-3 text-sm font-medium text-gray-700"
              style={{ borderColor: "var(--color-border)" }}>
              撮り直す
            </button>
            <button onClick={handleProceed}
              className="flex-1 rounded-xl py-3 text-sm font-semibold text-white flex items-center justify-center gap-1"
              style={{ background: "var(--color-accent)" }}>
              解析する <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
