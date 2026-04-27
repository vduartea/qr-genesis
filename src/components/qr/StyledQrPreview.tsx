import { useEffect, useImperativeHandle, useMemo, useRef, forwardRef } from "react";
import QRCodeStyling from "qr-code-styling";
import {
  patternToDotsType,
  shapeToDotsType,
  type QrDesign,
} from "@/lib/qrDesign";

export interface StyledQrPreviewHandle {
  /** Trigger a PNG download with the given filename (no extension). */
  download: (filename: string) => Promise<void>;
}

interface StyledQrPreviewProps {
  value: string;
  design: QrDesign;
  size?: number;
  /** Optional className for the outer wrapper (frame is rendered separately). */
  className?: string;
}

/**
 * Renders a styled QR code (colors, module shape, pattern variant) using
 * qr-code-styling, wrapped with an optional decorative frame.
 * Exposes an imperative `download(filename)` so parents can save a PNG.
 */
export const StyledQrPreview = forwardRef<StyledQrPreviewHandle, StyledQrPreviewProps>(
  function StyledQrPreview({ value, design, size = 256, className }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const qrRef = useRef<QRCodeStyling | null>(null);

    // Resolve dot type from shape + pattern.
    const dotsType = useMemo(() => {
      const base = shapeToDotsType(design.shape);
      return patternToDotsType(design.pattern, base);
    }, [design.shape, design.pattern]);

    // Initialize once; subsequent updates use .update().
    useEffect(() => {
      if (!containerRef.current) return;
      if (!qrRef.current) {
        qrRef.current = new QRCodeStyling({
          width: size,
          height: size,
          type: "canvas",
          data: value || " ",
          margin: 8,
          qrOptions: { errorCorrectionLevel: "M" },
          dotsOptions: { color: design.fgColor, type: dotsType },
          backgroundOptions: { color: design.bgColor },
          cornersSquareOptions: {
            color: design.fgColor,
            type: design.shape === "circle" ? "dot" : design.shape === "smooth" ? "extra-rounded" : "square",
          },
          cornersDotOptions: {
            color: design.fgColor,
            type: design.shape === "circle" ? "dot" : "square",
          },
        });
        // Clear any prior canvas and append.
        containerRef.current.innerHTML = "";
        qrRef.current.append(containerRef.current);
      }
    }, [size, value, design.fgColor, design.bgColor, design.shape, dotsType]);

    // React to design / value changes.
    useEffect(() => {
      if (!qrRef.current) return;
      qrRef.current.update({
        width: size,
        height: size,
        data: value || " ",
        dotsOptions: { color: design.fgColor, type: dotsType },
        backgroundOptions: { color: design.bgColor },
        cornersSquareOptions: {
          color: design.fgColor,
          type:
            design.shape === "circle"
              ? "dot"
              : design.shape === "smooth"
                ? "extra-rounded"
                : "square",
        },
        cornersDotOptions: {
          color: design.fgColor,
          type: design.shape === "circle" ? "dot" : "square",
        },
      });
    }, [value, size, design.fgColor, design.bgColor, design.shape, dotsType]);

    useImperativeHandle(
      ref,
      () => ({
        download: async (filename: string) => {
          if (!qrRef.current) return;
          // qr-code-styling exposes a built-in download to PNG.
          await qrRef.current.download({ name: filename, extension: "png" });
        },
      }),
      [],
    );

    // Frame styles (purely visual wrapper around the QR canvas).
    const frameClass =
      design.frame === "simple"
        ? "border-2 border-foreground rounded-md p-3"
        : design.frame === "rounded"
          ? "border-2 border-foreground rounded-2xl p-3"
          : design.frame === "label"
            ? "border-2 border-foreground rounded-2xl p-3 pb-0 overflow-hidden"
            : "";

    return (
      <div
        className={`inline-flex flex-col items-center ${frameClass} ${className ?? ""}`}
        style={{ background: design.bgColor }}
      >
        <div ref={containerRef} />
        {design.frame === "label" && (
          <div
            className="mt-3 -mx-3 px-3 py-2 text-center text-xs font-bold tracking-widest"
            style={{ background: design.fgColor, color: design.bgColor, width: "calc(100% + 1.5rem)" }}
          >
            {design.frameLabel || "ESCANÉAME"}
          </div>
        )}
      </div>
    );
  },
);