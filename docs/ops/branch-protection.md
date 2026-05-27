# Branch-protection and server-side enforcement

Per `architecture.md` § 7.12. The repo's append-only / trunk-based /
operator-only-tag-pushing rules are enforced mechanically by GitHub branch
protection rules plus repo-side CI workflows. Phase 0 Block 1 ships this
document; the operator applies the rules at phase open and re-verifies
after every phase landing.

> **Live-state amendment (2026-05-27, sub-phase-phase-2-cleanup Stage 1.D / D2).**
> **No branch- or tag-protection rule is configured live.** `gh api
> repos/StevenFAU/Bit-Physics/branches/main/protection` → **404 "Branch not
> protected"**; `…/tags/protection` likewise returns nothing configured. Per the
> closing drift rule (§ "Operator verification checklist" below — "the synced
> GitHub state wins; the doc is amended via a separate commit"), this document is
> amended to record that **the rules in the sections below are the *designed*
> posture, NOT currently enforced server-side.**
>
> For the current **solo + single-agent** operating model the designed rules add
> little: the equivalent guarantees are delivered in practice by **Convention M**
> (re-anchor before edit), **Hard Rule 2** (STOP-and-surface), the **append-only
> audit chain**, the repo-side **CI workflows** (`audit-append-only.yml`,
> `integrity.yml`, …), and **I7** (operator-only tag pushing, enforced by the
> regression guard `tools/testkit/lfs_migration/test_i7_no_agent_tags.py`).
>
> **Forward-routing.** *"implement-live-branch-protection"* becomes a candidate
> sub-phase if/when the contributor model grows beyond solo + agent (multiple
> human contributors, untrusted forks, or CI bots with write scope) — at which
> point the designed rules below should be applied server-side and re-verified
> against the checklist.
>
> **M0 (mutation-testing re-tier required-check removal) — CONFIRMED NO-OP.** The
> operator action below ("drop `mutation-testing` from the required status
> checks") has **nothing to remove**: with branch protection at 404, there is no
> required-status-check set configured at all. M0 closes as a no-op.

## Rules to apply (GitHub Repository Settings → Branches → Branch protection)

For the `main` branch:

1. **Require pull request before merging:** OFF.
   - Trunk-based development. Direct push to `main` by Steven and authorized
     agent identities is intended.
2. **Allow force pushes:** OFF.
   - Server-side hook rejects `git push --force` and
     `git push --force-with-lease` to `main`.
3. **Allow deletions:** OFF.
4. **Require signed commits:** OFF for the agent identity; ON for the
   operator identity used for tag pushing (see § Tag pushing below).
5. **Restrict pushes:** allow Steven Cohen's GitHub identity and the
   `claude-code-<role>@bit-physics.local` agent identity ONLY. Block all
   other identities.
6. **Restrict who can push refs/heads/* other than main:** all pushes
   denied. Long-lived working branches are local only per
   `architecture.md` Appendix D § D.8 item 14.

## Tag pushing (operator-only)

Phase tags follow the pattern `v0.<N>.0-phase-<N>`. Per
`architecture.md` § 7.12, tags are pushed by the operator only.

GitHub tag-protection rule:

1. Settings → Tags → Tag protection rules.
2. Pattern: `v*-phase-*`.
3. Allowed signers: the operator's GPG-signed identity (e.g.,
   `steven.cohen@<verified-domain>`).
4. Reject pushes from any agent identity.

The operator pushes tags after landing-audit review:

```bash
git tag -s v0.<N>.0-phase-<N> <commit-sha>
git push origin v0.<N>.0-phase-<N>
```

## Required workflows that must run on `main`

Per `architecture.md` § 7.5, the following CI workflows are HARD_FAIL when
they regress. Phase 0 Block 9 activates the gated workflows; Phase 1+
inherits them green.

| Workflow file | Purpose | Block 1 status |
|---|---|---|
| `.github/workflows/structure.yml` | Verifies required dirs / top-level files exist | active |
| `.github/workflows/python-strict.yml` | `ruff check`, `mypy --strict`, `pytest -W error` | active |
| `.github/workflows/ts-strict.yml` | `pnpm tsc --noEmit`, `pnpm eslint`, `pnpm vitest run` | gated (Block 7 fills; Block 9 activates) |
| `.github/workflows/integrity.yml` | `python -m integrity --all` | gated (Block 9 activates) |
| `.github/workflows/determinism.yml` | Determinism harness | gated (Block 9 activates) |
| `.github/workflows/equivalence.yml` | Cross-stack equivalence harness | gated (Block 9 activates) |
| `.github/workflows/audit-append-only.yml` | Append-only enforcement for `docs/_audits/` | gated (Block 9 activates; goes live for Phase 1) |
| `.github/workflows/tolerance-budget-check.yml` | Tolerance overrides within budget | gated (Block 9 activates) |

> **Re-tier note — `mutation-testing.yml` de-listed (catalog
> `docs/planning/bit-physics-master-catalog.md:3489` § 41.4 T4).**
> Catalog § 41.4 places mutation / fuzz / long-running stability in the
> **weekly T4** tier, not the per-push required-check set. The workflow was
> re-tiered to a weekly cron + `workflow_dispatch` + a path-filtered SOFT_WARN
> push over the modules under test; its HARD_FAIL-at-phase-landing semantics
> are unchanged (`architecture.md` § 2.13). A scheduled/conditional workflow
> cannot serve as a required status check — a required check that does not run
> on a given push blocks that push — so de-listing here is coupled to the live
> config.
>
> **Operator action (M0) — CONFIRMED NO-OP (2026-05-27, Stage 1.D / D2).** The
> action was to drop `mutation-testing` from the required status checks (Settings
> → Branches → `main` rule → required status checks → remove `mutation-testing`).
> Live branch protection is **404 / not configured** (see the live-state amendment
> at the top of this doc), so there is **no required-status-check set to remove**.
> M0 is a no-op. Per the closing paragraph below, the synced GitHub state wins.

## Operator verification checklist

After applying the rules above:

- [ ] Try `git push --force origin main` from a throwaway clone. Rejected.
- [ ] Try `git push origin local-feature`. Rejected.
- [ ] Try `git push origin v0.0.0-phase-0` from the agent identity.
      Rejected.
- [ ] From the operator identity, `git tag -s v0.0.0-phase-0 <sha>` then
      `git push origin v0.0.0-phase-0`. Accepted; tag visible in
      `gh release` listing.
- [ ] Open a test PR that edits a previously-tagged file under
      `docs/_audits/`. `audit-append-only.yml` HARD_FAILs.
- [ ] Open a test PR that widens a `tolerance.toml` override beyond the
      `tolerance-budget.toml` cap. `tolerance-budget-check.yml` HARD_FAILs.

The checklist is run at every phase open (or after any branch-protection
rule change). Drift between this document and applied rules is treated as
Hard-Rule-2 disagreement — the synced GitHub state wins; the doc is
amended via a separate commit.
