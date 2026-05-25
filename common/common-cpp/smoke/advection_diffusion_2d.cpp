// 2D advection-diffusion Vulkan-compute smoke (Stage 1c; gate C-4). See
// advection_diffusion_2d.hpp for the contract.

#include "advection_diffusion_2d.hpp"

#include <algorithm>
#include <cmath>
#include <cstring>
#include <ctime>
#include <limits>
#include <memory>

#include "bit_physics/common/capture.hpp"
#include "bit_physics/common/determinism.hpp"
#include "bit_physics/common/vulkan_compute.hpp"
#include "advection_diffusion_2d.spv.h"  // const uint32_t kAdvectionDiffusion2dSpv[]

namespace bit_physics::common_cpp::smoke {

namespace vk = bit_physics::common_cpp::vkcompute;
namespace det = bit_physics::common_cpp::determinism;
namespace cap = bit_physics::common_cpp::capture;

namespace {

// Push-constant block — MUST match shaders/advection_diffusion_2d.comp Params.
struct PushParams {
    uint32_t nx;
    uint32_t ny;
    float dt;
    float dx;
    float diff;
    float vx;
    float vy;
};

// Gaussian blob centred in the unit domain (deterministic initial condition).
std::vector<float> initial_condition(uint32_t nx, uint32_t ny, float dx) {
    std::vector<float> u(static_cast<size_t>(nx) * ny);
    const float sigma = 0.08f;
    for (uint32_t y = 0; y < ny; ++y) {
        for (uint32_t x = 0; x < nx; ++x) {
            float px = (static_cast<float>(x) + 0.5f) * dx;
            float py = (static_cast<float>(y) + 0.5f) * dx;
            float d2 = (px - 0.5f) * (px - 0.5f) + (py - 0.5f) * (py - 0.5f);
            u[static_cast<size_t>(y) * nx + x] = std::exp(-d2 / (2.0f * sigma * sigma));
        }
    }
    return u;
}

float max_abs(const std::vector<float>& u) {
    float m = 0.0f;
    for (float v : u) m = std::max(m, std::fabs(v));
    return m;
}

std::string utc_now() {
    std::time_t now = std::time(nullptr);
    std::tm tm_buf{};
    gmtime_r(&now, &tm_buf);
    char buf[32];
    std::strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &tm_buf);
    return buf;
}

}  // namespace

AdvDiffResult run_advection_diffusion(const AdvDiffConfig& cfg,
                                      const std::filesystem::path* capture_manifest) {
    det::DeterministicContext dctx(cfg.seed);

    vk::ComputeContext ctx = vk::ComputeContext::create();
    ctx.assert_deterministic_float_controls();  // RTE + signed-zero/inf/nan preserve

    const size_t n = static_cast<size_t>(cfg.nx) * cfg.ny;
    const VkDeviceSize bytes = static_cast<VkDeviceSize>(n) * sizeof(float);

    vk::StorageBuffer buf_a(ctx, bytes);
    vk::StorageBuffer buf_b(ctx, bytes);
    std::vector<float> u0 = initial_condition(cfg.nx, cfg.ny, cfg.dx);
    buf_a.upload(u0.data(), u0.size() * sizeof(float));
    buf_b.fill_zero();

    vk::ComputePipeline::Options opts;
    opts.spirv = kAdvectionDiffusion2dSpv;
    opts.spirv_word_count = sizeof(kAdvectionDiffusion2dSpv) / sizeof(uint32_t);
    opts.binding_count = 2;
    opts.push_constant_bytes = sizeof(PushParams);
    vk::ComputePipeline pipe(ctx, opts);

    PushParams pc{cfg.nx, cfg.ny, cfg.dt, cfg.dx, cfg.diff, cfg.vx, cfg.vy};
    const uint32_t gx = (cfg.nx + 7) / 8;
    const uint32_t gy = (cfg.ny + 7) / 8;

    AdvDiffResult result;
    result.initial_max = max_abs(u0);

    // Optional capture-v1 writer.
    cap::Manifest m;
    m.schema_version = "1.0.0";
    m.sim = {"advection-diffusion-2d", "smoke", "common-cpp"};
    m.stack = {"common-cpp", "0.0.0", "stage-1c"};
    m.config.tier = "reference";
    m.config.dims = {static_cast<int64_t>(cfg.ny), static_cast<int64_t>(cfg.nx)};
    m.config.dtype = "f32";
    m.config.seed = cfg.seed;
    m.run.step_count = cfg.steps;
    m.run.capture_interval = cfg.capture_interval;
    m.run.start_utc = utc_now();
    m.determinism.claimed = "bit-exact-same-hw";
    std::unique_ptr<cap::Hdf5Writer> writer;
    if (capture_manifest != nullptr) {
        m.payload.path = capture_manifest->stem().string() + ".h5";
        writer = std::make_unique<cap::Hdf5Writer>(*capture_manifest, m);
    }

    std::vector<float> host(n);
    auto capture_step = [&](uint32_t step, const vk::StorageBuffer& src) {
        src.download(host.data(), host.size() * sizeof(float));
        float mx = max_abs(host);
        result.captured_steps.push_back(step);
        result.max_field_trajectory.push_back(mx);
        if (writer) {
            cap::StepData sd;
            cap::FieldData fd;
            fd.dtype = "f32";
            fd.shape = {static_cast<int64_t>(cfg.ny), static_cast<int64_t>(cfg.nx)};
            fd.bytes.resize(host.size() * sizeof(float));
            std::memcpy(fd.bytes.data(), host.data(), fd.bytes.size());
            sd.fields.emplace("u", std::move(fd));
            sd.diagnostics["max_field"] = static_cast<double>(mx);
            writer->write_step(step, sd);
        }
    };

    // Ping-pong: `cur` holds the current state; dispatch reads cur -> other.
    vk::StorageBuffer* cur = &buf_a;
    vk::StorageBuffer* other = &buf_b;
    capture_step(0, *cur);
    for (uint32_t step = 1; step <= cfg.steps; ++step) {
        pipe.bind(0, *cur);
        pipe.bind(1, *other);
        vk::dispatch(ctx, pipe, gx, gy, 1, &pc);
        std::swap(cur, other);
        if (step % cfg.capture_interval == 0) capture_step(step, *cur);
    }

    // Final field = determinism witness.
    result.final_field.resize(bytes);
    cur->download(result.final_field.data(), result.final_field.size());
    result.final_max = result.max_field_trajectory.empty()
                           ? 0.0f
                           : result.max_field_trajectory.back();

    if (writer) writer->finalize();

    // §L.4 bounded/stable characterisation.
    bool bounded = true;
    bool monotone = true;
    const float eps = 1e-5f;
    float prev = std::numeric_limits<float>::infinity();
    for (float mx : result.max_field_trajectory) {
        if (!std::isfinite(mx) || mx > result.initial_max + eps) bounded = false;
        if (mx > prev + eps) monotone = false;
        prev = mx;
    }
    result.bounded = bounded;
    result.monotone_nonincreasing = monotone;
    return result;
}

}  // namespace bit_physics::common_cpp::smoke
