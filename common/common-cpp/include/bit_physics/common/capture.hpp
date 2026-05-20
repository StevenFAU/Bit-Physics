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

}  // namespace bit_physics::common_cpp::capture
