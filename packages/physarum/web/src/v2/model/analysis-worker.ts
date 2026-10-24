// Scoring off the main thread: extracting and measuring a 2-million-agent
// dish takes ~100 ms of CPU, which would drop frames if it ran in the page.
import { analyse } from "./analysis.js";

type Args = Parameters<typeof analyse>;

self.onmessage = (e: MessageEvent<{ id: number; args: Args }>) => {
  const { id, args } = e.data;
  try {
    const r = analyse(...args);
    (self as unknown as Worker).postMessage({ id, r });
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, error: (err as Error).message });
  }
};
