import { clampBpm, signatures, type Signature } from "./tempo";
export interface Preferences {
  bpm: number;
  signature: Signature;
  volume: number;
  muted: boolean;
}
export const defaults: Preferences = {
  bpm: 100,
  signature: "4/4",
  volume: 0.7,
  muted: false,
};
const key = "symbol.preferences.v1";
export function validatePreferences(value: unknown): Preferences {
  if (!value || typeof value !== "object") return { ...defaults };
  const p = value as Record<string, unknown>;
  return {
    bpm:
      typeof p.bpm === "number" && Number.isFinite(p.bpm)
        ? clampBpm(p.bpm)
        : defaults.bpm,
    signature: signatures.includes(p.signature as Signature)
      ? (p.signature as Signature)
      : defaults.signature,
    volume:
      typeof p.volume === "number" && Number.isFinite(p.volume)
        ? Math.max(0, Math.min(1, p.volume))
        : defaults.volume,
    muted: typeof p.muted === "boolean" ? p.muted : defaults.muted,
  };
}
export function loadPreferences(): Preferences {
  try {
    return validatePreferences(JSON.parse(localStorage.getItem(key) ?? "null"));
  } catch {
    return { ...defaults };
  }
}
export function savePreferences(p: Preferences) {
  try {
    localStorage.setItem(key, JSON.stringify(p));
  } catch {
    /* Private browsing and full storage remain usable. */
  }
}
