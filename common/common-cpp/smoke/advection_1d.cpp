// 1D advection smoke sim (charter § 7.1 deliverable E, common-cpp).
//
// Upwind on a periodic 64-cell grid; 100 steps; capture interval 10.
// Mirrors common/common-py/smoke/advection_1d.py.

#include "bit_physics/common/capture.hpp"
#include "bit_physics/common/determinism.hpp"

#include <chrono>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <ctime>
#include <filesystem>
#include <vector>

namespace cap = bit_physics::common_cpp::capture;
namespace det = bit_physics::common_cpp::determinism;

constexpr int kGridN = 64;
constexpr int kStepCount = 100;
constexpr int kCaptureInterval = 10;
constexpr double kDx = 1.0 / kGridN;
constexpr double kC = 1.0;
constexpr double kDt = 0.5 * kDx / kC;  // CFL = 0.5

static std::vector<double> initial_condition() {
    std::vector<double> u(kGridN);
    for (int i = 0; i < kGridN; ++i) {
        double x = (i + 0.5) * kDx;
        double d = (x - 0.5);
        u[i] = std::exp(-d * d / (2.0 * 0.05 * 0.05));
    }
    return u;
}

static void step_upwind(std::vector<double>& u) {
    std::vector<double> next(kGridN);
    for (int i = 0; i < kGridN; ++i) {
        int j = (i - 1 + kGridN) % kGridN;
        next[i] = u[i] - kC * kDt / kDx * (u[i] - u[j]);
    }
    u = std::move(next);
}

static std::string utc_now() {
    std::time_t now = std::time(nullptr);
    char buf[64];
    std::tm tm_buf{};
    gmtime_r(&now, &tm_buf);
    std::strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &tm_buf);
    return buf;
}

int main(int argc, char** argv) {
    det::Config dcfg = det::from_args(argc, argv);
    std::filesystem::path out_dir = "captures/common-cpp-smoke";
    if (argc > 1) {
        out_dir = argv[1];
    }
    std::filesystem::create_directories(out_dir);

    std::string descriptor = "advection-1d-seed" + std::to_string(dcfg.seed) +
                             "-step" + std::to_string(kStepCount);
    auto manifest_path = out_dir / (descriptor + ".json");

    cap::Manifest m;
    m.schema_version = "1.0.0";
    m.sim = {"advection-1d-smoke", "smoke", "common-cpp"};
    m.stack = {"common-cpp", "0.0.0", "phase1-stage1"};
    m.config.tier = "reference";
    m.config.dims = {kGridN};
    m.config.dtype = "f64";
    m.config.seed = dcfg.seed;
    m.config.params["c"] = kC;
    m.config.params["dt"] = kDt;
    m.config.params["dx"] = kDx;
    m.run.step_count = kStepCount;
    m.run.capture_interval = kCaptureInterval;
    m.run.start_utc = utc_now();
    m.payload.format = "raw-binary-v1";
    m.payload.path = descriptor + ".bin";
    m.determinism.claimed = dcfg.deterministic ? "bit-exact-same-hw" : "epsilon";

    cap::Writer writer(manifest_path, m);
    auto u = initial_condition();
    auto t0 = std::chrono::steady_clock::now();
    for (int step = 0; step <= kStepCount; ++step) {
        if (step % kCaptureInterval == 0) {
            cap::StepData sd;
            cap::FieldData fd;
            fd.dtype = "f64";
            fd.shape = {kGridN};
            fd.bytes.resize(kGridN * sizeof(double));
            std::memcpy(fd.bytes.data(), u.data(), fd.bytes.size());
            sd.fields.emplace("u", std::move(fd));
            writer.write_step(static_cast<std::size_t>(step), sd);
        }
        step_upwind(u);
    }
    auto t1 = std::chrono::steady_clock::now();
    (void)t0;
    (void)t1;
    writer.finalize();
    std::printf("wrote %s\n", manifest_path.string().c_str());
    return 0;
}
