// Phase 1 Stage 1 — IC-1 (charter § 3.1).
//
// Capture-format I/O for Stack C sims. JSON manifest + per-step raw
// binary payload files on disk.
//
// SHIFT from charter — payload format: HDF5 (charter, mirrors
// common-ts) is deferred to a subsequent implementation phase that
// can vendor libhdf5. Phase 1 Stage 1 ships a raw-binary payload
// (.bin per field per step) so the IC-1 surface is exercisable end-
// to-end in CI without HDF5. Cross-stack equivalence with common-ts
// is therefore declared in the Stage 1 checkpoint as SHIFTED-NEEDS-
// HDF5-VENDOR. See common/common-cpp/_staging/deps.md for the deps
// budget and docs/common/cpp.md for the full rationale.

#pragma once

#include <cstdint>
#include <filesystem>
#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

#include <nlohmann/json.hpp>

namespace bit_physics::common_cpp::capture {

struct SimMeta {
    std::string name;
    std::string category;
    std::string variant;
};
struct StackMeta {
    std::string name;
    std::string version;
    std::string build_id;
};
struct ConfigMeta {
    std::string tier;
    std::vector<int64_t> dims;
    std::string dtype;
    uint64_t seed = 0;
    nlohmann::json params = nlohmann::json::object();
};
struct RunMeta {
    uint64_t step_count = 0;
    uint64_t capture_interval = 0;
    double wall_clock_seconds = 0.0;
    std::string start_utc;
};
struct PayloadMeta {
    std::string format = "raw-binary-v1";
    std::filesystem::path path;
    std::string checksum;
};
struct DeterminismMeta {
    std::string claimed;
    bool atomic_ops = false;
    bool subgroup_ops = false;
};

struct Manifest {
    std::string schema_version = "1.0.0";
    SimMeta sim;
    StackMeta stack;
    ConfigMeta config;
    RunMeta run;
    PayloadMeta payload;
    DeterminismMeta determinism;
};

struct FieldData {
    std::vector<uint8_t> bytes;
    std::string dtype;                  // "f32" | "f64" | "i32" | ...
    std::vector<int64_t> shape;
};
struct StepData {
    std::unordered_map<std::string, FieldData> fields;
    std::unordered_map<std::string, double> diagnostics;
};

class Reader {
public:
    explicit Reader(const std::filesystem::path& manifest_path);
    ~Reader();

    Reader(const Reader&) = delete;
    Reader& operator=(const Reader&) = delete;
    Reader(Reader&&) noexcept;
    Reader& operator=(Reader&&) noexcept;

    const Manifest& manifest() const;
    std::size_t step_count() const;
    StepData read_step(std::size_t step_idx) const;

private:
    struct Impl;
    std::unique_ptr<Impl> impl_;
};

class Writer {
public:
    Writer(const std::filesystem::path& manifest_path, Manifest m);
    ~Writer();

    Writer(const Writer&) = delete;
    Writer& operator=(const Writer&) = delete;
    Writer(Writer&&) noexcept;
    Writer& operator=(Writer&&) noexcept;

    void write_step(std::size_t step_idx, const StepData& data);
    void finalize();

private:
    struct Impl;
    std::unique_ptr<Impl> impl_;
};

// Manifest <-> JSON (shared by the raw-binary and HDF5 writers/readers). The
// JSON sidecar uses nlohmann::json's default ordered-map (keys sorted), so
// dump(2) is the C++ analog of the testkit's json.dump(sort_keys=True, indent=2).
nlohmann::json manifest_to_json(const Manifest& m);
Manifest manifest_from_json(const nlohmann::json& j);

// ---------------------------------------------------------------------------
// HDF5 capture-v1 (Stage 1b; charter §2 row "Stage 1b" + §3 C-1).
//
// Replicates the testkit capture-v1 layout (tools/testkit/capture/writer.py):
//   <descriptor>.h5  — /steps/{N}/state/{field}, /steps/{N}/diagnostics/{check},
//                      /metadata attrs (schema_version, sim_name, sim_category,
//                      sim_variant, stack_name, seed).
//   <descriptor>.json — manifest sidecar (payload.path = .h5 name,
//                      payload.checksum = "sha256:" + file hash).
//
// C-1's bar (charter §3) is the C++-internal write -> read-back round-trip
// (field + manifest equality). Cross-language Python-reads-C++ parse-equality is
// C-6 (Stage 1c), NOT this stage.
// ---------------------------------------------------------------------------

class Hdf5Writer {
public:
    // `manifest_path` is the .json sidecar path; the .h5 payload path is
    // manifest.payload.path (resolved alongside) or derived from the stem.
    Hdf5Writer(const std::filesystem::path& manifest_path, Manifest m);
    ~Hdf5Writer();

    Hdf5Writer(const Hdf5Writer&) = delete;
    Hdf5Writer& operator=(const Hdf5Writer&) = delete;
    Hdf5Writer(Hdf5Writer&&) noexcept;
    Hdf5Writer& operator=(Hdf5Writer&&) noexcept;

    void write_step(std::size_t step_number, const StepData& data);
    // Writes the .h5 (capture-v1 layout) + the .json sidecar with checksum.
    void finalize();

private:
    struct Impl;
    std::unique_ptr<Impl> impl_;
};

class Hdf5Reader {
public:
    explicit Hdf5Reader(const std::filesystem::path& manifest_path);
    ~Hdf5Reader();

    Hdf5Reader(const Hdf5Reader&) = delete;
    Hdf5Reader& operator=(const Hdf5Reader&) = delete;
    Hdf5Reader(Hdf5Reader&&) noexcept;
    Hdf5Reader& operator=(Hdf5Reader&&) noexcept;

    const Manifest& manifest() const;
    // Metadata attrs read from the .h5 /metadata group (subset of the manifest).
    const std::unordered_map<std::string, std::string>& metadata() const;
    // Sorted step numbers present in /steps.
    std::vector<std::size_t> step_numbers() const;
    StepData read_step(std::size_t step_number) const;

private:
    struct Impl;
    std::unique_ptr<Impl> impl_;
};

}  // namespace bit_physics::common_cpp::capture
