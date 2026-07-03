# Derivation — Mandelbulb distance-estimator sample values

> **Canonical references:**
> - Quilez, I. (2009), "Mandelbulb (distance estimation)",
>   <https://iquilezles.org/articles/mandelbulb/> (the canonical
>   formulae for the 3D iterated map and the Hubbard–Douady DE).
> - Hart, J. C. (1996), "Sphere tracing: A geometric method for the
>   antialiased ray tracing of implicit surfaces", *The Visual
>   Computer* 12 (10), 527–545. DOI 10.1007/s003710050084 (the
>   sphere-tracing protocol that consumes the DE).
> - Hart, J. C., Sandin, D. J. & Kauffman, L. H. (1989), "Ray tracing
>   deterministic 3-D fractals", *SIGGRAPH '89*, 23 (3), 289–296. DOI
>   10.1145/74334.74363 (the original Hubbard–Douady → ray-trace
>   adaptation).

Per spec § 2.4 (R9 amendment), each golden-table test point carries
≥ 3 **independent-reference anchors** (independent of any in-repo
sim implementation). Anchors for the mandelbulb DE are most credible
when the test point is **constructible by hand** from the formulae
above; this document enumerates three such points and shows their
DE values from first principles.

The map (canonical $p = 8$, escape radius $R = 2$, iteration cap
$N_{\mathrm{max}} = 16$):

$$z_{n+1} = z_n^p + c,\qquad z_0 = c,\qquad dz_0 = 1,\qquad dz_{n+1} = p\,|z_n|^{p-1}\,dz_n + 1,$$

with $z^p$ expanded via spherical coordinates (Quilez 2009). The DE
is $\,\frac{1}{2}\,|z|\,\log|z|/|dz|\,$ evaluated at the **escape**
iteration (first $n$ where $|z_n| > R$) or at $N_{\mathrm{max}}$.
The escape test **precedes** the derivative update — in both the
committed kernel (`packages/mandelbulb-explorer/src/mandelbulb_de.wgsl`)
and the SymPy generator
(`tools/testkit/golden/generator/mandelbulb_de_samples.py`, `_de_for`)
— so $|dz|$ at escape is $dz_n$, which does **not** include the
escaping iterate's own chain-rule factor.

## 1. Anchor — origin $c = (0, 0, 0)$

$z_0 = 0$, $z^p = 0$, $z_1 = 0$, etc.: the iteration never escapes.
Standard convention (Quilez 2009 § "Distance estimation"; Hart 1989
§ 4) returns 0.0 as the in-set sentinel.

**Anchor value:** `DE = 0.0`.

**Independent references:**
1. Quilez 2009 article, "Distance estimation" section.
2. Hart et al. 1989 § 4, Hubbard–Douady in-set convention.
3. Hand-derivation in this section: trivial.

## 2. Anchor — bounding-sphere point $c = (1, 0, 0)$

Hand-evaluate using the spherical-coordinate map (full derivation in
`docs/sim-specs/closed-form/mandelbulb-explorer/algebraic.md` § 4.3):

- $z_0 = (1, 0, 0)$, $|z_0| = 1$; not escaped.
- $z_1 = (0, 0, 1) + (1, 0, 0) = (1, 0, 1)$, $|z_1| = \sqrt 2$; not escaped.
- $z_2 = (0, 0, 16) + (1, 0, 0) = (1, 0, 16)$, $|z_2| = \sqrt{257}$; escaped ($\sqrt{257} > 2$).

Derivative magnitude evolution:

- $dz_0 = 1$; $dz_1 = 8 \cdot 1^7 \cdot 1 + 1 = 9$;
  $dz_2 = 8 \cdot (\sqrt 2)^7 \cdot 9 + 1 = 576\sqrt 2 + 1$.

$\sqrt{257} = 16.0312195418814$ (Python f64).
$576\sqrt 2 + 1 = 815.5870119269028$.
$\log(\sqrt{257}) = 2.77453804244761$.

$DE = \frac{1}{2} \cdot \frac{\sqrt{257}}{576\sqrt 2 + 1} \cdot \log\sqrt{257}$
$= 0.027268230020419913$ (Python f64).

**Anchor value:** `DE = 0.027268230020419913`.

**Independent references:**
1. Hand-derivation above (this section); the integers $1, 257$ and
   the surd $576\sqrt 2 + 1$ are robust against floating-point drift.
2. SymPy symbolic re-evaluation in the generator script.
3. Quilez 2009 derivation of the chain-rule update for $dz$.

## 3. Anchor — far-field point $c = (10, 0, 0)$

$|z_0| = |c| = 10 > R = 2$, and the escape test precedes the
derivative update (header convention above, matching the committed
kernel and the SymPy generator): the point escapes at the **first
radius check**, with $z = c$ and $dz = dz_0 = 1$. The anchor is
therefore **exact and elementary**:

$$DE = \tfrac{1}{2}\,|c|\,\log|c| = 5\,\log 10 = 11.512925464970229\ \text{(f64)}.$$

**Anchor value:** `DE = 11.512925464970229`.

**Convention note (the value is convention-sensitive at the
$10^{-7}$ level).** A loop that instead computed $z^p$, updated
$dz$, and *then* tested — i.e. escape detected at
$z_1 = (10, 0, 10^8)$ with $dz_1 = 8\cdot 10^7 + 1$ — would give
$DE = \tfrac{1}{2}\,\sqrt{10^{16}+100}\,\log\sqrt{10^{16}+100}\,/\,(8\cdot 10^7+1)
\approx 11.512925321$, differing from the committed value by
$\approx 1.44\times 10^{-7}$. This is a **convention difference, not
floating-point rounding** (an earlier revision of this document
mis-attributed it to f64 error). The committed golden value binds the
check-before-update convention used by the kernel and the generator;
see the S4 row of
`docs/_audits/phase-1/sub-phase-closed-form/stage-1-checkpoint-2026-05-20T16-42-11Z.md`
for the original adoption decision.

The classical far-field asymptotic (Quilez 2009, "the far field"):
iterate once, $|z_1| \approx |c|^p$, $|dz_1| \approx p\,|c|^{p-1}$,
$DE \approx \tfrac{|c|}{2}\log|c|$ — coincides with the exact value
in its leading term, which is why both conventions agree to
$\sim 10^{-7}$ here.

**Independent references:**
1. Hand-derivation above: immediate escape, $dz = 1$, elementary
   ($5\,\log 10$ — exactly representable arithmetic on named
   constants).
2. Asymptotic form $DE \to (|c|/2)\log|c|$ as $|c| \to \infty$ —
   cited in Quilez 2009 ("the far field" remark); leading term
   identical.
3. SymPy symbolic re-evaluation in the generator script.

## 4. Generator contract

`tools/testkit/golden/generator/mandelbulb_de_samples.py` re-derives
each of the three anchor points symbolically (using SymPy for the
$z^p$-in-spherical-coords algebra and for the chain-rule $dz$ update)
and asserts equality with the table values at the canonical FP
precision tolerance (`absolute = 1e-12`, `relative = 1e-13`).
