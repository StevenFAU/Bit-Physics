// Edit events (00-foundation.md § 4.2): every user edit is an event with an
// id and the tick it was applied at, so it can be undone, replayed and
// shared. Payloads are plain JSON (numbers, strings, arrays).

export type Json = number | string | boolean | null | Json[] | { [k: string]: Json };

export interface SimEvent<P extends Json = Json> {
  id: number;
  tick: number;
  kind: string;
  payload: P;
}

export class EventLog {
  private items: SimEvent[] = [];
  private nextId = 1;

  get length(): number {
    return this.items.length;
  }

  all(): readonly SimEvent[] {
    return this.items;
  }

  push(tick: number, kind: string, payload: Json): SimEvent {
    const e: SimEvent = { id: this.nextId++, tick, kind, payload };
    this.items.push(e);
    return e;
  }

  /** Events applied at tick ≥ `tick` (in order). */
  since(tick: number): SimEvent[] {
    return this.items.filter((e) => e.tick >= tick);
  }

  /** Keep only the first `n` events. */
  truncate(n: number): void {
    this.items = this.items.slice(0, n);
  }

  /** Remove one event by id (undo). */
  remove(id: number): SimEvent | null {
    const i = this.items.findIndex((e) => e.id === id);
    if (i < 0) return null;
    const [e] = this.items.splice(i, 1);
    return e ?? null;
  }

  clear(): void {
    this.items = [];
  }

  toJSON(): SimEvent[] {
    return this.items.slice();
  }

  load(events: readonly SimEvent[]): void {
    this.items = events.map((e) => ({ ...e }));
    this.nextId = this.items.reduce((m, e) => Math.max(m, e.id), 0) + 1;
  }
}
