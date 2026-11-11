import { expect, it } from "vitest";
import { Timeline } from "./Timeline";
it("advances from audio deadlines without wall-clock drift", () => {
  const timeline = new Timeline(120, "4/4");
  timeline.reset(0.04);
  const beats = Array.from({ length: 1000 }, () => timeline.take());
  expect(beats[999].time).toBeCloseTo(499.54, 8);
  expect(beats.slice(0, 5).map((b) => b.index)).toEqual([0, 1, 2, 3, 0]);
});
it("anchors a new tempo to the last audible beat and starts a new meter on next pulse", () => {
  const timeline = new Timeline(60, "4/4");
  timeline.reset(0.04);
  const beat = timeline.take();
  timeline.reconfigure(120, "4/4", 0.2, beat);
  expect(timeline.take()).toEqual({ time: 0.54, index: 1 });
  timeline.reconfigure(120, "6/8", 0.6, { time: 0.54, index: 1 });
  expect(timeline.take()).toEqual({ time: 1.04, index: 0 });
});
it("keeps an accelerated next beat safely in the future", () => {
  const timeline = new Timeline(40, "4/4");
  timeline.reconfigure(240, "4/4", 1, { time: 0, index: 0 });
  expect(timeline.take().time).toBeCloseTo(1.015);
});
