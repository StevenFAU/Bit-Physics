# strange-attractors — Algebraic derivation

> Per charter § 7.4. FACT-tagged: every ODE / parameter / fixed point
> is grep-verifiable against the cited sources.

## 1. Scope

This sim's "algorithm" is closed-form: each attractor is defined by an
autonomous ODE $\dot{\mathbf{x}} = f(\mathbf{x};\boldsymbol{\theta})$,
integrated numerically (RK4, fixed step) from a fixed initial
condition. No discretization scheme is being verified; the
discretization is **the integrator**, and the verification gate
(spec § 5.1, charter § 7.4) is **golden values** anchored on
algebraic / structural invariants of $f$ (fixed points, linearization
eigenvalues), not on numerical trajectories per se. See § 4 of
[`spec-ref.md`](./spec-ref.md) for the integrator contract.

## 2. Lorenz (canonical)

**FACT — citation.** Lorenz, E. N. (1963), "Deterministic Nonperiodic
Flow", *Journal of the Atmospheric Sciences*, 20 (2), 130–141.
DOI [10.1175/1520-0469(1963)020\<0130:DNF\>2.0.CO;2](https://doi.org/10.1175/1520-0469%281963%29020%3C0130:DNF%3E2.0.CO;2).

**Equations** (Lorenz 1963, Eqs. (25)–(27)):

$$\dot{x} = \sigma(y-x),\qquad \dot{y} = x(\rho - z) - y,\qquad \dot{z} = xy - \beta z.$$

**Canonical parameters** (Lorenz 1963 § "Numerical Integration",
pp. 134–135): $\sigma = 10$, $\rho = 28$, $\beta = 8/3$.

**Fixed points** (set $\dot{x} = \dot{y} = \dot{z} = 0$): three
solutions for $\rho > 1$:

- $P_0 = (0,0,0)$.
- $C_{\pm} = \bigl(\pm\sqrt{\beta(\rho-1)},\; \pm\sqrt{\beta(\rho-1)},\; \rho-1\bigr)$.

For canonical parameters, $\beta(\rho-1) = (8/3)\cdot 27 = 72$, hence
$C_\pm = (\pm\sqrt{72},\; \pm\sqrt{72},\; 27) = (\pm 6\sqrt{2},\; \pm 6\sqrt{2},\; 27)$.

**Jacobian at the origin** $P_0$:

$$J(P_0) = \begin{pmatrix}-\sigma & \sigma & 0\\ \rho & -1 & 0\\ 0 & 0 & -\beta\end{pmatrix}.$$

Characteristic polynomial (block-triangular):
$\det(J - \lambda I) = (-\beta-\lambda)\bigl((\sigma+\lambda)(1+\lambda) - \sigma\rho\bigr)$.

One eigenvalue is $\lambda_3 = -\beta$; the other two satisfy
$\lambda^2 + (\sigma+1)\lambda + \sigma(1-\rho) = 0$, giving
$\lambda_{1,2} = \frac{-(\sigma+1) \pm \sqrt{(\sigma+1)^2 + 4\sigma(\rho-1)}}{2}$.

For canonical $\sigma=10$, $\rho=28$:
$(\sigma+1)^2 + 4\sigma(\rho-1) = 121 + 1080 = 1201$,
so $\lambda_{1,2} = \tfrac{-11 \pm \sqrt{1201}}{2}$ ≈ {11.8277..., −22.8277...}, and $\lambda_3 = -8/3 \approx -2.6667$.

These structural quantities are the anchors used by the
`lorenz-structural.json` golden table.

## 3. Rössler

**FACT — citation.** Rössler, O. E. (1976), "An equation for continuous
chaos", *Physics Letters A*, 57 (5), 397–398.
DOI [10.1016/0375-9601(76)90101-8](https://doi.org/10.1016/0375-9601%2876%2990101-8).

**Equations** (Rössler 1976, Eq. (1)):

$$\dot{x} = -y - z,\qquad \dot{y} = x + ay,\qquad \dot{z} = b + z(x - c).$$

**Canonical parameters** (Rössler 1976 § 2): $a = 0.2$, $b = 0.2$,
$c = 5.7$.

## 4. Aizawa

**FACT — citation.** Aizawa, Y. (1982), "Global aspects of the
dissipative dynamical systems II", *Progress of Theoretical Physics*,
68 (1), 64–84.

Equations (in the form commonly cataloged in Sprott 2003 [§ 5
citation]):

$$\dot{x} = (z-b)x - dy,\quad \dot{y} = dx + (z-b)y,\quad \dot{z} = c + az - z^3/3 - (x^2+y^2)(1+ez) + fzx^3.$$

Canonical: $a=0.95,\;b=0.7,\;c=0.6,\;d=3.5,\;e=0.25,\;f=0.1$.

## 5. Sprott family

**FACT — citation.** Sprott, J. C. (1994), "Some simple chaotic flows",
*Physical Review E*, 50 (2), R647–R650.
DOI [10.1103/PhysRevE.50.R647](https://doi.org/10.1103/PhysRevE.50.R647).

19 minimal-form chaotic ODE systems labeled Sprott-A through Sprott-S.
Selected for the Stage 2 spec: **Sprott-A** (conservative,
volume-preserving):

$$\dot{x} = y,\qquad \dot{y} = -x + yz,\qquad \dot{z} = 1 - y^2.$$

(Other Sprott members are bookkept in the per-sim implementation
phase — Stage 2 bootstraps the Lorenz golden and stubs the rest.)

## 6. Pickover

Cataloged in Sprott 2003 (*Chaos and Time-Series Analysis*, Oxford
University Press, ISBN 978-0-19-850839-7); commonly:

$$\dot{x} = \sin(ay) - z\cos(bx),\quad \dot{y} = z\sin(cx) - \cos(dy),\quad \dot{z} = \sin(x).$$

Canonical: $a=2.24,\;b=0.43,\;c=-0.65,\;d=-2.43$. **INFERENCE** — the
exact Pickover canonical set varies across references; the
implementation phase will pin a specific source.

**RESOLVED at X-A implementation (2026-07-03) — deferred-with-cause.**
The form above, integrated as an ODE (RK4, probe dt 0.02–0.05, four
ICs), is **not a strange attractor**: three of four probe trajectories
diverge unboundedly in $y$ (max $|y| > 2\times 10^4$; $x$ pins near a
$\sin x$ zero and $\dot z$ drifts), the fourth converges to the stable
fixed point $(0, 1.94, -0.93)$. The catalog entry is the classical
discrete **map** written with dots. Structural facts that *are*
anchorable were measured before deferral: principal fixed-point branch
$x=0$, $\cos(dy)=0 \Rightarrow y=(\pi/2)/d$, $z=\sin(ay)$ — at the
canonical set $(0, -0.6464182414793813, -0.9924671657092096)$ with
$\operatorname{div} f = d$ there. Deferral is operator-voidable on a
source that documents a genuinely chaotic continuous variant.

## 7. Mandelbulb cross-link

The mandelbulb-explorer sim (paired in this stage per charter § 7.4)
covers the 3D fractal distance estimator. See
[`docs/sim-specs/closed-form/mandelbulb-explorer/algebraic.md`](../mandelbulb-explorer/algebraic.md).

## 8. Scope-amendment systems (X-B / X-C, ratified 2026-07-03)

Sections 9–13 extend the algebraic anchor beyond the original chartered
family per the operator-ratified X-B/X-C scope amendment (spec-ref § 1;
`packages/strange-attractors/web/feature-expansion-spec.md` § 3.3).
Full derivations, calibration measurements and independent-reference
routes live in each system's
`tools/testkit/golden/derivations/<name>-structural.md`.

## 9. Thomas (X-B)

**FACT — citation.** Thomas, R. (1999), "Deterministic chaos seen in
terms of feedback circuits", *Int. J. Bifurcation Chaos* 9 (10),
1889–1905, DOI
[10.1142/S0218127499001383](https://doi.org/10.1142/S0218127499001383)
(Crossref-verified at implementation). Canonical $b = 0.208186$ per the
Sprott 2003 catalog usage.

$$\dot{x} = \sin y - bx,\quad \dot{y} = \sin z - by,\quad \dot{z} = \sin x - bz.$$

Cyclically symmetric under $(x,y,z)\to(y,z,x)$;
$\operatorname{div} f = -3b$ (constant);
$J(0) = -bI + P$ gives eigenvalues $-b + \sqrt[3]{1}$.

## 10. Halvorsen (X-B)

**FACT — citation.** Cataloged in Sprott 2003 (ISBN 978-0-19-850839-7).
Canonical $a = 1.4$.

$$\dot{x} = -ax - 4y - 4z - y^2 \quad (\text{and cyclically}).$$

Cyclically symmetric; $\operatorname{div} f = -3a$;
$J(0)$ is a symmetric circulant with eigenvalues $-a-8,\ -a+4,\ -a+4$.

## 11. Dadras (X-C)

**FACT — citation.** Dadras, S., Momeni, H. R. (2009), *Phys. Lett. A*
373 (40), 3637–3642, DOI
[10.1016/j.physleta.2009.07.088](https://doi.org/10.1016/j.physleta.2009.07.088)
(Crossref-verified). Canonical $(p,o,r,c,e) = (3, 2.7, 1.7, 2, 9)$.

$$\dot{x} = y - px + oyz,\quad \dot{y} = ry - xz + z,\quad \dot{z} = cxy - ez.$$

Origin fixed point with triangular $J(0)$: eigenvalues $(-p, r, -e)$;
$\operatorname{div} f = -p + r - e$.

## 12. Chen (X-C)

**FACT — citation.** Chen, G., Ueta, T. (1999), "Yet another chaotic
attractor", *Int. J. Bifurcation Chaos* 9 (7), 1465–1466, DOI
[10.1142/S0218127499001024](https://doi.org/10.1142/S0218127499001024)
(Crossref-verified). Canonical $(a,b,c) = (35, 3, 28)$.

$$\dot{x} = a(y-x),\quad \dot{y} = (c-a)x - xz + cy,\quad \dot{z} = xy - bz.$$

Lorenz-sibling algebra: $C_\pm = (\pm\sqrt{b(2c-a)}, \pm\sqrt{b(2c-a)}, 2c-a)$;
block-triangular $J(0)$; $\operatorname{div} f = c - a - b$. **Fast at
canonical parameters — dt = 0.002 measured** (expansion spec § 3.3.1).

## 13. Four-wing (X-C)

**FACT — class citation.** The four-wing class is cataloged in Sprott,
J. C. (2010), *Elegant Chaos*, World Scientific
(ISBN 978-981-283-881-0); canonical set
$(a,\dots,f) = (0.2, -0.01, 1, -0.4, -1, -1)$ per the expansion spec
§ 3.3.1 table.

$$\dot{x} = ax + cyz,\quad \dot{y} = bx + dy - xz,\quad \dot{z} = ez + fxy.$$

Parity-equivariant under $\mathrm{diag}(-1,-1,1)$ (the two wing pairs);
triangular $J(0)$ with eigenvalues $(a, d, e)$;
$\operatorname{div} f = a + d + e$.
