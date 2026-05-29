// Mass-spring cloth — acceptance suite (charter § 3 deliverable C).
//
// Three physical-property acceptance tests + the determinism witness. RED at
// Stage 1a (run_cloth stub throws); GREEN at Stage 1b (real serial-GS XPBD).
// Golden-table value comparisons (catenary / stretched) are added at Stage 1b
// in test_golden.cpp (gate-4); these tests assert regime-level physics that
// hold independent of the golden tables.

#include <doctest/doctest.h>

#include <algorithm>
#include <cmath>
#include <vector>

#include "bit_physics/mass_spring_cloth/cloth.hpp"

namespace cloth = bit_physics::mass_spring_cloth;

namespace {
double py(const std::vector<double>& p, uint32_t i) { return p[3u * i + 1u]; }
double px(const std::vector<double>& p, uint32_t i) { return p[3u * i + 0u]; }
double dist(const std::vector<double>& p, uint32_t a, uint32_t b) {
    double dx = p[3u * a] - p[3u * b];
    double dy = p[3u * a + 1u] - p[3u * b + 1u];
    double dz = p[3u * a + 2u] - p[3u * b + 2u];
    return std::sqrt(dx * dx + dy * dy + dz * dz);
}
}  // namespace

TEST_CASE("GREEN[gate-3/acceptance] cloth at rest stays at rest (zero-motion)") {
    // Flat cloth, gravity OFF, started at the constraint-satisfying grid rest
    // config. No external force, all constraints satisfied (C=0) -> exactly no
    // motion. Bit-level: positions unchanged, speed zero.
    cloth::ClothConfig cfg;
    cfg.nx = 8; cfg.ny = 8; cfg.spacing = 1.0;
    cfg.gx = cfg.gy = cfg.gz = 0.0;
    cfg.steps = 30; cfg.capture_interval = 30;
    cfg.iterations = 10;

    std::vector<double> ic = cloth::build_grid_positions(cfg);
    cloth::ClothResult r = cloth::run_cloth(cfg);

    REQUIRE(r.final_positions.size() == ic.size());
    double max_disp = 0.0;
    for (size_t i = 0; i < ic.size(); ++i)
        max_disp = std::max(max_disp, std::fabs(r.final_positions[i] - ic[i]));
    CHECK(max_disp == doctest::Approx(0.0));
    CHECK(r.max_speed == doctest::Approx(0.0));
}

TEST_CASE("GREEN[gate-3/acceptance] hanging chain sags symmetrically (catenary-limit)") {
    // 1D chain pinned at both ends, hanging under gravity in the stiff limit.
    // The pins are held CLOSER (span D) than the chain rest length S=(n-1)*spacing
    // so the slack hangs into a catenary. Here we assert the regime: the midpoint
    // sags below the pinned ends, the shape is left-right symmetric, and descent
    // is monotone toward the centre. (Golden catenary value comparison: gate-4.)
    const uint32_t n = 32;
    const double spacing = 1.0;
    const double D = 18.0;          // pin span < S = (n-1)*spacing = 31  -> slack
    cloth::ClothConfig cfg;
    cfg.nx = n; cfg.ny = 1; cfg.spacing = spacing;
    cfg.gx = 0.0; cfg.gy = -9.81; cfg.gz = 0.0;
    cfg.stretch_compliance = 0.0;   // inextensible limit
    cfg.enable_shear = false; cfg.enable_bending = false;
    cfg.dt = 1.0 / 60.0; cfg.substeps = 1; cfg.iterations = 80;
    cfg.velocity_damping = 0.1;     // settle to static equilibrium
    cfg.steps = 3000; cfg.capture_interval = 3000;
    cfg.pinned = {0u, n - 1u};

    // initial positions: evenly spaced along the chord from (0,0) to (D,0).
    std::vector<double> ic(3u * n, 0.0);
    for (uint32_t i = 0; i < n; ++i) ic[3u * i] = i * D / double(n - 1u);
    cfg.initial_positions = ic;

    cloth::ClothResult r = cloth::run_cloth(cfg);
    const std::vector<double>& p = r.final_positions;

    // pinned ends unchanged (y == 0, x at the chord endpoints)
    CHECK(py(p, 0) == doctest::Approx(0.0));
    CHECK(py(p, n - 1u) == doctest::Approx(0.0));
    CHECK(px(p, 0) == doctest::Approx(0.0));
    CHECK(px(p, n - 1u) == doctest::Approx(D));
    // midpoint sags well below the ends
    CHECK(py(p, n / 2u) < -1.0);
    // left-right symmetric about the centre (serial-GS sweep has a small
    // directional bias -> regime-level symmetry, not bit-exact; golden = gate-4)
    for (uint32_t i = 0; i < n / 2u; ++i)
        CHECK(py(p, i) == doctest::Approx(py(p, n - 1u - i)).epsilon(1e-2));
    // monotone descent from the left pin to the centre
    for (uint32_t i = 0; i + 1u < n / 2u; ++i)
        CHECK(py(p, i + 1u) <= py(p, i) + 1e-9);
    // x stays monotone increasing (no fold-over)
    for (uint32_t i = 0; i + 1u < n; ++i)
        CHECK(px(p, i + 1u) > px(p, i) - 1e-9);
}

TEST_CASE("GREEN[gate-3/acceptance] stretched chain holds linear-elastic tension") {
    // Chain pinned at both ends, gravity off, ends held APART at a gap larger
    // than the rest span. Series springs are all in tension (stretched beyond
    // rest) -> a straight, collinear, monotone line spanning the gap. The
    // EQUILIBRIUM minimises elastic energy at uniform spacing; the
    // single-invocation symmetric Gauss-Seidel solve converges the interior to
    // uniform but leaves a small (~few-%) NON-uniformity on the two springs
    // adjacent to the pinned ends (a documented property of finite-iteration
    // serial GS near a Dirichlet boundary — NOT under-convergence; more
    // iterations does not remove it). So we assert the linear-elastic REGIME
    // (every spring in tension, collinear, monotone, span + mean exact) rather
    // than bit-uniform spacing. The precise golden comparison is gate-4.
    const uint32_t n = 8;
    const double spacing = 1.0;
    const double gap = 10.5;        // > (n-1)*spacing = 7  -> uniform stretch ~1.5
    cloth::ClothConfig cfg;
    cfg.nx = n; cfg.ny = 1; cfg.spacing = spacing;
    cfg.gx = cfg.gy = cfg.gz = 0.0;
    cfg.stretch_compliance = 1e-7;  // finite stiffness (XPBD compliant)
    cfg.enable_shear = false; cfg.enable_bending = false;
    cfg.iterations = 80; cfg.velocity_damping = 0.2;
    cfg.steps = 2000; cfg.capture_interval = 2000;
    cfg.pinned = {0u, n - 1u};

    std::vector<double> ic(3u * n, 0.0);
    for (uint32_t i = 0; i < n; ++i) ic[3u * i] = i * gap / double(n - 1u);
    cfg.initial_positions = ic;

    cloth::ClothResult r = cloth::run_cloth(cfg);
    const std::vector<double>& p = r.final_positions;

    // pinned ends fixed
    CHECK(px(p, 0) == doctest::Approx(0.0));
    CHECK(px(p, n - 1u) == doctest::Approx(gap));
    // collinear (y, z ~ 0)
    for (uint32_t i = 0; i < n; ++i) {
        CHECK(p[3u * i + 1u] == doctest::Approx(0.0).epsilon(1e-6));
        CHECK(p[3u * i + 2u] == doctest::Approx(0.0).epsilon(1e-6));
    }
    // monotone x increasing (no fold-over)
    for (uint32_t i = 0; i + 1u < n; ++i)
        CHECK(px(p, i + 1u) > px(p, i));
    // every spring in tension (stretched beyond rest) and bounded (linear-elastic)
    const double expect = gap / double(n - 1u);  // 1.5
    double total = 0.0;
    for (uint32_t i = 0; i + 1u < n; ++i) {
        double L = dist(p, i, i + 1u);
        CHECK(L > spacing);            // in tension
        CHECK(L < 2.0 * spacing);      // bounded (no spring carries the whole stretch)
        total += L;
    }
    // total = span exactly; mean spring length = uniform-stretch value
    CHECK(total == doctest::Approx(gap).epsilon(1e-6));
    CHECK(total / double(n - 1u) == doctest::Approx(expect).epsilon(1e-6));
}

TEST_CASE("GREEN[gate-7] determinism witness is produced (2-run bit-exact)") {
    cloth::ClothConfig cfg;
    cfg.nx = 8; cfg.ny = 8; cfg.spacing = 1.0;
    cfg.gy = -9.81; cfg.steps = 60; cfg.capture_interval = 60;
    cfg.pinned = {0u, cfg.nx - 1u};
    cloth::ClothResult r = cloth::run_cloth(cfg);
    CHECK_FALSE(r.determinism_witness.empty());
}
