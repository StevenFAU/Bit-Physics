export const MAX_STEP_EVENTS = 32;
export const EVENT_LEDGER_SCALE = 65_536;

export type BrushEventKind = "add" | "erase" | "pipette" | "stir";

export interface BrushEventInput {
  kind: BrushEventKind;
  x: number;
  y: number;
  radius: number;
  strength: number;
  channel: number;
  directionX?: number;
  directionY?: number;
  polarity?: number;
  atStep?: number;
}

export interface ScheduledBrushEvent extends Required<BrushEventInput> {
  id: number;
  atStep: number;
}

const EVENT_KIND: Record<BrushEventKind, number> = { add: 1, erase: 2, pipette: 3, stir: 4 };

/** Pack the fixed 48-byte WGSL event record without relying on JS object layout. */
export function packBrushEvents(events: readonly ScheduledBrushEvent[]): ArrayBuffer {
  if (events.length > MAX_STEP_EVENTS) throw new Error(`at most ${MAX_STEP_EVENTS} events may share one step boundary`);
  const raw = new ArrayBuffer(MAX_STEP_EVENTS * 48);
  const u32 = new Uint32Array(raw);
  const f32 = new Float32Array(raw);
  events.forEach((event, index) => {
    const word = index * 12;
    u32[word] = EVENT_KIND[event.kind];
    u32[word + 1] = Math.max(0, Math.min(3, event.channel | 0));
    f32[word + 4] = event.x;
    f32[word + 5] = event.y;
    f32[word + 6] = Math.max(1, event.radius);
    f32[word + 7] = Math.max(0, event.strength);
    f32[word + 8] = event.directionX;
    f32[word + 9] = event.directionY;
    f32[word + 10] = event.polarity;
  });
  return raw;
}
