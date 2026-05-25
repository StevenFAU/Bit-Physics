// IC-3 from_args tests.

#include "bit_physics/common/determinism.hpp"

#include <cstring>
#include <doctest/doctest.h>
#include <stdexcept>
#include <string>
#include <vector>

namespace det = bit_physics::common_cpp::determinism;

namespace {

struct Argv {
    std::vector<std::string> owned;
    std::vector<char*> pointers;

    explicit Argv(std::initializer_list<const char*> args) {
        for (const char* s : args) owned.emplace_back(s);
        rebuild();
    }
    void rebuild() {
        pointers.clear();
        for (auto& s : owned) pointers.push_back(s.data());
        pointers.push_back(nullptr);
    }
    int argc() const { return static_cast<int>(owned.size()); }
    char** argv() { return pointers.data(); }
};

}  // namespace

TEST_CASE("IC-3 default Config is non-deterministic") {
    det::Config c;
    CHECK_FALSE(c.deterministic);
    CHECK(c.seed == 0u);
}

TEST_CASE("IC-3 from_args parses --deterministic and --seed") {
    Argv a{"prog", "--deterministic", "--seed", "42"};
    int argc = a.argc();
    char** argv = a.argv();
    det::Config c = det::from_args(argc, argv);
    CHECK(c.deterministic);
    CHECK(c.seed == 42u);
    CHECK(argc == 1);  // only "prog" left
}

TEST_CASE("IC-3 from_args trims argv consistently with the resolved config") {
    Argv a{"prog", "--foo", "x", "--seed", "7", "--bar"};
    int argc = a.argc();
    char** argv = a.argv();
    det::Config c = det::from_args(argc, argv);
    CHECK(c.seed == 7u);
    CHECK_FALSE(c.deterministic);
    // After consuming "--seed 7" the remaining argv is "prog --foo x --bar"
    REQUIRE(argc == 4);
    CHECK(std::string(argv[0]) == "prog");
    CHECK(std::string(argv[1]) == "--foo");
    CHECK(std::string(argv[2]) == "x");
    CHECK(std::string(argv[3]) == "--bar");
}

TEST_CASE("IC-3 from_args throws when --seed lacks a value") {
    Argv a{"prog", "--seed"};
    int argc = a.argc();
    char** argv = a.argv();
    CHECK_THROWS(det::from_args(argc, argv));
}

TEST_CASE("IC-3 unrelated argv is left untouched") {
    Argv a{"prog", "--other"};
    int argc = a.argc();
    char** argv = a.argv();
    det::Config c = det::from_args(argc, argv);
    CHECK_FALSE(c.deterministic);
    CHECK(c.seed == 0u);
    CHECK(argc == 2);
}

// ---- Determinism socket (Stage 1b; C-2) — backend-agnostic CPU unit tests ----

namespace {
std::vector<unsigned char> bytes_of(std::initializer_list<float> vs) {
    std::vector<unsigned char> b(vs.size() * sizeof(float));
    std::vector<float> tmp(vs);
    std::memcpy(b.data(), tmp.data(), b.size());
    return b;
}
}  // namespace

TEST_CASE("assert_deterministic_run returns a stable digest for a deterministic fn") {
    auto fn = [] { return bytes_of({1.0f, 2.0f, 3.0f}); };
    std::string d1 = det::assert_deterministic_run(fn, 2);
    std::string d2 = det::assert_deterministic_run(fn, 5);
    CHECK(d1.size() == 64);
    CHECK(d1 == d2);  // same bytes -> same sha256 witness
}

TEST_CASE("assert_deterministic_run throws DeterminismError on divergence") {
    int call = 0;
    auto flaky = [&call] {
        // Returns different bytes on alternate calls -> not bit-deterministic.
        return (call++ % 2 == 0) ? bytes_of({1.0f}) : bytes_of({2.0f});
    };
    CHECK_THROWS_AS(det::assert_deterministic_run(flaky, 2), det::DeterminismError);
}

TEST_CASE("assert_deterministic_run validates arguments") {
    auto fn = [] { return bytes_of({1.0f}); };
    CHECK_THROWS_AS(det::assert_deterministic_run(fn, 1), std::invalid_argument);
    CHECK_THROWS_AS(det::assert_deterministic_run(fn, 2, -1.0), std::invalid_argument);
}

TEST_CASE("assert_deterministic_run tolerance>0 accepts bounded f32 drift") {
    int call = 0;
    auto near = [&call] {
        return (call++ == 0) ? bytes_of({1.0f, 2.0f}) : bytes_of({1.0f, 2.0001f});
    };
    CHECK_NOTHROW(det::assert_deterministic_run(near, 2, 1e-3));
    call = 0;
    CHECK_THROWS_AS(det::assert_deterministic_run(near, 2, 1e-9), det::DeterminismError);
}

TEST_CASE("DeterministicContext sets and restores seed/flag") {
    CHECK_FALSE(det::is_deterministic());
    {
        det::DeterministicContext ctx(123);
        CHECK(det::is_deterministic());
        CHECK(det::get_seed() == 123u);
        CHECK(ctx.seed() == 123u);
    }
    CHECK_FALSE(det::is_deterministic());
}
