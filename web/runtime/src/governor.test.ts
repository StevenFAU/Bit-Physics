import { describe, expect, it } from "vitest";
import { QualityGovernor } from "./governor.js";

const feed = (g: QualityGovernor, ms: number, seconds: number, t0: number): number => {
  let t = t0;
  for (let i = 0; i < seconds * 60; i += 1) {
    t += 1000 / 60;
    g.sample(ms, t);
  }
  return t;
};

describe("QualityGovernor", () => {
  it("holds full quality inside the budget", () => {
    const g = new QualityGovernor({ budgetMs: 14 });
    feed(g, 9, 10, 0);
    expect(g.status().degraded).toBe(false);
    expect(g.renderScale).toBe(1);
  });

  it("steps render scale first, then effects, then flags a size step-down", () => {
    const g = new QualityGovernor({ budgetMs: 14, scales: [1, 0.7], effectLevels: 1 });
    let t = feed(g, 30, 2.5, 0);
    expect(g.renderScale).toBe(0.7);
    t = feed(g, 30, 4.5, t);
    expect(g.effects).toBe(0);
    feed(g, 30, 4.5, t);
    expect(g.simStepDownPending).toBe(true);
    expect(g.status().message).toMatch(/render scale 70%/);
    g.acknowledgeRestart();
    expect(g.simStepDownPending).toBe(false);
  });

  it("never steps while suspended (Prove runs)", () => {
    const g = new QualityGovernor({ budgetMs: 14 });
    g.suspended = true;
    feed(g, 40, 10, 0);
    expect(g.status().degraded).toBe(false);
  });
});
