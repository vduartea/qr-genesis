// Lightweight session-storage helpers to preserve QR progress across auth gate.

const QR_KEY = "quark:pendingQr";
const ACTION_KEY = "quark:pendingAction";

export type PendingAction = "save" | "download" | null;

export interface PendingQrState {
  value: string;
  fgColor: string;
  bgColor: string;
  size: number;
}

export function savePendingQr(state: PendingQrState) {
  try {
    sessionStorage.setItem(QR_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function loadPendingQr(): PendingQrState | null {
  try {
    const raw = sessionStorage.getItem(QR_KEY);
    return raw ? (JSON.parse(raw) as PendingQrState) : null;
  } catch {
    return null;
  }
}

export function clearPendingQr() {
  try {
    sessionStorage.removeItem(QR_KEY);
  } catch {
    /* ignore */
  }
}

export function setPendingAction(action: PendingAction) {
  try {
    if (action) sessionStorage.setItem(ACTION_KEY, action);
    else sessionStorage.removeItem(ACTION_KEY);
  } catch {
    /* ignore */
  }
}

export function getPendingAction(): PendingAction {
  try {
    const v = sessionStorage.getItem(ACTION_KEY);
    return v === "save" || v === "download" ? v : null;
  } catch {
    return null;
  }
}

export function clearPendingAction() {
  setPendingAction(null);
}
