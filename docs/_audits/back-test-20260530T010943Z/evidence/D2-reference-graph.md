# D2 — Path & anchor resolution (full reference graph)

**Audit:** back-test-20260530T010943Z
**Dimension:** D2 — Path & anchor resolution (full reference graph)
**Pin:** 4ee0ea9 (HEAD)
**Worktree:** /home/otacon/Projects/bp-audit-2
**Worktree HEAD:** 4ee0ea9e2d9736c63a5f16feb049b8c63e0c65c9 (re-confirmed clean, matches dispatch pin)
**Mode:** READ-ONLY for source. One file written (this evidence file).
**Prior method source:** /home/otacon/Projects/bp-audit/docs/_audits/back-test-20260529T124759Z/evidence/D2-reference-graph.md (re-confirmed at HEAD; not trusted).

---

## 0. Scope & denominator definition

The **committed denominator** is every cross-reference EDGE in the docs corpus plus
code-comment spec-refs. Per the dispatch ("every cross-reference EDGE in the docs
corpus"), the denominator INCLUDES `docs/_audits/**` history (459 indexed `.md`
files, the full committed audit trail) — this is wider than the prior run, which
froze `_audits/**` out of scope (prior counted 145 LIVE docs only, 11,287 edges).
The increase to 16,787 edges here is entirely the `_audits/**` corpus; the LIVE
(non-`_audits`) sub-graph is re-confirmed against prior.

**File universe:**

| Set | Files | How counted |
|---|---|---|
| All committed docs (`docs/**`, incl `_audits`) | 459 `.md` for §-index; full set scanned | `git ls-tree -r HEAD -- docs` filtered `.md` |
| Code (`packages/ tools/ common/`) | 682 `.py/.cpp/.hpp/.h/.ts/.wgsl/.cc` | `git ls-tree -r HEAD` |

**Method (scripted, no sampling, every edge checked):**

- **(iv) path:line:** every backtick-fenced span scanned for `path:linespec`
  (`PATHLINE = ([A-Za-z0-9_./-]+\.[ext]):(\d+([-,]\d+)*)`). Range/comma linespecs
  expand to endpoints; each edge resolves iff the file exists (or resolves
  relative to the citing-file dir) AND max linespec ≤ file linecount.
- **(i) numeric §:** `§\s*(\d+(?:\.\d+){1,3})` — at least one dot, matching the
  dispatch class "§N.N / §N.N.N" and the prior method. Resolved against a heading
  index built across all 459 docs (markdown headings, bold-numbered sim entries
  `**N.N.N**`, list-item deliverables `- **N.N**`). Candidate target ordering:
  citing-doc → architecture.md → catalog → conventions → phase plans → corpus.
- **(ii) appendix-section:** `§\s*([A-Z])\.(\d+...)`. Index captures
  `## D.2.3`, `## § E.6.` (per-sim equivalence docs define their own §E),
  `Appendix X.N`.
- **(ii) appendix-letter:** `Appendix\s+([A-Z])`.
- **(iii) IC-N:** `IC-(\d+)` resolved against the IC definition set (heading /
  bold / `IC-N —` / `IC-N:` / list-item across all docs).
- **§0.3 layout-SHIFT class (task-5 mandate):** for all 8 Phase-3 sims, the
  category-folder package paths (`<category>/<sim>/python|cpp|typescript/`) checked
  for on-disk existence vs the actual `packages/<sim>/` placement.

Scripts: `/tmp/d2b/{lib,extract_pathline,build_index,resolve_secs,extract_barepath}.py`.

---

## 1. Coverage — per-class denominators (checked == denominator)

| Class | Partition | Edges (denominator) | Checked | Resolved | Unresolved (raw) | Genuine defects | Non-defect unresolved |
|---|---|---|---|---|---|---|---|
| (iv) path:line | docs (incl _audits) | 1014 | 1014 | 1000 | 14 | 0 | 14 |
| (iv) path:line | code (backtick) | 35 | 35 | 35 | 0 | 0 | 0 |
| (i) numeric § | docs+code | 10512 | 10512 | 10471 | 41 | 5 (4 DANGLING + 1 MIS-AIMED) | 36 external-textbook |
| (ii) appendix-section | docs+code | 2763 | 2763 | 2753 | 10 | 5 (MIS-AIMED §D.10→D.9) | 5 (proposed-new §A.2.1×3, §J.5.1×2) |
| (ii) appendix-letter | docs+code | 530 | 530 | 530 | 0 | 0 | 0 |
| (iii) IC-N | docs+code | 1933 | 1933 | 1931 | 2 | 0 | 2 (IC-17 RESERVED ×2) |
| **TOTAL** | | **16787** | **16787** | **16720** | **67** | **15** | **52** |

`checked == denominator` for every partition.

### 1.1 path:line unresolved (14 raw) — all non-defect

- **8 abbreviated-sibling-path shorthands** (inside `_audits/**` checkpoint prose):
  the citing text drops the `sub-phase-` prefix or the parent dir (e.g.
  `reaction-diffusion-2d-stack-c/stage-1c-checkpoint-...md:34-36`), and the full
  target exists elsewhere in the tree with sufficient lines. Verified each resolves
  (`sub-phase-reaction-diffusion-2d-stack-c/...:36` lc=155; the other 7 likewise lc≥cite).
- **3 lenia Stage-1a RED-state cites** at `...lenia-stage-1a-...:152` — the span is
  the brace-expansion `packages/lenia/lenia/{kernel.py:55, growth.py:52, sim.py:77,85}`;
  the full path prefix is in the same span. `kernel.py` (lc=55) and `sim.py` (lc=252)
  fit at HEAD. `growth.py:52` exceeds HEAD lc=48 — but at the Stage-1a audit commit
  `107b9ad` `growth.py` was EXACTLY 52 lines (the `NotImplementedError` shell); Stage-1b
  (`11d82b6`) shrank it to 48. Frozen audit checkpoint documenting a transient RED state;
  accurate when written. Non-defect.
- **1 leading-slash workflow path** `/.github/workflows/equivalence.yml:6-26` (lc=26,
  fits) — leading-slash is prose; file exists.
- **1 ellipsis-prefix shorthand** `sub-phase-conventions.md:1062` →
  `…/landing-2026-05-23T21-22-23Z.md:290`; full path given by the preceding cite in the
  same sentence; target lc=324 ≥ 290. (Same item the prior run flagged non-defect.)
- **1 ellipsis-prefix shorthand** in r2-credentials audit
  `…2026-05-28T11-12-05Z.md:160-164` → `sub-phase-phase-3-common-3dgs-landing-2026-05-28T11-12-05Z.md`
  (lc=293 ≥ 164). Non-defect.

LIVE (non-`_audits`) path:line unresolved = **1** (the conventions:1062 ellipsis), non-defect.

### 1.2 numeric § unresolved (41) — 5 defects + 36 external

| Token | Count | Class |
|---|---|---|
| 22.19 | 28 | DLMF §22.19 (Jacobi elliptic) — external textbook, non-defect |
| 2.2.1 | 6 | Evans *PDE* 2e §2.2.1 (fundamental solution) — external textbook, non-defect |
| 5.3.4 | 1 | Krüger 2017 §5.3.4 (code comment, pre-existing LBM) — external, non-defect |
| 1.13 | 1 | Higham §1.13 — external textbook, non-defect |
| 16.7.5 | 2 | catalog phantom compose-ref — **DANGLING** (m-4) |
| 19.7.7 | 1 | catalog phantom compose-ref — **DANGLING** (m-4) |
| 18.7.12 | 1 | catalog phantom compose-ref — **DANGLING** (m-4) |
| 1.6.7 | 1 | phase-2-cross self-ref — **MIS-AIMED** → §1.6.6 (m-3) |

### 1.3 appendix-section unresolved (10) — 5 defects + 5 proposed-new

- **§D.10 ×5** (phase-4-plan:70,146,2957; phase-3-plan:48; phase-2-cross:42) —
  MIS-AIMED → §D.9 (m-2). Architecture Appendix D ends at `## D.9` (line 2648).
- **§A.2.1 ×3 + §J.5.1 ×2** (sub-phase-conventions-refactor-post-phase-1.md:63,65,71,185)
  — proposed-NEW sub-sections weighed as routing alternatives ("extend §I.3 vs new
  §J.5.1"; "new §A.2.1 sub-section vs …"), not citations of existing targets. Non-defect.

### 1.4 IC-N unresolved (2) — RESERVED, non-defect

IC-17 ×2 (`sub-phase-ci-action-migration-and-banked-cleanup.md:320` +
its plan-drafting-probe:327): deliberately-reserved future number
("IC-17 available if the operator formalizes …"), not a citation. IC defs present
= IC-1…IC-16. Non-defect.

---

## 2. Re-tested prior MINOR findings — verdict table

| ID | Verdict | Evidence at HEAD 4ee0ea9 |
|---|---|---|
| **m-2** (§D.10 → §D.9 off-by-one ×5) | **LIVE** | architecture.md Appendix D headings stop at `## D.9 — Context-fill triage discipline` (line 2648); NO §D.10. Cited "70-80%/>80% context-fill" content is D.9. All 5 cites LIVE: `phase-4-plan.md:70,146,2957`; `phase-3-plan.md:48`; `phase-2-cross-stack-replication.md:42`. |
| **m-3** (§1.6.7 self-ref) | **LIVE** | `phase-2-cross-stack-replication.md:2750` cites §1.6.7; §1.6 headings stop at `### §1.6.6 Runtime-only display surfaces` (line 588). Cited GGUI/CI-gating content IS §1.6.6. MIS-AIMED off-by-one. (Prior cited the same line 2750.) |
| **m-4** (catalog phantom §16.7.5/§18.7.12/§19.7.7) | **LIVE** | `bit-physics-master-catalog.md:713` carries TWO phantom refs (§19.7.7 + §18.7.12); `:901` + `:903` cite §16.7.5. Catalog ch19 uses `19.5.x`, ch18 `18.5.x`, ch16 `16.4.x` sub-series — no `.7.` series exists. 4 DANGLING compose-refs. |
| **m-8** (truncated `tools/integrity/scripts/...py`) | **LIVE — BROADER than prior** | Real path is `tools/integrity/integrity/scripts/...` (nested pkg dir); `tools/integrity/scripts/` does NOT exist. Prior listed 5 (architecture.md:1450,1459,3131,3149,3204). At HEAD there are **9** truncated cites across LIVE docs: those 5 PLUS `phase-0-plan.md:1454,1456,1468,1780`. (D6-overlap; these are bare-path-in-backtick cites without `:line`, so outside the path:line edge-class denominator — surfaced here per re-test mandate.) |
| **SEED-2** (architecture.md:1530 §7.12) | **RESOLVES (non-defect)** | `## 7.12 Trunk-based development` present at line 1530; canonical anchor for operator-only tag pushing. |
| **BT-1** (architecture.md:2464 §D.2.3 Locked descriptor table) | **RESOLVES (non-defect)** | `### D.2.3 Locked descriptor table` present at line 2464; all §D.2.3 cites content-aligned. |

---

## 3. §0.3 layout-SHIFT verification — all 8 Phase-3 sims

ACTUAL on-disk package paths (all flat `packages/<sim>/`, all present):

| Sim | Plan-prescribed category path | Actual path | Category dir on disk |
|---|---|---|---|
| lenia (task-3) | `continuous-ca/lenia/python/` | `packages/lenia/` | ABSENT |
| articulated-pedagogical (task-4) | `rigid-body/articulated-pedagogical/python/` | `packages/articulated-pedagogical/` | ABSENT |
| mass-spring-cloth (task-5) | `soft-body/mass-spring-cloth/cpp/` | `packages/mass-spring-cloth/` | ABSENT |
| neural-ca (task-6) | `continuous-ca/neural-ca/{python,typescript}/` | `packages/neural-ca/{python,typescript}/` | ABSENT |
| pinn-poisson (task-7) | `learned-dynamics/pinn-poisson/python/` | `packages/pinn-poisson/` | ABSENT |
| 3dgs-mpm (task-8) | `neural-rendered/3dgs-mpm/python/` | `packages/3dgs-mpm/` | ABSENT |
| ising-classical | `lattice-spin/ising-classical/typescript/` | `packages/ising-classical/` | ABSENT |

**Finding D2-N1 (§0.3-residual-plan-text, MINOR):** `docs/phases/phase-3-plan.md`
(the unedited master plan) still prescribes the non-existent category-folder package
paths in **52 string occurrences** across the 7 sims — task-scope rows (lines 325-330),
per-sim deliverable sections (1307, 1423, 1456, 1466, 1692, 1798-1799, 1909, 2040), and
embedded recipes (`pytest continuous-ca/lenia/python/tests/`,
`pnpm vitest run lattice-spin/ising-classical/typescript/tests/`,
`pytest soft-body/mass-spring-cloth/cpp/tests/`). NONE of the 7 category dirs exist
on disk. This is a **known, ratified divergence**: every sub-phase charter records the
SHIFT to `packages/<sim>/` with the explicit ruling "NO plan edit unilateral" (the plan
text is intentionally left in place). Severity MINOR — a reader/tool following the master
plan's package paths lands nowhere, but each sim's spec-ref + sub-phase charter annotates
the override.

**Non-defect (correctly resolves):** Every tasks-5-8 sub-phase doc and spec-ref that
cites a category path EITHER (a) is an explicit §0.3-SHIFT annotation documenting the
divergence (e.g. `mass-spring-cloth/spec-ref.md`, `neural-ca/spec-ref.md:110-111`,
`pinn-poisson/spec-ref.md:13`, `3dgs-mpm/spec-ref.md:14`, plus the matching sub-phase
docs), OR (b) cites the sim-spec DOC directory `docs/sim-specs/<category>/<sim>/`, which
legitimately keeps the category prefix and EXISTS on disk (all 4 task-5-8 sim-spec dirs
confirmed present). NO new broken package-path edge is introduced by tasks 5-8 outside
phase-3-plan.md.

---

## 4. NEW unresolved edges introduced by tasks 5-8

Systematic check of the cloth/nca/pinn/3dgs-mpm plans + spec-refs + landing audits:

| file:line | target | why unresolved | severity | remediation |
|---|---|---|---|---|
| (none — internal graph) | — | tasks-5-8 docs introduce ZERO new DANGLING/MIS-AIMED internal §/appendix/path:line edges. The only tasks-5-8 unresolved §-tokens are external scholarly refs: pinn-poisson Evans §2.2.1 (×6 incl spec-ref:74, problems.py:18,98), rigid-body DLMF §22.19 (×many) — both correctly external. | N/A | none |

The new external-textbook §-refs (Evans §2.2.1, DLMF §22.19) and the §0.3-residual
phase-3-plan.md package paths (D2-N1) are the only edges touching tasks 5-8 that fail
naive resolution; all are non-defect external or the single known D2-N1 ratified divergence.

---

## 5. FINDINGS summary

```
ID    | dim         | sev   | status        | location                                        | remediation
m-2   | path/anchor | MINOR | LIVE          | phase-4-plan.md:70,146,2957; phase-3-plan.md:48; phase-2-cross:42 | retarget §D.10 → §D.9
m-3   | path/anchor | MINOR | LIVE          | phase-2-cross-stack-replication.md:2750         | retarget §1.6.7 → §1.6.6
m-4   | path/anchor | MINOR | LIVE          | bit-physics-master-catalog.md:713(×2),901,903   | retarget phantom §16.7.5/§18.7.12/§19.7.7 to real .5/.4 sub-series, or mark aspirational
m-8   | path/anchor | MINOR | LIVE (broader)| architecture.md:1450,1459,3131,3149,3204 + phase-0-plan.md:1454,1456,1468,1780 | path `tools/integrity/scripts/` → `tools/integrity/integrity/scripts/`
D2-N1 | path/anchor | MINOR | NEW           | phase-3-plan.md (52 occurrences, lines 325-330,1307,1423,1456,1466,1692,1798-1799,1909,2040,…) | retarget category paths `<cat>/<sim>/{python,cpp,typescript}/` → `packages/<sim>/`, or add a §0.3-SHIFT note in-plan
SEED-2| path/anchor | —     | RESOLVES      | architecture.md:1530 (§7.12)                    | none
BT-1  | path/anchor | —     | RESOLVES      | architecture.md:2464 (§D.2.3)                   | none
```

No BLOCKER or MAJOR D2 findings. All 5 active findings MINOR.

---

## 6. Totals

- **Grand total D2 edges = 16,787** (path:line docs 1014 + code 35; numeric § 10,512;
  appendix-section 2763; appendix-letter 530; IC-N 1933). checked == denominator.
- **Resolved = 16,720** ; **unresolved (raw) = 67**.
- Of 67 unresolved: **15 genuine defects** (m-2 ×5 + m-3 ×1 + m-4 ×4 + appendix-D.10
  cluster is the m-2 ×5 already counted under appendix-section — net distinct defect
  EDGES = 4 DANGLING catalog + 5 MIS-AIMED §D.10 + 1 MIS-AIMED §1.6.7 = **10 internal
  defect edges**, plus m-8's 9 bare-path cites which sit outside the path:line edge-class)
  and **52 non-defect** (36 external-textbook §, 14 path:line shorthand/RED-state,
  2 IC-17 RESERVED, plus 5 proposed-new appendix sections — note the proposed-new 5 and
  shorthand counts overlap the per-class tallies above; the authoritative per-class
  breakdown is §1).
- **m-8** adds 9 truncated `tools/integrity/scripts/` path cites (bare path, no `:line`,
  outside the declared path:line edge-class but in-scope for the re-test): D6-overlap, LIVE.
- **D2-N1** adds 52 `phase-3-plan.md` category-folder package-path strings (§0.3-residual),
  a single ratified-divergence finding, MINOR.
