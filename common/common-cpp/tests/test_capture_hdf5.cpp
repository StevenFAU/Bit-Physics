// C-1 gate — HDF5 capture-v1 writer/reader (Stage 1b).
//
// Charter docs/phases/sub-phase-common-cpp-bootstrap.md § 3 C-1:
//   "HighFive writer emits the capture-v1 layout (/steps/{N}/state|diagnostics,
//    /metadata attrs, JSON sidecar sort_keys); round-trips. | write -> read-back
//    -> field+manifest equality."
//
// C-1's bar is the C++-internal round-trip. Cross-language Python-reads-C++
// parse-equality is C-6 (Stage 1c), NOT this test.

#include <doctest/doctest.h>

#include <cstring>
#include <filesystem>
#include <vector>

#include "bit_physics/common/capture.hpp"

namespace cap = bit_physics::common_cpp::capture;

namespace {

cap::FieldData make_f32_field(std::vector<float> values, std::vector<int64_t> shape) {
    cap::FieldData fd;
    fd.dtype = "f32";
    fd.shape = std::move(shape);
    fd.bytes.resize(values.size() * sizeof(float));
    std::memcpy(fd.bytes.data(), values.data(), fd.bytes.size());
    return fd;
}

cap::Manifest make_manifest() {
    cap::Manifest m;
    m.schema_version = "1.0.0";
    m.sim = {"gray-scott", "reaction-diffusion", "common-cpp"};
    m.stack = {"common-cpp", "0.0.0", "stage-1b"};
    m.config.tier = "reference";
    m.config.dims = {2, 2};
    m.config.dtype = "f32";
    m.config.seed = 42;
    m.run.step_count = 2;
    m.run.capture_interval = 1;
    m.determinism.claimed = "bit-exact-same-hw";
    return m;
}

}  // namespace

TEST_CASE("C-1 HDF5 capture-v1 round-trips fields, diagnostics, and manifest") {
    auto dir = std::filesystem::temp_directory_path() / "bitphysics_hdf5_c1";
    std::filesystem::create_directories(dir);
    auto manifest_path = dir / "gray-scott-2x2.json";

    cap::Manifest m = make_manifest();
    m.payload.path = "gray-scott-2x2.h5";

    // Two steps; two f32 fields ("u","v") shape [2,2] + a diagnostic.
    cap::StepData s0;
    s0.fields.emplace("u", make_f32_field({0.1f, 0.2f, 0.3f, 0.4f}, {2, 2}));
    s0.fields.emplace("v", make_f32_field({1.0f, 0.0f, 0.0f, 1.0f}, {2, 2}));
    s0.diagnostics["mass"] = 1.0;
    cap::StepData s1;
    s1.fields.emplace("u", make_f32_field({0.11f, 0.22f, 0.33f, 0.44f}, {2, 2}));
    s1.fields.emplace("v", make_f32_field({0.9f, 0.1f, 0.1f, 0.9f}, {2, 2}));
    s1.diagnostics["mass"] = 0.998;

    {
        cap::Hdf5Writer w(manifest_path, m);
        w.write_step(0, s0);
        w.write_step(1, s1);
        w.finalize();
    }

    REQUIRE(std::filesystem::exists(dir / "gray-scott-2x2.h5"));
    REQUIRE(std::filesystem::exists(manifest_path));

    cap::Hdf5Reader r(manifest_path);

    // Manifest equality (subset that matters).
    CHECK(r.manifest().schema_version == "1.0.0");
    CHECK(r.manifest().sim.name == "gray-scott");
    CHECK(r.manifest().config.seed == 42u);
    CHECK(r.manifest().config.dtype == "f32");
    CHECK(r.manifest().payload.path == "gray-scott-2x2.h5");
    CHECK(r.manifest().payload.checksum.rfind("sha256:", 0) == 0);  // checksum present

    // /metadata attrs (capture-v1 layout).
    CHECK(r.metadata().at("schema_version") == "1.0.0");
    CHECK(r.metadata().at("sim_name") == "gray-scott");
    CHECK(r.metadata().at("sim_category") == "reaction-diffusion");
    CHECK(r.metadata().at("stack_name") == "common-cpp");
    CHECK(r.metadata().at("seed") == "42");

    // Step numbers + field/diagnostic round-trip (byte-equal).
    auto steps = r.step_numbers();
    REQUIRE(steps.size() == 2);
    CHECK(steps[0] == 0);
    CHECK(steps[1] == 1);

    cap::StepData got0 = r.read_step(0);
    REQUIRE(got0.fields.count("u") == 1);
    REQUIRE(got0.fields.count("v") == 1);
    CHECK(got0.fields.at("u").dtype == "f32");
    CHECK(got0.fields.at("u").shape == std::vector<int64_t>{2, 2});
    CHECK(got0.fields.at("u").bytes == s0.fields.at("u").bytes);
    CHECK(got0.fields.at("v").bytes == s0.fields.at("v").bytes);
    CHECK(got0.diagnostics.at("mass") == doctest::Approx(1.0));

    cap::StepData got1 = r.read_step(1);
    CHECK(got1.fields.at("u").bytes == s1.fields.at("u").bytes);
    CHECK(got1.diagnostics.at("mass") == doctest::Approx(0.998));
}
