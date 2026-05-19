// IndexedDB surface — Phase 0 verifies the schema-version policy.
// Full browser-side roundtrip lands when a sim consumes the store
// (Phase 1+); a fake-indexeddb roundtrip is intentionally deferred to
// keep Phase 0's dependency surface small.

import { describe, expect, it } from "vitest";

import { CaptureStore, INDEXEDDB_SCHEMA_VERSION } from "../indexeddb.js";

describe("CaptureStore", () => {
  it("rejects a request for a higher schema version than the build supports", async () => {
    await expect(
      CaptureStore.open({ schemaVersion: INDEXEDDB_SCHEMA_VERSION + 1 }),
    ).rejects.toThrow(/schema_version=/);
  });

  it("rejects when indexedDB is unavailable (no shim installed)", async () => {
    const before = (globalThis as { indexedDB?: unknown }).indexedDB;
    try {
      (globalThis as { indexedDB?: unknown }).indexedDB = undefined;
      await expect(CaptureStore.open()).rejects.toThrow(/indexedDB is not available/);
    } finally {
      (globalThis as { indexedDB?: unknown }).indexedDB = before;
    }
  });

  it("pins INDEXEDDB_SCHEMA_VERSION at 1", () => {
    expect(INDEXEDDB_SCHEMA_VERSION).toBe(1);
  });
});
