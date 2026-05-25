// Phase 1 Stage 1 — IC-3 (charter § 3.3).
//
// Determinism Config for Stack C binaries. Mirrors IC-4 (Python).

#pragma once

#include <cstdint>
#include <functional>
#include <stdexcept>
#include <string>
#include <vector>

namespace bit_physics::common_cpp::determinism {

struct Config {
    bool deterministic = false;
    uint64_t seed = 0;
};

// Parse `--deterministic` and `--seed N` out of argv (mutating argc to
// remove the consumed entries so a caller's downstream parser sees a
// trimmed argv). Returns the resolved Config.
Config from_args(int& argc, char** argv);

// ---------------------------------------------------------------------------
// Determinism socket (Stage 1b; charter §2 row "Stage 1b" + §3 C-2).
//
// C++ analog of common-warp's §1.9.1 determinism surface (set_seed / get_seed /
// deterministic_context / assert_deterministic_run). The §1.9.1-cpp socket is
// reconciled to its verbatim contract at Stage 1c (charter §2); this Stage-1b
// surface provides the RAII context + the 2-run bit-exact harness.
// ---------------------------------------------------------------------------

// Thrown by assert_deterministic_run when runs diverge beyond tolerance — the
// D4 bit-exact-same-hw contract is broken (do NOT relax; investigate).
class DeterminismError : public std::runtime_error {
public:
    explicit DeterminismError(const std::string& message)
        : std::runtime_error(message) {}
};

// Process-global canonical seed (mirrors common-warp's module-global _seed).
void set_seed(uint64_t seed);
uint64_t get_seed();        // throws std::runtime_error if unset
bool is_deterministic();    // true inside a DeterministicContext

// RAII deterministic context (analog of common-warp deterministic_context()).
// On construction sets the canonical seed + the deterministic flag; on
// destruction restores the prior seed/flag so the block does not leak state.
// The lavapipe thread lever (LP_NUM_THREADS=0, D4) is an environment setting
// read at driver init (S0-CPPB3 showed element-wise kernels are thread-count
// invariant), so it is the caller's environment responsibility, not pinned here.
class DeterministicContext {
public:
    explicit DeterministicContext(uint64_t seed);
    ~DeterministicContext();

    DeterministicContext(const DeterministicContext&) = delete;
    DeterministicContext& operator=(const DeterministicContext&) = delete;
    DeterministicContext(DeterministicContext&&) = delete;
    DeterministicContext& operator=(DeterministicContext&&) = delete;

    uint64_t seed() const { return seed_; }

private:
    bool prior_deterministic_;
    bool prior_seed_set_;
    uint64_t prior_seed_;
    uint64_t seed_;
};

// Run `sim_fn()` `runs` times and assert determinism (charter C-2; the D4
// bit-exact-same-hw CPU contract on lavapipe). `sim_fn` returns the bytes to
// compare (e.g. a compute-dispatch readback buffer).
//
//   tolerance == 0.0 (default, bit-exact): sha256 each run's bytes; all `runs`
//     digests must be identical. Returns the (shared) sha256 hex — the
//     determinism witness.
//   tolerance  > 0.0 (epsilon-bounded f32 posture): each run is reinterpreted
//     as a contiguous f32 array and compared element-wise against run 0; the
//     max abs difference must not exceed `tolerance`. Returns run 0's digest.
//
// Throws DeterminismError on divergence; std::invalid_argument for runs < 2,
// tolerance < 0.0, or (tolerance > 0) byte lengths not divisible by sizeof(float)
// or unequal across runs.
std::string assert_deterministic_run(
    const std::function<std::vector<unsigned char>()>& sim_fn, int runs = 2,
    double tolerance = 0.0);

}  // namespace bit_physics::common_cpp::determinism
