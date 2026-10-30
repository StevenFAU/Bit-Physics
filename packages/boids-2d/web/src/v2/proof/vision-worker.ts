// A worker for Eyes Only's ordered-motion check (./m3-proofs.ts): runs the f64
// vision reference off the main thread, so the ocean keeps moving while it works.

import type { VisionRun } from "../model/vision-cpu.js";
import { runVisionCpu } from "../model/vision-cpu.js";

interface Job {
  id: number;
  run: VisionRun;
}

const scope = self as unknown as { onmessage: ((e: MessageEvent<Job>) => void) | null; postMessage(m: unknown, transfer: Transferable[]): void };
scope.onmessage = (e) => {
  const phi = runVisionCpu(e.data.run);
  scope.postMessage({ id: e.data.id, phi }, [phi.buffer]);
};
