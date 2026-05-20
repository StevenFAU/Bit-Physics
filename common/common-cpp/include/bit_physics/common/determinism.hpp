// Phase 1 Stage 1 — IC-3 (charter § 3.3).
//
// Determinism Config for Stack C binaries. Mirrors IC-4 (Python).

#pragma once

#include <cstdint>

namespace bit_physics::common_cpp::determinism {

struct Config {
    bool deterministic = false;
    uint64_t seed = 0;
};

// Parse `--deterministic` and `--seed N` out of argv (mutating argc to
// remove the consumed entries so a caller's downstream parser sees a
// trimmed argv). Returns the resolved Config.
Config from_args(int& argc, char** argv);

}  // namespace bit_physics::common_cpp::determinism
