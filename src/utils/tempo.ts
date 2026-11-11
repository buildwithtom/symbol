export const MIN_BPM = 40;
export const MAX_BPM = 240;
export const signatures = ["2/4", "3/4", "4/4", "6/8"] as const;
export type Signature = (typeof signatures)[number];
export const clampBpm = (value: number) =>
  Number.isFinite(value)
    ? Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value)))
    : 100;
export const secondsPerBeat = (bpm: number) => 60 / clampBpm(bpm);
export const beatsPerBar = (signature: Signature) => Number(signature[0]);
export const accentFor = (
  beat: number,
  signature: Signature,
): "strong" | "secondary" | "regular" =>
  beat === 0
    ? "strong"
    : signature === "6/8" && beat === 3
      ? "secondary"
      : "regular";
export const tempoName = (bpm: number) =>
  bpm < 60
    ? "Largo"
    : bpm < 76
      ? "Adagio"
      : bpm < 108
        ? "Andante"
        : bpm < 120
          ? "Moderato"
          : bpm < 168
            ? "Allegro"
            : bpm < 200
              ? "Vivace"
              : "Presto";
export function tapTempo(
  history: number[],
  now: number,
): { history: number[]; bpm: number | null } {
  const last = history.at(-1);
  if (last === undefined || now - last > 2000 || now <= last)
    return { history: [now], bpm: null };
  if (now - last < 200) return { history, bpm: null };
  const next = [...history, now].slice(-6);
  const intervals = next.slice(1).map((t, i) => t - next[i]);
  return {
    history: next,
    bpm: clampBpm(
      60000 / (intervals.reduce((a, b) => a + b, 0) / intervals.length),
    ),
  };
}
