import { describe, expect, it } from "vitest";
import { SimClock } from "./clock.js";

describe("SimClock", () => {
  it("accrues whole ticks from real time × speed", () => {
    const c = new SimClock(240, 32);
    const frames = Array.from({ length: 60 }, () => c.due(1 / 60));
    expect(frames.reduce((a, b) => a + b, 0)).toBe(240);
    c.speed = 0.25;
    const slow = Array.from({ length: 60 }, () => c.due(1 / 60));
    expect(slow.reduce((a, b) => a + b, 0)).toBe(60);
  });

  it("caps a frame and drops a backlog instead of snowballing", () => {
    const c = new SimClock(240, 8);
    expect(c.due(0.1)).toBe(8);
    expect(c.due(0.1)).toBe(8);
  });

  it("runs only requested steps while paused", () => {
    const c = new SimClock(240, 32);
    c.paused = true;
    expect(c.due(1)).toBe(0);
    c.stepOnce();
    c.stepOnce();
    expect(c.due(1 / 60)).toBe(2);
    expect(c.due(1 / 60)).toBe(0);
  });
});
