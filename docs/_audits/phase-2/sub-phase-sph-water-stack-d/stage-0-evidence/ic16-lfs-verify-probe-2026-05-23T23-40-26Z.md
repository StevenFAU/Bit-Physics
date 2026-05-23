---
date: 2026-05-23T23-40-26Z
artifact: stage-0-evidence-scratch
artifact_id: sub-phase-sph-water-stack-d
subject: "IC-16 first-production-consumer probe — verify_evidence resolves the NumPy-reference canonical capture .h5 LFS content OID + .json blob sha256 at HEAD (Task 0.2)."
head_sha: d439fd8bc866f4569a2dc943a8854b069b35d07d
head_sha_at_checkpoint: d439fd8bc866f4569a2dc943a8854b069b35d07d
evidence_hashes:
  captures/sph-water-ref/dam-break-100K-particles-seed42-step1000.h5: sha256:7590149221180f82170b41a20d14c0e197a6b3f570cfcf9307543947c5683d2f
  captures/sph-water-ref/dam-break-100K-particles-seed42-step1000.json: sha256:84dbc44892e6ab941ac9469f25ed18827b7a6db6e2611df0a63f95a392ff5865
---

# IC-16 LFS verify_evidence probe (Task 0.2)

This throwaway Stage-0 scratch audit exercises `verify_evidence` (IC-16) against
the Phase-1 NumPy-reference canonical capture: the `.h5` is LFS-tracked (content
OID resolved from the pointer stub, no smudge/network) and the `.json` is a
normal git blob (hashed directly). Both must PASS.
