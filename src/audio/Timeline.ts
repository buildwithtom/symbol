import { beatsPerBar, secondsPerBeat, type Signature } from "../utils/tempo";
export interface Beat {
  time: number;
  index: number;
}
/** Pure audio-clock timeline. All advances derive from the previous deadline. */
export class Timeline {
  nextTime = 0;
  nextIndex = 0;
  constructor(
    public bpm: number,
    public signature: Signature,
  ) {}
  reset(time: number) {
    this.nextTime = time;
    this.nextIndex = 0;
  }
  take(): Beat {
    const beat = { time: this.nextTime, index: this.nextIndex };
    this.nextTime += secondsPerBeat(this.bpm);
    this.nextIndex = (this.nextIndex + 1) % beatsPerBar(this.signature);
    return beat;
  }
  reconfigure(
    bpm: number,
    signature: Signature,
    now: number,
    lastAudible: Beat | null,
  ) {
    const changedMeter = signature !== this.signature;
    this.bpm = bpm;
    this.signature = signature;
    // Retain the last audible beat as the phase anchor. Future lookahead is discarded.
    this.nextTime = lastAudible
      ? Math.max(now + 0.015, lastAudible.time + secondsPerBeat(bpm))
      : now + 0.015;
    this.nextIndex =
      changedMeter || !lastAudible
        ? 0
        : (lastAudible.index + 1) % beatsPerBar(signature);
  }
}
