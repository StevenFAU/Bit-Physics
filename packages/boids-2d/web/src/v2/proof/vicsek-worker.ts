// A worker for the φ(η) check (./vicsek-check.ts): runs the f64 Vicsek
// reference off the main thread, so the ocean keeps moving while it works.

import type { VicsekRun } from "../model/vicsek-cpu.js";
import { runVicsekCpu } from "../model/vicsek-cpu.js";

interface Job {
  id: number;
  run: VicsekRun;
}

const scope = self as unknown as { onmessage: ((e: MessageEvent<Job>) => void) | null; postMessage(m: unknown, transfer: Transferable[]): void };
scope.onmessage = (e) => {
  const phi = runVicsekCpu(e.data.run);
  scope.postMessage({ id: e.data.id, phi }, [phi.buffer]);
};
