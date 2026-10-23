import { describe, expect, it } from "vitest";
import { History } from "./history.js";
import type { Checkpointer } from "./history.js";

/** A toy "simulation": one number; checkpoints are copies. */
function harness() {
  const sim = { value: 0 };
  const live = new Set<object>();
  const cp: Checkpointer<{ v: number }> = {
    capture: () => {
      const c = { v: sim.value };
      live.add(c);
      return c;
    },
    restore: (c) => {
      sim.value = c.v;
    },
    release: (c) => {
      live.delete(c);
    },
  };
  return { sim, live, history: new History(cp, 3) };
}

describe("History", () => {
  it("save point / restore", () => {
    const { sim, history } = harness();
    sim.value = 5;
    history.savePointNow(10);
    sim.value = 9;
    expect(history.restoreSave()).toBe(true);
    expect(sim.value).toBe(5);
    sim.value = 1;
    history.restoreSave();
    expect(sim.value).toBe(5); // a save point can be restored again
  });

  it("undo hands back the checkpoint before the edit, bounded depth, no leaks", () => {
    const { sim, live, history } = harness();
    for (let i = 1; i <= 5; i += 1) {
      history.beforeEdit(i, i);
      sim.value = i;
    }
    expect(live.size).toBe(3);
    const e = history.popUndo()!;
    expect(e.eventId).toBe(5);
    expect(e.checkpoint.v).toBe(4);
    history.release(e.checkpoint);
    history.clear();
    expect(live.size).toBe(0);
    expect(history.canUndo).toBe(false);
  });
});
