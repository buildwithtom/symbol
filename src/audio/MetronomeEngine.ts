import { accentFor } from "../utils/tempo";
import type { Preferences } from "../utils/preferences";
import { Timeline, type Beat } from "./Timeline";
interface Voice {
  oscillator: OscillatorNode;
  gain: GainNode;
  time: number;
}
export class MetronomeEngine {
  private context: AudioContext | null = null;
  private output: GainNode | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private frame = 0;
  private generation = 0;
  private voices = new Set<Voice>();
  private queue: Beat[] = [];
  private lastAudible: Beat | null = null;
  private timeline: Timeline;
  private active = false;
  private disposed = false;
  constructor(
    private preferences: Preferences,
    private onBeat: (beat: number) => void,
    private onInterrupted: () => void,
  ) {
    this.timeline = new Timeline(preferences.bpm, preferences.signature);
  }
  async start() {
    const generation = ++this.generation;
    if (this.disposed) return false;
    if (!this.context) {
      if (typeof AudioContext === "undefined") {
        throw new Error(
          "This browser does not support Web Audio. Try a current version of Chrome, Firefox, or Safari.",
        );
      }
      this.context = new AudioContext({ latencyHint: "interactive" });
      this.output = this.context.createGain();
      this.output.connect(this.context.destination);
      this.output.gain.value = this.preferences.muted
        ? 0
        : this.preferences.volume;
      this.context.onstatechange = () => {
        if (this.active && this.context?.state !== "running") {
          this.stop();
          this.onInterrupted();
        }
      };
    }
    await this.context.resume();
    if (this.disposed || generation !== this.generation) return false;
    if (this.context.state !== "running")
      throw new Error(
        "Audio is unavailable. Try Start again, or check your browser’s audio permissions.",
      );
    this.clearScheduling();
    this.active = true;
    this.lastAudible = null;
    this.timeline = new Timeline(
      this.preferences.bpm,
      this.preferences.signature,
    );
    this.timeline.reset(this.context.currentTime + 0.04);
    this.schedule();
    this.draw();
    return true;
  }
  update(preferences: Preferences) {
    const timingChanged =
      preferences.bpm !== this.preferences.bpm ||
      preferences.signature !== this.preferences.signature;
    this.preferences = preferences;
    if (this.output && this.context)
      this.output.gain.setTargetAtTime(
        preferences.muted ? 0 : preferences.volume,
        this.context.currentTime,
        0.008,
      );
    if (!this.active || !this.context || !timingChanged) return;
    const now = this.context.currentTime;
    this.consumeBeats(now);
    this.cancelVoices(true);
    this.queue = [];
    this.timeline.reconfigure(
      preferences.bpm,
      preferences.signature,
      now,
      this.lastAudible,
    );
  }
  private schedule = () => {
    if (!this.active || !this.context) return;
    const now = this.context.currentTime;
    // A delayed main thread must never produce a burst of overdue clicks.
    if (this.timeline.nextTime < now - 0.1) {
      this.stop();
      this.onInterrupted();
      return;
    }
    while (this.timeline.nextTime < now + 0.1) {
      const beat = this.timeline.take();
      this.queue.push(beat);
      this.click(beat);
    }
    this.timer = setTimeout(this.schedule, 25);
  };
  private click(beat: Beat) {
    const context = this.context!;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const accent = accentFor(beat.index, this.preferences.signature);
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(
      accent === "strong" ? 1500 : accent === "secondary" ? 1150 : 850,
      beat.time,
    );
    gain.gain.setValueAtTime(0, beat.time);
    gain.gain.linearRampToValueAtTime(
      accent === "strong" ? 0.48 : 0.32,
      beat.time + 0.002,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, beat.time + 0.035);
    oscillator.connect(gain);
    gain.connect(this.output!);
    const voice = { oscillator, gain, time: beat.time };
    this.voices.add(voice);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      this.voices.delete(voice);
    };
    oscillator.start(beat.time);
    oscillator.stop(beat.time + 0.04);
  }
  private consumeBeats(now: number) {
    let latest: Beat | undefined;
    while (this.queue.length && this.queue[0].time <= now)
      latest = this.queue.shift();
    if (latest) {
      this.lastAudible = latest;
      this.onBeat(latest.index);
    }
  }
  private draw = () => {
    if (!this.active || !this.context) return;
    this.consumeBeats(this.context.currentTime);
    this.frame = requestAnimationFrame(this.draw);
  };
  private cancelVoices(futureOnly = false) {
    const now = this.context?.currentTime ?? 0;
    for (const voice of this.voices) {
      if (futureOnly && voice.time <= now) continue;
      if (voice.time > now) {
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setValueAtTime(0, now);
        voice.oscillator.stop(now);
      } else {
        voice.gain.gain.cancelAndHoldAtTime(now);
        voice.gain.gain.linearRampToValueAtTime(0, now + 0.008);
        voice.oscillator.stop(now + 0.01);
      }
    }
  }
  private clearScheduling() {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    cancelAnimationFrame(this.frame);
    this.queue = [];
    this.cancelVoices();
  }
  stop() {
    ++this.generation;
    this.active = false;
    this.clearScheduling();
    this.lastAudible = null;
  }
  dispose() {
    this.disposed = true;
    this.stop();
    if (this.context) {
      this.context.onstatechange = null;
      void this.context.close().catch(() => {});
    }
    this.context = null;
    this.output = null;
  }
}
