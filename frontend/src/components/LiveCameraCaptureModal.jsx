import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, RefreshCw, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "./ui/index.jsx";
import { useI18n } from "../i18n/language-context";

export default function LiveCameraCaptureModal({ isOpen, onClose, onCapture }) {
  const { t } = useI18n();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [facingMode, setFacingMode] = useState("environment"); // 'environment' | 'user'
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Check available video devices
  useEffect(() => {
    if (!isOpen) return;

    const checkDevices = async () => {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        setHasMultipleCameras(videoInputs.length > 1);
      } catch {
        // Fallback
      }
    };

    checkDevices();
  }, [isOpen]);

  // Start or switch camera stream
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    let isMounted = true;

    const startCamera = async () => {
      setIsLoading(true);
      setCameraError("");
      stopCamera();

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Live camera is not supported on this browser/device.");
        }

        const constraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setIsLoading(false);
      } catch (err) {
        if (!isMounted) return;
        console.error("Camera access error:", err);
        setIsLoading(false);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setCameraError("Camera permission was denied. Please allow camera access in your browser settings.");
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setCameraError("No camera hardware found on this device.");
        } else {
          setCameraError(err.message || "Unable to start camera stream.");
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const handleCaptureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const vWidth = video.videoWidth || 1280;
    const vHeight = video.videoHeight || 720;

    canvas.width = vWidth;
    canvas.height = vHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // If using front camera, mirror image for natural snapshot
    if (facingMode === "user") {
      ctx.translate(vWidth, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, vWidth, vHeight);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `udder_camera_${Date.now()}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
        const previewUrl = URL.createObjectURL(blob);

        stopCamera();
        onCapture(file, previewUrl);
      },
      "image/jpeg",
      0.95
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
        {/* Hidden Canvas for High-Res Capture */}
        <canvas ref={canvasRef} className="hidden" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl flex flex-col"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800/80 bg-slate-900/60 z-10">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Camera className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">
                  {t("cameraModal.title") || "Live Udder Camera"}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {t("cameraModal.subtitle") || "Position udder inside the guide frame and tap capture"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Viewfinder Video Area */}
          <div className="relative w-full aspect-4/3 sm:aspect-16/9 bg-black flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${
                facingMode === "user" ? "scale-x-[-1]" : ""
              }`}
            />

            {/* Viewfinder Target Guidelines Overlay */}
            {!isLoading && !cameraError && (
              <div className="absolute inset-8 sm:inset-12 pointer-events-none border-2 border-dashed border-emerald-400/70 rounded-3xl flex flex-col justify-between p-4 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                <div className="flex justify-between text-[10px] font-mono text-emerald-400/90 tracking-widest uppercase">
                  <span>┌ Udder Frame</span>
                  <span>┐</span>
                </div>
                <div className="text-center">
                  <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-[11px] font-semibold">
                    Align quarters & teats in center
                  </span>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-emerald-400/90 tracking-widest uppercase">
                  <span>└</span>
                  <span>┘</span>
                </div>
              </div>
            )}

            {/* Loading Spinner */}
            {isLoading && (
              <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-3 text-white">
                <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin" />
                <p className="text-xs font-semibold text-slate-300">{t("common.loading") || "Starting camera…"}</p>
              </div>
            )}

            {/* Error Message with Fallback Guidance */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-950/95 p-6 flex flex-col items-center justify-center text-center gap-4">
                <div className="h-12 w-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h4 className="text-sm font-bold text-white">Camera Access Notice</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{cameraError}</p>
                </div>
                <Button
                  type="button"
                  onClick={onClose}
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-bold px-4"
                >
                  Use Upload from Files Instead
                </Button>
              </div>
            )}
          </div>

          {/* Bottom Controls Bar */}
          <div className="p-4 sm:p-5 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-4">
            {/* Flip Camera Button */}
            {hasMultipleCameras ? (
              <button
                type="button"
                onClick={handleFlipCamera}
                disabled={isLoading || Boolean(cameraError)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("cameraModal.switchCamera") || "Flip Camera"}</span>
              </button>
            ) : (
              <div className="w-20" />
            )}

            {/* Shutter Capture Button */}
            <button
              type="button"
              onClick={handleCaptureSnapshot}
              disabled={isLoading || Boolean(cameraError)}
              className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-1 shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100 cursor-pointer flex items-center justify-center"
              title={t("cameraModal.capturePhoto") || "Capture Photo"}
            >
              <div className="h-full w-full rounded-full border-2 border-white flex items-center justify-center bg-white/20">
                <Camera className="h-6 w-6 text-white" />
              </div>
            </button>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              {t("common.cancel") || "Cancel"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
