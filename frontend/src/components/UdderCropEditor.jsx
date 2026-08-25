import { useState, useRef, useEffect, useCallback } from "react";
import { Crop, RotateCcw, Image as ImageIcon, Check, Move, AlertCircle } from "lucide-react";
import { Button } from "./ui/index.jsx";
import { useI18n } from "../i18n/language-context";

/**
 * Robust, zero-dependency, touch & mouse friendly Udder Crop & ROI selection editor.
 * Allows farmers to drag and resize an ROI rectangle over an uploaded udder image.
 */
export default function UdderCropEditor({
  imageUrl,
  imageFile,
  onConfirmCrop,
  onCancel,
  onRetake,
}) {
  const { t } = useI18n();
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  // Natural image dimensions
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  // Displayed image dimensions on screen
  const [displayedSize, setDisplayedSize] = useState({ width: 0, height: 0 });

  // Normalized crop rectangle in percentages [0, 100]
  const [crop, setCrop] = useState({ x: 10, y: 10, width: 80, height: 80 });

  // Interaction state
  const [isDragging, setIsDragging] = useState(false);
  const [activeHandle, setActiveHandle] = useState(null); // 'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, cropX: 0, cropY: 0, cropW: 0, cropH: 0 });

  // Cropped preview blob URL
  const [previewUrl, setPreviewUrl] = useState(null);

  // Initialize crop when image loads
  const handleImageLoaded = (e) => {
    const img = e.target;
    const nW = img.naturalWidth || img.width;
    const nH = img.naturalHeight || img.height;
    setNaturalSize({ width: nW, height: nH });
    setDisplayedSize({ width: img.clientWidth, height: img.clientHeight });

    // Initial crop: center 75%
    setCrop({
      x: 12.5,
      y: 12.5,
      width: 75,
      height: 75,
    });
  };

  // Keep displayed size in sync with resize
  useEffect(() => {
    const updateSize = () => {
      if (imageRef.current) {
        setDisplayedSize({
          width: imageRef.current.clientWidth,
          height: imageRef.current.clientHeight,
        });
      }
    };
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Generate live cropped preview
  const generateCroppedBlob = useCallback(async () => {
    if (!imageRef.current || naturalSize.width === 0) return null;

    const img = imageRef.current;
    const canvas = document.createElement("canvas");

    // Compute pixel coordinates relative to natural image
    const pixelX = Math.round((crop.x / 100) * naturalSize.width);
    const pixelY = Math.round((crop.y / 100) * naturalSize.height);
    const pixelW = Math.round((crop.width / 100) * naturalSize.width);
    const pixelH = Math.round((crop.height / 100) * naturalSize.height);

    // Target dimensions: 224 x 224 for Model 1 (MobileNetV2) or original crop resolution
    canvas.width = Math.max(pixelW, 10);
    canvas.height = Math.max(pixelH, 10);

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(
      img,
      pixelX,
      pixelY,
      pixelW,
      pixelH,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          const croppedFile = new File([blob], `cropped_${imageFile?.name || "udder.jpg"}`, {
            type: "image/jpeg",
          });
          const coordinates = {
            x: pixelX,
            y: pixelY,
            width: pixelW,
            height: pixelH,
            image_width: naturalSize.width,
            image_height: naturalSize.height,
            unit: "px",
          };
          resolve({ blob, file: croppedFile, coordinates, previewUrl: URL.createObjectURL(blob) });
        },
        "image/jpeg",
        0.95
      );
    });
  }, [crop, naturalSize, imageFile]);

  // Update live preview thumbnail whenever crop finishes dragging
  useEffect(() => {
    if (!isDragging && naturalSize.width > 0) {
      let active = true;
      generateCroppedBlob().then((res) => {
        if (active && res) {
          setPreviewUrl(res.previewUrl);
        }
      });
      return () => {
        active = false;
      };
    }
  }, [isDragging, crop, naturalSize, generateCroppedBlob]);

  // Pointer event handlers for drag / resize
  const handlePointerDown = (e, handleType) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    setActiveHandle(handleType);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      cropX: crop.x,
      cropY: crop.y,
      cropW: crop.width,
      cropH: crop.height,
    });
  };

  const handlePointerMove = useCallback(
    (e) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const deltaXPercent = ((e.clientX - dragStart.x) / rect.width) * 100;
      const deltaYPercent = ((e.clientY - dragStart.y) / rect.height) * 100;

      const minSize = 15; // Minimum 15% width/height to prevent zero size

      if (activeHandle === "move") {
        let newX = dragStart.cropX + deltaXPercent;
        let newY = dragStart.cropY + deltaYPercent;

        // Clamp to boundaries
        newX = Math.max(0, Math.min(100 - dragStart.cropW, newX));
        newY = Math.max(0, Math.min(100 - dragStart.cropH, newY));

        setCrop((prev) => ({ ...prev, x: newX, y: newY }));
      } else if (activeHandle === "se") {
        let newW = Math.max(minSize, Math.min(100 - dragStart.cropX, dragStart.cropW + deltaXPercent));
        let newH = Math.max(minSize, Math.min(100 - dragStart.cropY, dragStart.cropH + deltaYPercent));
        setCrop((prev) => ({ ...prev, width: newW, height: newH }));
      } else if (activeHandle === "nw") {
        let newX = Math.max(0, Math.min(dragStart.cropX + dragStart.cropW - minSize, dragStart.cropX + deltaXPercent));
        let newY = Math.max(0, Math.min(dragStart.cropY + dragStart.cropH - minSize, dragStart.cropY + deltaYPercent));
        let newW = dragStart.cropW - (newX - dragStart.cropX);
        let newH = dragStart.cropH - (newY - dragStart.cropY);
        setCrop({ x: newX, y: newY, width: newW, height: newH });
      } else if (activeHandle === "ne") {
        let newY = Math.max(0, Math.min(dragStart.cropY + dragStart.cropH - minSize, dragStart.cropY + deltaYPercent));
        let newW = Math.max(minSize, Math.min(100 - dragStart.cropX, dragStart.cropW + deltaXPercent));
        let newH = dragStart.cropH - (newY - dragStart.cropY);
        setCrop((prev) => ({ ...prev, y: newY, width: newW, height: newH }));
      } else if (activeHandle === "sw") {
        let newX = Math.max(0, Math.min(dragStart.cropX + dragStart.cropW - minSize, dragStart.cropX + deltaXPercent));
        let newW = dragStart.cropW - (newX - dragStart.cropX);
        let newH = Math.max(minSize, Math.min(100 - dragStart.cropY, dragStart.cropH + deltaYPercent));
        setCrop((prev) => ({ ...prev, x: newX, width: newW, height: newH }));
      }
    },
    [isDragging, activeHandle, dragStart]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    setActiveHandle(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      return () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };
    }
  }, [isDragging, handlePointerMove, handlePointerUp]);

  const handleResetCrop = () => {
    setCrop({ x: 10, y: 10, width: 80, height: 80 });
  };

  const handleConfirm = async () => {
    const result = await generateCroppedBlob();
    if (result && onConfirmCrop) {
      onConfirmCrop({
        originalFile: imageFile,
        croppedFile: result.file,
        croppedPreviewUrl: result.previewUrl,
        coordinates: result.coordinates,
      });
    }
  };

  return (
    <div className="rounded-2xl border border-teal-200 dark:border-teal-900/60 bg-white dark:bg-slate-900 p-5 shadow-lg space-y-4">
      {/* Header & Instructions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400">
              <Crop className="h-4 w-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t("cropEditor.title") || "Select Udder Area"}
            </h3>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800">
              {t("cropEditor.step") || "Step 2 of 2"}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t("cropEditor.instructions") || "Select the area containing the udder and teats. Include the complete visible udder while minimizing unnecessary background."}
          </p>
        </div>

        {/* Live Cropped Thumbnail Preview */}
        {previewUrl && (
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("cropEditor.roiPreview") || "Focus Area"}</p>
              <p className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">{t("cropEditor.model1Target") || "Selected Region"}</p>
            </div>
            <img
              src={previewUrl}
              alt="Cropped preview"
              className="h-14 w-14 rounded-xl object-cover border-2 border-teal-500 shadow-xs"
            />
          </div>
        )}
      </div>

      {/* Interactive Crop Workspace */}
      <div className="relative flex justify-center items-center bg-slate-950 rounded-xl overflow-hidden min-h-[280px] max-h-[480px] p-2 select-none touch-none">
        <div ref={containerRef} className="relative inline-block max-w-full max-h-[440px]">
          {/* Main Image */}
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Udder for cropping"
            onLoad={handleImageLoaded}
            className="max-h-[440px] w-auto object-contain block pointer-events-none rounded-lg"
          />

          {/* Semi-transparent backdrop overlay */}
          <div
            className="absolute inset-0 bg-black/55 pointer-events-none rounded-lg"
            style={{
              clipPath: `polygon(
                0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
                ${crop.x}% ${crop.y}%,
                ${crop.x + crop.width}% ${crop.y}%,
                ${crop.x + crop.width}% ${crop.y + crop.height}%,
                ${crop.x}% ${crop.y + crop.height}%,
                ${crop.x}% ${crop.y}%
              )`,
            }}
          />

          {/* Draggable & Resizable Selection Box */}
          <div
            onPointerDown={(e) => handlePointerDown(e, "move")}
            className="absolute border-2 border-teal-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] cursor-move transition-shadow"
            style={{
              left: `${crop.x}%`,
              top: `${crop.y}%`,
              width: `${crop.width}%`,
              height: `${crop.height}%`,
            }}
          >
            {/* Center crosshair helper */}
            <div className="absolute inset-0 flex items-center justify-center opacity-40 pointer-events-none">
              <Move className="h-6 w-6 text-white drop-shadow" />
            </div>

            {/* Corner Resize Handles */}
            <div
              onPointerDown={(e) => handlePointerDown(e, "nw")}
              className="absolute -top-2 -left-2 h-4 w-4 rounded-full bg-white border-2 border-teal-500 cursor-nwse-resize shadow-md"
            />
            <div
              onPointerDown={(e) => handlePointerDown(e, "ne")}
              className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-white border-2 border-teal-500 cursor-nesw-resize shadow-md"
            />
            <div
              onPointerDown={(e) => handlePointerDown(e, "sw")}
              className="absolute -bottom-2 -left-2 h-4 w-4 rounded-full bg-white border-2 border-teal-500 cursor-nesw-resize shadow-md"
            />
            <div
              onPointerDown={(e) => handlePointerDown(e, "se")}
              className="absolute -bottom-2 -right-2 h-4 w-4 rounded-full bg-white border-2 border-teal-500 cursor-nwse-resize shadow-md"
            />

            {/* Dimension Badge */}
            <div className="absolute bottom-1 left-1 bg-black/75 backdrop-blur-xs text-white text-[10px] font-mono px-1.5 py-0.5 rounded pointer-events-none">
              {Math.round((crop.width / 100) * (naturalSize.width || 100))} × {Math.round((crop.height / 100) * (naturalSize.height || 100))} px
            </div>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetCrop}
            className="gap-1.5 text-xs font-semibold rounded-xl"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
            <span>{t("cropEditor.resetCrop") || "Reset Crop"}</span>
          </Button>

          {onRetake && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetake}
              className="gap-1.5 text-xs font-semibold rounded-xl"
            >
              <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
              <span>{t("cropEditor.retakeImage") || "Retake Image"}</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400"
            >
              {t("common.cancel") || "Cancel"}
            </Button>
          )}

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleConfirm}
            className="gap-1.5 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-sm px-4 py-2"
          >
            <Check className="h-4 w-4" />
            <span>{t("cropEditor.useSelectedArea") || "Use Selected Area"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
