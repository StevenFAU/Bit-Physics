// IC-3 implementation (charter § 3.3).

#include "bit_physics/common/determinism.hpp"

#include <cmath>
#include <cstring>
#include <optional>
#include <set>
#include <stdexcept>
#include <string>

#include "bit_physics/common/hash.hpp"

namespace bit_physics::common_cpp::determinism {

namespace {

void erase_at(int& argc, char** argv, int index) {
    for (int i = index; i + 1 < argc; ++i) {
        argv[i] = argv[i + 1];
    }
    argv[argc - 1] = nullptr;
    --argc;
}

}  // namespace

Config from_args(int& argc, char** argv) {
    Config config;
    for (int i = 1; i < argc;) {
        if (std::strcmp(argv[i], "--deterministic") == 0) {
            config.deterministic = true;
            erase_at(argc, argv, i);
        } else if (std::strcmp(argv[i], "--seed") == 0) {
            if (i + 1 >= argc) {
                throw std::invalid_argument("--seed requires a value");
            }
            config.seed = std::stoull(argv[i + 1]);
            erase_at(argc, argv, i);
            erase_at(argc, argv, i);  // remove the value
        } else {
            ++i;
        }
    }
    return config;
}

// ---------------------------------------------------------------------------
// Determinism socket
// ---------------------------------------------------------------------------

namespace {
std::optional<uint64_t> g_seed;
bool g_deterministic = false;
}  // namespace

void set_seed(uint64_t seed) { g_seed = seed; }

uint64_t get_seed() {
    if (!g_seed.has_value()) {
        throw std::runtime_error(
            "determinism seed is unset; construct a DeterministicContext or call set_seed()");
    }
    return *g_seed;
}

bool is_deterministic() { return g_deterministic; }

DeterministicContext::DeterministicContext(uint64_t seed)
    : prior_deterministic_(g_deterministic),
      prior_seed_set_(g_seed.has_value()),
      prior_seed_(g_seed.value_or(0)),
      seed_(seed) {
    g_seed = seed;
    g_deterministic = true;
}

DeterministicContext::~DeterministicContext() {
    g_deterministic = prior_deterministic_;
    if (prior_seed_set_) {
        g_seed = prior_seed_;
    } else {
        g_seed.reset();
    }
}

std::string assert_deterministic_run(
    const std::function<std::vector<unsigned char>()>& sim_fn, int runs,
    double tolerance) {
    if (runs < 2) {
        throw std::invalid_argument("assert_deterministic_run: runs must be >= 2");
    }
    if (tolerance < 0.0) {
        throw std::invalid_argument("assert_deterministic_run: tolerance must be >= 0.0");
    }

    std::vector<std::vector<unsigned char>> results;
    results.reserve(static_cast<size_t>(runs));
    for (int i = 0; i < runs; ++i) results.push_back(sim_fn());

    if (tolerance == 0.0) {
        // Bit-exact (D4 bit-exact-same-hw): all runs must sha256-match.
        std::set<std::string> digests;
        for (const auto& r : results) digests.insert(hash::sha256_hex(r));
        if (digests.size() != 1) {
            std::string joined;
            for (const auto& d : digests) joined += (joined.empty() ? "" : ", ") + d;
            throw DeterminismError(
                "assert_deterministic_run: " + std::to_string(runs) + " runs produced " +
                std::to_string(digests.size()) + " distinct sha256 digests {" + joined +
                "} — output is NOT bit-deterministic (violates the D4 bit-exact-same-hw "
                "contract; check lavapipe selection + LP_NUM_THREADS=0 + no atomics)");
        }
        return *digests.begin();
    }

    // Epsilon-bounded f32 posture: max-abs-diff of each run vs run 0.
    const auto& ref = results.front();
    if (ref.size() % sizeof(float) != 0) {
        throw std::invalid_argument(
            "assert_deterministic_run: byte length not divisible by sizeof(float) for "
            "tolerance > 0");
    }
    const size_t n = ref.size() / sizeof(float);
    for (int k = 1; k < runs; ++k) {
        if (results[static_cast<size_t>(k)].size() != ref.size()) {
            throw std::invalid_argument(
                "assert_deterministic_run: runs returned unequal byte lengths");
        }
        const float* a = reinterpret_cast<const float*>(ref.data());
        const float* b =
            reinterpret_cast<const float*>(results[static_cast<size_t>(k)].data());
        for (size_t j = 0; j < n; ++j) {
            double diff = std::fabs(static_cast<double>(a[j]) - static_cast<double>(b[j]));
            if (diff > tolerance) {
                throw DeterminismError(
                    "assert_deterministic_run: run " + std::to_string(k) +
                    " diverges from run 0 by max-abs-diff " + std::to_string(diff) +
                    " > tolerance " + std::to_string(tolerance));
            }
        }
    }
    return hash::sha256_hex(ref);
}

}  // namespace bit_physics::common_cpp::determinism
