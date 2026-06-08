# binary-release signing hooks (no-op stubs)

Phase 5 sub-phase 5.2 — code-signing posture per phase plan § 4.3.

**Phase 5 ships UNSIGNED binaries.** These are no-op stubs marking the wiring
points for a future go-live signing pass. Nothing here runs in Phase 5 (the
`deploy` job is gated off; build-and-validate only).

| Platform | Phase-5 posture | Go-live hook |
|---|---|---|
| Linux (AppImage) | unsigned | optional GPG-detached `.sig` next to the AppImage |
| macOS (.app) | **unsigned** | `codesign` + notarization once an Apple Developer cert exists |
| Windows (zip) | unsigned | Authenticode `signtool` once a cert exists |

## macOS unsigned-binary runbook (§ 4.3)

An unsigned macOS binary is quarantined by Gatekeeper on download. The documented
end-user workaround (also in `docs/productization/binary-release.md` § go-live):

```sh
xattr -d com.apple.quarantine bit_physics_<sim>_capture
```

`sign.sh` is intentionally a no-op in Phase 5: it echoes the unsigned posture and
exits 0 so the (gated) packaging pipeline has a stable call site.
