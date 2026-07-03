# mandelbulb-explorer — Algebraic derivation

> Per charter § 7.4. FACT-tagged: every formula / citation is
> grep-verifiable.

## 1. Scope

The mandelbulb is a 3D generalization of the 2D Mandelbrot set under
the map $z_{n+1} = z_n^p + c$ where $z, c \in \mathbb{R}^3$ are
identified with quasi-quaternionic coordinates via spherical
trigonometry. This file derives the formulae used by the **distance
estimator (DE)** that sphere-tracing renderers consume.

The DE returns a lower bound on the distance from a point $c \in
\mathbb{R}^3$ to the mandelbulb set, allowing a ray-marching renderer
to step by at-least-DE without intersecting the set.

## 2. The mandelbulb map (Quilez 2009 form)

**FACT — citation.** Quilez, I. (2009), "Mandelbulb (distance
estimation)", *iquilezles.org*,
<https://iquilezles.org/articles/mandelbulb/>. Original derivation
formalized by D. White and P. Nylander (2009).

For $z = (x, y, z) \in \mathbb{R}^3$, write $z$ in spherical
coordinates $(r, \theta, \phi)$:

$$r = \sqrt{x^2 + y^2 + z^2},\qquad \theta = \arccos(z/r),\qquad \phi = \mathrm{atan2}(y, x).$$

The cubed-mandelbulb-with-power $p$ map sends $z \mapsto z^p$ via

$$z^p = r^p\bigl(\sin(p\theta)\cos(p\phi),\; \sin(p\theta)\sin(p\phi),\; \cos(p\theta)\bigr).$$

The iterated map is

$$z_{n+1} = z_n^p + c,\qquad z_0 = c.$$

**Canonical parameter:** $p = 8$ (the value popularized by White &
Nylander 2009; this is what most published renders show).

## 3. Distance estimator (Hart 1996 / Hubbard–Douady)

**FACT — citation.** Hart, J. C., Sandin, D. J., & Kauffman, L. H.
(1989), "Ray tracing deterministic 3-D fractals", *Computer Graphics
(SIGGRAPH '89)*, 23 (3), 289–296. DOI 10.1145/74334.74363.
Hart, J. C. (1996), "Sphere tracing: A geometric method for the
antialiased ray tracing of implicit surfaces", *The Visual Computer*,
12 (10), 527–545. DOI 10.1007/s003710050084.

The escape-time distance estimator for the iterated map is the
**Hubbard–Douady formula** adapted to the 3D case (Quilez 2009 derives
the 3D version; the 2D version is in Hubbard & Douady 1985):

$$DE(c) = \frac{1}{2}\,\frac{|z|}{|dz|}\,\log|z|,$$

where the iteration is terminated when $|z| > R_{\mathrm{escape}}$
(typically $R = 2$) or when $n > N_{\mathrm{max}}$. The derivative
$|dz|$ is updated alongside $z$ via the chain rule:

$$dz_{n+1} = p\, |z_n|^{p-1}\, dz_n + 1,\qquad dz_0 = 1.$$

(Quilez 2009, "the trick" section; the $+1$ comes from differentiating
the $+c$ term with respect to the seed.)

## 4. Special sample points (used by the golden table)

These are points whose DE values are exactly computable in closed form
from the formula, independent of any in-repo iteration loop. They
serve as the ≥ 3 independent-reference anchors for the
`mandelbulb-de-samples.json` golden table.

### 4.1 Origin $c = (0, 0, 0)$

The origin is inside the mandelbulb set: $z_0 = 0$ gives $z_n = 0$ for
all $n$, so the escape condition is never satisfied. The DE convention
in this case is to return a sentinel value (e.g., 0.0) indicating "in
set". **Anchor value:** `DE((0,0,0)) = 0.0` (convention; Quilez 2009 §
"Distance estimation").

### 4.2 Far-field point $c = (10, 0, 0)$

Because $|c| = 10 > R_{\mathrm{escape}} = 2$, the estimator's escape
test — which **precedes** the derivative update in both the committed
kernel (`packages/mandelbulb-explorer/src/mandelbulb_de.wgsl`) and
the SymPy generator
(`tools/testkit/golden/generator/mandelbulb_de_samples.py`, `_de_for`)
— fires at the very first radius check, with $z = c$ and
$dz = dz_0 = 1$. The anchor is therefore **exact**, not asymptotic:

$$DE(c) = \frac{1}{2}\,|c|\,\log|c| = 5 \cdot \log 10 = 11.512925464970229\ \text{(f64)}.$$

The classical far-field asymptotic (Quilez 2009's sanity check) —
iterate once so $|z_1| \approx |c|^p$, $|dz_1| \approx p\,|c|^{p-1}$,
giving $DE \approx \frac{|c|}{2}\,\log|c|$, independent of $p$ in the
leading term — coincides with the exact value. A check-*after*-update
loop would instead give $\approx 11.5129253$, differing by
$\approx 1.44\times 10^{-7}$: a convention difference, not
floating-point error. The committed golden value binds the
check-before-update convention (the kernel's and the generator's; see
the S4 row of
`docs/_audits/phase-1/sub-phase-closed-form/stage-1-checkpoint-2026-05-20T16-42-11Z.md`).

**Independent derivations** (anchor sources):
1. Hand-derivation above: immediate escape, $dz = 1$, elementary.
2. Quilez 2009 article, "the formula" section, far-field discussion
   (asymptotic cross-check; leading term identical).
3. SymPy 30-digit re-evaluation by the generator script.

### 4.3 On the bounding sphere at $c = (1, 0, 0)$

The mandelbulb is contained inside the sphere $|c| \le R_b \approx
1.20$ (numerically estimated). For $c = (1, 0, 0)$, $|c| = 1$,
exactly on the boundary of the unit sphere. Substituting:

Substituting into the map with $z_0 = c$ (the § 2 convention, matching
the committed kernel):

$z_0 = (1, 0, 0)$, $|z_0| = 1 < 2$: not escaped. $z_0^p$ in
spherical coordinates: $r = 1$, $\theta = \pi/2$, $\phi = 0$, so
$z_0^p = 1^p \cdot (\sin(p\pi/2),\, 0,\, \cos(p\pi/2))$. For $p = 8$:
$\sin(4\pi) = 0$, $\cos(4\pi) = 1$, so $z_0^p = (0, 0, 1)$ and
$z_1 = (0, 0, 1) + (1, 0, 0) = (1, 0, 1)$, $|z_1| = \sqrt{2} < 2$:
**still not escaped**. $z_1^p$: $r = \sqrt{2}$,
$\theta = \arccos(1/\sqrt{2}) = \pi/4$, $\phi = 0$, so $z_1^p =
(\sqrt{2})^8 \cdot (\sin(2\pi),\, 0,\, \cos(2\pi)) = (0, 0, 16)$ and
$z_2 = (0, 0, 16) + (1, 0, 0) = (1, 0, 16)$,
$|z_2| = \sqrt{257} \approx 16.03 > 2$. **Escaped at the $n = 2$
radius check** (the golden table's `escaped_at_iteration: 2`).

Now compute the DE: the derivative magnitude evolves via $dz_{n+1} =
p\,|z_n|^{p-1}\,dz_n + 1$ with $dz_0 = 1$, $p = 8$ (updates run only
for the non-escaped iterates $n = 0, 1$; the escape test precedes the
update — § 4.2):

- $dz_1 = 8 \cdot |z_0|^7 \cdot 1 + 1 = 8 \cdot 1 + 1 = 9$.
- $dz_2 = 8 \cdot |z_1|^7 \cdot 9 + 1 = 8 \cdot (\sqrt 2)^7 \cdot 9 + 1 = 576\sqrt 2 + 1 = 815.5870119269\ldots$

Then $DE(c) = \tfrac{1}{2}\,(|z_2|/|dz_2|)\,\log|z_2| =
\tfrac{1}{2}\,\bigl(\sqrt{257}/(576\sqrt 2 + 1)\bigr)\,\log\sqrt{257}$
$\approx 0.5 \cdot 0.0196560 \cdot 2.7745380 \approx 0.0272682$.

**Anchor value:** $DE((1,0,0); p=8, R=2, N_{\mathrm{max}} \ge 3)
= 0.027268230020419913$ (f64; committed verbatim in the golden
table).

**Independent derivations:**
1. Hand-derivation in this section, traceable to the formula.
2. SymPy-symbolic re-evaluation by the generator script.
3. The exact value $|z_2| = \sqrt{257}$ is independent-citable (the
   integer 257 is robust against floating-point drift).

## 5. FACT / INFERENCE tagging

- **FACT** — Quilez 2009 derivation cited above is publicly available
  at the linked URL.
- **FACT** — Hart 1996 sphere-tracing paper is DOI-verifiable.
- **FACT** — § 4.2 far-field asymptotic is a textbook result (Hubbard
  & Douady 1985 in 2D; trivially extends).
- **FACT** — § 4.3 hand-derivation is reproducible by anyone with the
  formulae in §§ 2–3.
- **INFERENCE** — the "mandelbulb is contained inside $|c| \le 1.20$"
  bound is numerical, not analytical; it does not impact the golden
  table's anchor points.
