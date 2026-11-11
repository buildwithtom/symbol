import { describe, expect, it } from "vitest";
import {
  accentFor,
  beatsPerBar,
  clampBpm,
  secondsPerBeat,
  tapTempo,
} from "./tempo";
import { validatePreferences } from "./preferences";
describe("tempo and meter", () => {
  it("clamps and rounds safely", () => {
    expect([
      clampBpm(2),
      clampBpm(999),
      clampBpm(120.7),
      clampBpm(NaN),
    ]).toEqual([40, 240, 121, 100]);
  });
  it("uses audible pulses at 60 and 120 BPM", () => {
    expect(secondsPerBeat(60)).toBe(1);
    expect(secondsPerBeat(120)).toBe(0.5);
    expect(beatsPerBar("6/8")).toBe(6);
  });
  it("accents the first beat and pulse four in 6/8", () => {
    expect(Array.from({ length: 6 }, (_, i) => accentFor(i, "6/8"))).toEqual([
      "strong",
      "regular",
      "regular",
      "secondary",
      "regular",
      "regular",
    ]);
    expect(accentFor(3, "4/4")).toBe("regular");
  });
});
describe("tap tempo", () => {
  it("averages a steady 120 BPM and keeps a bounded window", () => {
    let history: number[] = [];
    let bpm: number | null = null;
    for (let i = 0; i < 12; i++)
      ({ history, bpm } = tapTempo(history, i * 500));
    expect(bpm).toBe(120);
    expect(history).toHaveLength(6);
  });
  it("averages intervals rather than individual tempos", () => {
    expect(tapTempo([0, 400], 1000).bpm).toBe(120);
  });
  it("resets stale history, ignores accidental fast taps, clamps", () => {
    expect(tapTempo([0], 2500)).toEqual({ history: [2500], bpm: null });
    expect(tapTempo([500], 550)).toEqual({ history: [500], bpm: null });
    expect(tapTempo([0], 210).bpm).toBe(240);
    expect(tapTempo([0], 1800).bpm).toBe(40);
  });
});
it("validates persisted preferences without trusting saved data", () => {
  expect(
    validatePreferences({
      bpm: Infinity,
      signature: "9/4",
      volume: -5,
      muted: "yes",
    }),
  ).toEqual({ bpm: 100, signature: "4/4", volume: 0, muted: false });
  expect(validatePreferences(null).bpm).toBe(100);
});
