// Test-only SHA-256 helper (NOT part of the common-cpp API).
//
// Retained as the Stage-1a C-3 evidence surface (cited in the Stage-1a
// checkpoint/evidence evidence_paths). Stage 1b moved the actual SHA-256 into
// the library (bit_physics::common_cpp::hash, used by the determinism socket's
// digest witness and the capture-v1 payload checksum); this header now delegates
// to it so there is a single implementation.

#pragma once

#include <cstddef>
#include <string>

#include "bit_physics/common/hash.hpp"

namespace bit_physics::common_cpp::test {

inline std::string sha256_hex(const void* data, std::size_t len) {
    return ::bit_physics::common_cpp::hash::sha256_hex(data, len);
}

}  // namespace bit_physics::common_cpp::test
