// SHA-256 over raw bytes (FIPS 180-4) — common-cpp utility.
//
// Sub-phase: sub-phase-common-cpp-bootstrap, Stage 1b. Used by the determinism
// socket (assert_deterministic_run digest witness) and the capture-v1 writer's
// payload checksum. Self-contained (no crypto-library dependency) so the
// Stack-C determinism baseline-digest method (sha256 of the raw readback buffer)
// is reproducible everywhere common-cpp builds.

#pragma once

#include <cstddef>
#include <string>
#include <vector>

namespace bit_physics::common_cpp::hash {

// Lower-case hex sha256 of the `len` bytes at `data`.
std::string sha256_hex(const void* data, std::size_t len);

inline std::string sha256_hex(const std::vector<unsigned char>& bytes) {
    return sha256_hex(bytes.data(), bytes.size());
}

}  // namespace bit_physics::common_cpp::hash
