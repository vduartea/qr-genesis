/**
 * QR design configuration: visual customization persisted alongside each QR.
 * Backed by the `design` jsonb column on `qr_codes`.
 */

export type QrFrame = "none" | "simple" | "rounded" | "label";
export type QrShape = "square" | "circle" | "smooth";
export type QrPattern = "classic" | "dots" | "lines";

export interface QrDesign {
  fgColor: string;
  bgColor: string;
  frame: QrFrame;
  shape: QrShape;
  pattern: QrPattern;
  frameLabel: string;
}

export const DEFAULT_QR_DESIGN: QrDesign = {
  fgColor: "#0F172A",
  bgColor: "#FFFFFF",
  frame: "none",
  shape: "square",
  pattern: "classic",
  frameLabel: "ESCANÉAME",
};

const FRAMES: ReadonlySet<QrFrame> = new Set(["none", "simple", "rounded", "label"]);
const SHAPES: ReadonlySet<QrShape> = new Set(["square", "circle", "smooth"]);
const PATTERNS: ReadonlySet<QrPattern> = new Set(["classic", "dots", "lines"]);

function isHexColor(v: unknown): v is string {
  return typeof v === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
}

/**
 * Parse a JSON value (from DB) into a fully populated QrDesign,
 * falling back to defaults for missing/invalid fields.
 */
export function parseQrDesign(raw: unknown): QrDesign {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_QR_DESIGN };
  const r = raw as Record<string, unknown>;
  return {
    fgColor: isHexColor(r.fgColor) ? r.fgColor : DEFAULT_QR_DESIGN.fgColor,
    bgColor: isHexColor(r.bgColor) ? r.bgColor : DEFAULT_QR_DESIGN.bgColor,
    frame: typeof r.frame === "string" && FRAMES.has(r.frame as QrFrame)
      ? (r.frame as QrFrame)
      : DEFAULT_QR_DESIGN.frame,
    shape: typeof r.shape === "string" && SHAPES.has(r.shape as QrShape)
      ? (r.shape as QrShape)
      : DEFAULT_QR_DESIGN.shape,
    pattern: typeof r.pattern === "string" && PATTERNS.has(r.pattern as QrPattern)
      ? (r.pattern as QrPattern)
      : DEFAULT_QR_DESIGN.pattern,
    frameLabel: typeof r.frameLabel === "string"
      ? r.frameLabel.slice(0, 24)
      : DEFAULT_QR_DESIGN.frameLabel,
  };
}

/** Map design.shape → qr-code-styling dotsOptions.type. */
export function shapeToDotsType(shape: QrShape): "square" | "rounded" | "dots" {
  switch (shape) {
    case "circle":
      return "dots";
    case "smooth":
      return "rounded";
    case "square":
    default:
      return "square";
  }
}

/** Map design.pattern → qr-code-styling dotsOptions.type override. */
export function patternToDotsType(
  pattern: QrPattern,
  fallback: "square" | "rounded" | "dots",
): "square" | "rounded" | "dots" | "classy" | "classy-rounded" | "extra-rounded" {
  switch (pattern) {
    case "dots":
      return "dots";
    case "lines":
      return "classy";
    case "classic":
    default:
      return fallback;
  }
}