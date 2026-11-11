import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MetronomeEngine } from "./MetronomeEngine";
import { defaults } from "../utils/preferences";
class Param {
  value = 0;
  setValueAtTime = vi.fn<(value: number, time: number) => void>();
  linearRampToValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
  setTargetAtTime = vi.fn();
  cancelScheduledValues = vi.fn();
  cancelAndHoldAtTime = vi.fn();
}
class Gain {
  gain = new Param();
  connect = vi.fn();
  disconnect = vi.fn();
}
class Oscillator {
  frequency = new Param();
  type = "sine";
  onended: (() => void) | null = null;
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn<(time: number) => void>();
  stop = vi.fn();
}
class FakeContext {
  static instances: FakeContext[] = [];
  currentTime = 0;
  state = "running";
  destination = {};
  onstatechange: (() => void) | null = null;
  oscillators: Oscillator[] = [];
  constructor() {
    FakeContext.instances.push(this);
  }
  createGain() {
    return new Gain();
  }
  createOscillator() {
    const node = new Oscillator();
    this.oscillators.push(node);
    return node;
  }
  resume = vi.fn(async () => {});
  close = vi.fn(async () => {
    this.state = "closed";
  });
}
beforeEach(() => {
  vi.useFakeTimers();
  FakeContext.instances = [];
  vi.stubGlobal("AudioContext", FakeContext);
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) =>
    setTimeout(callback, 16),
  );
  vi.stubGlobal("cancelAnimationFrame", (id: ReturnType<typeof setTimeout>) =>
    clearTimeout(id),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("audio-clock scheduler", () => {
  it("schedules ahead, waits to display, cancels future sound on Stop, and reuses its context", async () => {
    const onBeat = vi.fn();
    const engine = new MetronomeEngine(
      { ...defaults, bpm: 120 },
      onBeat,
      vi.fn(),
    );
    await engine.start();
    const context = FakeContext.instances[0];
    expect(context.oscillators[0].start).toHaveBeenCalledWith(0.04);
    expect(onBeat).not.toHaveBeenCalled();
    context.currentTime = 0.05;
    vi.advanceTimersByTime(16);
    expect(onBeat).toHaveBeenLastCalledWith(0);
    context.currentTime = 0.46;
    vi.advanceTimersByTime(25);
    const future = context.oscillators[1];
    expect(future.start).toHaveBeenCalledWith(0.54);
    engine.stop();
    expect(future.stop).toHaveBeenLastCalledWith(0.46);
    expect(vi.getTimerCount()).toBe(0);
    await engine.start();
    expect(FakeContext.instances).toHaveLength(1);
    engine.dispose();
    expect(context.close).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("cancels stale tempo lookahead and reschedules from the audible phase", async () => {
    const engine = new MetronomeEngine(
      { ...defaults, bpm: 120 },
      vi.fn(),
      vi.fn(),
    );
    await engine.start();
    const context = FakeContext.instances[0];
    context.currentTime = 0.46;
    vi.advanceTimersByTime(32);
    engine.update({ ...defaults, bpm: 60 });
    expect(context.oscillators[1].stop).toHaveBeenLastCalledWith(0.46);
    context.currentTime = 0.96;
    vi.advanceTimersByTime(25);
    expect(context.oscillators[2].start).toHaveBeenCalledWith(1.04);
    engine.dispose();
  });
  it("invalidates an in-flight Start if stopped before resume resolves", async () => {
    const engine = new MetronomeEngine(defaults, vi.fn(), vi.fn());
    const starting = engine.start();
    engine.stop();
    await starting;
    expect(FakeContext.instances[0].oscillators).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
    engine.dispose();
  });
  it("pauses rather than bursting after a stalled scheduler or suspended context", async () => {
    const interrupted = vi.fn();
    const engine = new MetronomeEngine(defaults, vi.fn(), interrupted);
    await engine.start();
    const context = FakeContext.instances[0];
    context.currentTime = 5;
    vi.advanceTimersByTime(25);
    expect(interrupted).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    await engine.start();
    context.state = "suspended";
    context.onstatechange?.();
    expect(interrupted).toHaveBeenCalledTimes(2);
    engine.dispose();
  });
});

it("starts with the current tempo and meter after editing while stopped", async () => {
  const engine = new MetronomeEngine(defaults, vi.fn(), vi.fn());
  await engine.start();
  engine.stop();
  engine.update({ ...defaults, bpm: 240, signature: "6/8" });
  const context = FakeContext.instances[0];
  const previousCount = context.oscillators.length;
  await engine.start();
  for (let i = 0; i < 6; i++) {
    context.currentTime = 0.2 + i * 0.25;
    vi.advanceTimersByTime(25);
  }
  const notes = context.oscillators.slice(previousCount, previousCount + 6);
  expect(
    notes.map((note) => note.frequency.setValueAtTime.mock.calls[0][0]),
  ).toEqual([1500, 850, 850, 1150, 850, 850]);
  expect(
    notes[1].start.mock.calls[0][0] - notes[0].start.mock.calls[0][0],
  ).toBeCloseTo(0.25);
  engine.dispose();
});
