// IC-1 round-trip tests.

#include "bit_physics/common/capture.hpp"

#include <cstring>
#include <doctest/doctest.h>
#include <filesystem>
#include <stdexcept>
#include <vector>

namespace cap = bit_physics::common_cpp::capture;

static std::filesystem::path scratch_dir(const char* tag) {
    auto p = std::filesystem::temp_directory_path() /
             (std::string("bit-physics-cpp-test-") + tag);
    std::filesystem::remove_all(p);
    std::filesystem::create_directories(p);
    return p;
}

static cap::Manifest make_manifest(const std::string& descriptor) {
    cap::Manifest m;
    m.sim = {"ic1-roundtrip", "test", "reference"};
    m.stack = {"common-cpp", "0.0.0", "ic1-test"};
    m.config.tier = "reference";
    m.config.dims = {8};
    m.config.dtype = "f64";
    m.config.seed = 42;
    m.run.step_count = 20;
    m.run.capture_interval = 10;
    m.run.wall_clock_seconds = 0.0;
    m.run.start_utc = "2026-05-20T00:00:00Z";
    m.payload.format = "raw-binary-v1";
    m.payload.path = descriptor + ".bin";
    m.determinism.claimed = "bit-exact-same-hw";
    return m;
}

TEST_CASE("IC-1 capture round-trip preserves fields and diagnostics") {
    auto scratch = scratch_dir("rt");
    auto manifest_path = scratch / "rt.json";

    cap::Writer writer(manifest_path, make_manifest("rt"));

    cap::FieldData fd_u;
    fd_u.dtype = "f64";
    fd_u.shape = {8};
    fd_u.bytes.resize(8 * sizeof(double));
    double payload_u[8] = {0, 1, 2, 3, 4, 5, 6, 7};
    std::memcpy(fd_u.bytes.data(), payload_u, sizeof(payload_u));

    cap::FieldData fd_v;
    fd_v.dtype = "f64";
    fd_v.shape = {8};
    fd_v.bytes.resize(8 * sizeof(double));
    double payload_v[8] = {-1, -2, -3, -4, -5, -6, -7, -8};
    std::memcpy(fd_v.bytes.data(), payload_v, sizeof(payload_v));

    cap::StepData step0;
    step0.fields.emplace("u", fd_u);
    step0.fields.emplace("v", fd_v);
    step0.diagnostics["l2"] = 1.25;
    writer.write_step(0, step0);

    cap::StepData step1;
    step1.fields.emplace("u", fd_u);  // same data again
    writer.write_step(10, step1);
    writer.finalize();

    cap::Reader reader(manifest_path);
    CHECK(reader.step_count() == 2);
    CHECK(reader.manifest().sim.name == "ic1-roundtrip");
    CHECK(reader.manifest().config.seed == 42u);

    auto rt0 = reader.read_step(0);
    REQUIRE(rt0.fields.contains("u"));
    REQUIRE(rt0.fields.contains("v"));
    CHECK(rt0.fields.at("u").bytes.size() == 8 * sizeof(double));
    double observed_u[8];
    std::memcpy(observed_u, rt0.fields.at("u").bytes.data(), sizeof(observed_u));
    for (int i = 0; i < 8; ++i) {
        CHECK(observed_u[i] == doctest::Approx(payload_u[i]));
    }
    CHECK(rt0.diagnostics.at("l2") == doctest::Approx(1.25));

    auto rt1 = reader.read_step(1);
    CHECK(rt1.fields.contains("u"));
    CHECK(rt1.diagnostics.empty());
}

TEST_CASE("IC-1 Reader::read_step out-of-range throws") {
    auto scratch = scratch_dir("oob");
    auto manifest_path = scratch / "oob.json";
    cap::Writer writer(manifest_path, make_manifest("oob"));
    cap::FieldData fd;
    fd.dtype = "f64";
    fd.shape = {4};
    fd.bytes.resize(4 * sizeof(double));
    cap::StepData s0;
    s0.fields.emplace("u", fd);
    writer.write_step(0, s0);
    writer.finalize();

    cap::Reader reader(manifest_path);
    CHECK_THROWS(reader.read_step(99));
}

TEST_CASE("IC-1 Writer::finalize is idempotent and rejects post-finalize writes") {
    auto scratch = scratch_dir("idem");
    auto manifest_path = scratch / "idem.json";
    cap::Writer writer(manifest_path, make_manifest("idem"));
    cap::FieldData fd;
    fd.dtype = "f64";
    fd.shape = {2};
    fd.bytes.resize(2 * sizeof(double));
    cap::StepData s;
    s.fields.emplace("u", fd);
    writer.write_step(0, s);
    writer.finalize();
    writer.finalize();  // second call returns silently
    CHECK_THROWS(writer.write_step(10, s));
}
