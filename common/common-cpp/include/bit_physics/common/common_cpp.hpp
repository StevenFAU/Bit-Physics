// common-cpp — Stack-C (C++ / Vulkan) public API umbrella (§1.9.1-cpp socket).
//
// Sub-phase: sub-phase-common-cpp-bootstrap, Stage 1c. This is the C++ analog of
// common-warp's `common_warp/__init__.py` §1.9.1 re-export contract: the single
// header a downstream Stack-C sim port includes to consume the matured
// common-cpp surface. Reconciled to a verbatim contract at Stage 1c BEFORE the
// first consumer (RD-2D-Stack-C, D11) — conventions §L.5 socket-reconciliation
// Option B. The surface is a SOCKET: Stack-C ports code against these headers;
// a missing surface is a charter §1.9.1 amendment, not a unilateral extension.
//
// Public subsystems (see docs/common/cpp.md §3 for the full contract):
//   1. Vulkan compute substrate  — vkcompute::{ComputeContext, StorageBuffer,
//                                   ComputePipeline, dispatch} + FloatControls
//   2. Determinism socket        — determinism::{DeterministicContext,
//                                   assert_deterministic_run, set_seed, get_seed,
//                                   is_deterministic, Config, from_args}
//   3. Capture I/O (HDF5 + raw)  — capture::{Hdf5Writer, Hdf5Reader, Writer,
//                                   Reader, Manifest, StepData, FieldData}
//   4. Hashing                   — hash::sha256_hex (determinism witness / checksum)

#pragma once

#include "bit_physics/common/capture.hpp"
#include "bit_physics/common/determinism.hpp"
#include "bit_physics/common/hash.hpp"
#include "bit_physics/common/vulkan_compute.hpp"
