// gate-14 precursor (Stage 1b GREEN; O-2 ckpt 2): the Stack-C canonical
// trajectory (Vulkan/C++ f64 NoContraction) is byte-identical to the Phase-1
// NumPy f64 reference at every captured frame — shape (a) BIT-EXACT, grounded in
// the refresh-probe step-1 measurement of 0.0. The formal gate-14 (compare_captures
// + un-skip + fixture) is Stage 1c; this asserts the underlying byte-equality.

#include <doctest/doctest.h>

#include <cmath>
#include <cstring>
#include <vector>

#include "bit_physics/common/capture.hpp"
#include "bit_physics/reaction_diffusion_2d_stack_c/gray_scott.hpp"

namespace rd = bit_physics::reaction_diffusion_2d_stack_c;
namespace cap = bit_physics::common_cpp::capture;

#ifndef RD2D_REF_MANIFEST
#error "RD2D_REF_MANIFEST must be defined"
#endif

namespace {
std::vector<double> as_f64(const cap::FieldData& f) {
    std::vector<double> v(f.bytes.size() / sizeof(double));
    std::memcpy(v.data(), f.bytes.data(), f.bytes.size());
    return v;
}
double max_abs_err(const std::vector<double>& a, const std::vector<double>& b) {
    double m = 0.0;
    for (size_t i = 0; i < a.size(); ++i) m = std::max(m, std::fabs(a[i] - b[i]));
    return m;
}
}  // namespace

TEST_CASE("GREEN[gate-14 precursor] Stack-C == NumPy reference byte-for-byte") {
    rd::GrayScottConfig cfg;
    rd::Fields ic = rd::load_reference_ic(RD2D_REF_MANIFEST);
    rd::GrayScottResult r = rd::run_gray_scott(cfg, ic);

    cap::Hdf5Reader ref(RD2D_REF_MANIFEST);
    double worst = 0.0;
    for (size_t f = 0; f < r.captured_steps.size(); ++f) {
        cap::StepData rs = ref.read_step(r.captured_steps[f]);
        double eu = max_abs_err(r.captured_fields[f].u, as_f64(rs.fields.at("U")));
        double ev = max_abs_err(r.captured_fields[f].v, as_f64(rs.fields.at("V")));
        worst = std::max({worst, eu, ev});
    }
    MESSAGE("gate-14 precursor max_abs_err across 11 frames = ", worst);
    CHECK(worst == 0.0);  // shape (a) BIT-EXACT
}
