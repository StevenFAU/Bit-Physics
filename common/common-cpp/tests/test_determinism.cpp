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
