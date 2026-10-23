// History (00-foundation.md § 4.3): save point / restore / A-B compare /
// undo, over sim-provided checkpoints (GPU buffer copies — no readback).
//
// Undo is "restore the checkpoint taken before the last edit, then replay the
// rest": History hands the sim the checkpoint and the undone event's id; the
// sim restores it and replays its event log forward without that event.

export interface Checkpointer<C> {
  capture(): C;
  restore(c: C): void;
  release(c: C): void;
}

export interface UndoEntry<C> {
  checkpoint: C;
  /** The edit this checkpoint precedes. */
  eventId: number;
  tick: number;
}

export class History<C> {
  private save: C | null = null;
  private saveTick = 0;
  private undo: UndoEntry<C>[] = [];
  /** A/B compare is showing the save point next to the live state. */
  comparing = false;
  onChange: (() => void) | null = null;

  constructor(
    private readonly cp: Checkpointer<C>,
    readonly undoDepth = 6,
  ) {}

  get hasSave(): boolean {
    return this.save !== null;
  }

  get savedTick(): number {
    return this.saveTick;
  }

  get savePoint(): C | null {
    return this.save;
  }

  get canUndo(): boolean {
    return this.undo.length > 0;
  }

  /** Capture a save point (replacing any previous one). */
  savePointNow(tick: number): void {
    if (this.save) this.cp.release(this.save);
    this.save = this.cp.capture();
    this.saveTick = tick;
    this.onChange?.();
  }

  /** Restore the save point (kept, so it can be restored again). */
  restoreSave(): boolean {
    if (!this.save) return false;
    this.comparing = false;
    this.cp.restore(this.save);
    // edits after the save point can no longer be undone into this timeline
    this.dropUndo();
    this.onChange?.();
    return true;
  }

  /** Take an undo checkpoint just before applying edit `eventId`. */
  beforeEdit(eventId: number, tick: number): void {
    this.undo.push({ checkpoint: this.cp.capture(), eventId, tick });
    while (this.undo.length > this.undoDepth) {
      const old = this.undo.shift()!;
      this.cp.release(old.checkpoint);
    }
    this.onChange?.();
  }

  /** Pop the latest undo entry; the caller restores + replays, then calls `release`. */
  popUndo(): UndoEntry<C> | null {
    const e = this.undo.pop() ?? null;
    this.onChange?.();
    return e;
  }

  release(c: C): void {
    this.cp.release(c);
  }

  private dropUndo(): void {
    for (const u of this.undo) this.cp.release(u.checkpoint);
    this.undo = [];
  }

  /** Forget everything (scene restart). */
  clear(): void {
    this.dropUndo();
    if (this.save) this.cp.release(this.save);
    this.save = null;
    this.comparing = false;
    this.onChange?.();
  }
}
