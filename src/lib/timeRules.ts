/**
 * Time-based redirect rules for QR codes.
 *
 * Each rule defines a window [start, end) on a 24h clock (HH:mm).
 * If the current server time falls inside one of the active rules,
 * the QR redirects to that rule's URL instead of `destination_url`.
 *
 * Kept intentionally simple for Stage 12:
 *   - no day-of-week
 *   - no timezone selection (server time)
 *   - no recurrence rules
 */

export type TimeRule = {
  start: string; // "HH:mm" (00:00 – 23:59)
  end: string; // "HH:mm" (00:00 – 23:59)
  url: string;
};

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidHHMM(value: string): boolean {
  return HHMM.test(value);
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Convert "HH:mm" → minutes since midnight. */
export function hhmmToMinutes(value: string): number {
  const [h, m] = value.split(":").map((n) => Number.parseInt(n, 10));
  return h * 60 + m;
}

/**
 * Parse the raw `time_rules` JSON column (unknown shape from the DB)
 * into a clean `TimeRule[]`. Invalid entries are dropped silently so a
 * malformed row never breaks the redirect endpoint.
 */
export function parseTimeRules(raw: unknown): TimeRule[] {
  if (!Array.isArray(raw)) return [];
  const out: TimeRule[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const start = typeof obj.start === "string" ? obj.start : "";
    const end = typeof obj.end === "string" ? obj.end : "";
    const url = typeof obj.url === "string" ? obj.url : "";
    if (!isValidHHMM(start) || !isValidHHMM(end) || !isValidHttpUrl(url)) continue;
    out.push({ start, end, url });
  }
  return out;
}

export type TimeRuleValidationError = {
  index: number;
  field: "start" | "end" | "url" | "range";
  message: string;
};

/**
 * Validate an editor draft. Returns a list of errors — empty when the
 * full set is valid. Does NOT enforce non-overlap (kept simple per spec).
 */
export function validateTimeRules(rules: TimeRule[]): TimeRuleValidationError[] {
  const errors: TimeRuleValidationError[] = [];
  rules.forEach((rule, index) => {
    if (!isValidHHMM(rule.start)) {
      errors.push({ index, field: "start", message: "Hora de inicio inválida" });
    }
    if (!isValidHHMM(rule.end)) {
      errors.push({ index, field: "end", message: "Hora de fin inválida" });
    }
    if (!rule.url.trim()) {
      errors.push({ index, field: "url", message: "URL obligatoria" });
    } else if (!isValidHttpUrl(rule.url.trim())) {
      errors.push({ index, field: "url", message: "URL inválida (http:// o https://)" });
    }
    if (
      isValidHHMM(rule.start) &&
      isValidHHMM(rule.end) &&
      hhmmToMinutes(rule.start) === hhmmToMinutes(rule.end)
    ) {
      errors.push({
        index,
        field: "range",
        message: "El inicio y el fin no pueden ser iguales",
      });
    }
  });
  return errors;
}

/**
 * Evaluate the rules against a given Date (server time). Returns the
 * URL of the first matching rule, or `null` if none match.
 *
 * Window semantics:
 *   - [start, end) when start < end (same-day window)
 *   - [start, 24:00) ∪ [00:00, end) when start > end (wraps midnight)
 *   - empty when start === end (filtered out by validation)
 */
export function findActiveRuleUrl(
  rules: TimeRule[],
  now: Date = new Date(),
): string | null {
  if (rules.length === 0) return null;
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  for (const rule of rules) {
    if (!isValidHHMM(rule.start) || !isValidHHMM(rule.end)) continue;
    const start = hhmmToMinutes(rule.start);
    const end = hhmmToMinutes(rule.end);
    if (start === end) continue;
    const inWindow =
      start < end
        ? minutesNow >= start && minutesNow < end
        : minutesNow >= start || minutesNow < end;
    if (inWindow) return rule.url;
  }
  return null;
}