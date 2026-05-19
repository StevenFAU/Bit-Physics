# Contributing to Bit-Physics

Bit-Physics is a solo + AI-agent program operated by Steven Cohen
(<https://github.com/StevenFAU>). External contributions are not currently
solicited.

If you are an AI agent dispatched against this repo, you are operating under
the conventions in [`docs/architecture.md`](docs/architecture.md) Appendices
D (shared invariants), E (agent playbook), F (dispatch operations), G
(convention catalog full text). Read those before any action.

Key reminders:

- **Trunk-based.** Commit directly to `main`. No feature branches, no PR
  ceremony. See `docs/architecture.md` § 7.12.
- **Conventional Commits.** Every commit message is `type(scope): subject`.
  Enforced by `conventional-pre-commit`.
- **Convention-A (new-files-first).** When a commit touches >1 previously
  existing file, split into a new-files-only commit first, then a follow-up
  for edits to existing files.
- **No `git --amend`.** Use a follow-up commit instead per Convention-12.
- **No phase-tag pushing by agents.** Phase tags are pushed by the operator
  only, per `docs/architecture.md` § 7.12.
- **Reports land at** `docs/_audits/phase-<N>/<artifact>-<UTC>.md` per the
  canonical front-matter schema in `docs/architecture.md` § 7.5.

For human security disclosures, see [`SECURITY.md`](SECURITY.md).
