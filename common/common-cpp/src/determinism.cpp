// IC-3 implementation (charter § 3.3).

#include "bit_physics/common/determinism.hpp"

#include <cstring>
#include <stdexcept>
#include <string>

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

}  // namespace bit_physics::common_cpp::determinism
