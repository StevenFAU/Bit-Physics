# boids-3d — Algebraic derivation

> Per charter § 7.5. FACT-tagged. Citations grep-verifiable.

## 1. Scope

Reynolds 1987's three-rule flocking. State per agent $i$:
position $\mathbf{p}_i \in \mathbb{R}^3$, velocity $\mathbf{v}_i \in
\mathbb{R}^3$. The update at each timestep is a velocity perturbation
from three steering forces.

## 2. Reynolds 1987 — three rules

**FACT — citation.** Reynolds, C. W. (1987), "Flocks, herds and
schools: A distributed behavioral model", *SIGGRAPH '87 Conference
Proceedings*, *ACM SIGGRAPH Computer Graphics*, 21 (4), 25–34.
DOI [10.1145/37401.37406](https://doi.org/10.1145/37401.37406).

For each agent $i$ with neighbor set $\mathcal{N}_i = \{j \ne i : \|\mathbf{p}_j - \mathbf{p}_i\| \le r_{\mathrm{perc}}\}$:

**Separation** — repel from each near neighbor (Reynolds 1987 § 2.1):

$$\mathbf{f}_i^{\mathrm{sep}} = \sum_{j \in \mathcal{N}_i} \frac{\mathbf{p}_i - \mathbf{p}_j}{\|\mathbf{p}_i - \mathbf{p}_j\|^2}.$$

**Alignment** — match neighborhood average velocity (Reynolds 1987 § 2.2):

$$\mathbf{f}_i^{\mathrm{align}} = \frac{1}{|\mathcal{N}_i|}\sum_{j \in \mathcal{N}_i}\mathbf{v}_j - \mathbf{v}_i.$$

**Cohesion** — steer toward neighborhood centroid (Reynolds 1987 § 2.3):

$$\mathbf{f}_i^{\mathrm{coh}} = \frac{1}{|\mathcal{N}_i|}\sum_{j \in \mathcal{N}_i}\mathbf{p}_j - \mathbf{p}_i.$$

## 3. Composite update

Weighted sum with canonical weights $(w_s, w_a, w_c)$ and explicit Euler
in time with step $\Delta t$, then a max-speed clamp:

$$\mathbf{v}_i^{n+1} = \mathrm{clamp}_{v_{\max}}\!\bigl(\mathbf{v}_i^n + \Delta t \,(w_s \mathbf{f}_i^{\mathrm{sep}} + w_a \mathbf{f}_i^{\mathrm{align}} + w_c \mathbf{f}_i^{\mathrm{coh}})\bigr),$$
$$\mathbf{p}_i^{n+1} = \mathbf{p}_i^n + \Delta t \,\mathbf{v}_i^{n+1}.$$

**Canonical parameters** (Reynolds 1999 — *Steering Behaviors for
Autonomous Characters*, GDC 1999; widely used values):
$w_s = 1.5$, $w_a = 1.0$, $w_c = 1.0$, $r_{\mathrm{perc}} = 5.0$,
$v_{\max} = 3.0$, $\Delta t = 0.05$.

## 4. 3-agent golden fixture (closed-form)

The golden table at
`tools/testkit/golden/tables/agent-based/boids-3agent-step1.json`
fixes 3 agents at positions / velocities and shows the post-step
velocity computed by hand from § 3 above. This minimal fixture is the
spec § 5.3 anchor ("3-agent test cases for boids").
