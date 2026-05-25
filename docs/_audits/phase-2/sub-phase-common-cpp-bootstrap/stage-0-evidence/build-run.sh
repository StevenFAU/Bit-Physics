#!/usr/bin/env bash
# Stage-0 determinism-baseline reproduction (sub-phase-common-cpp-bootstrap).
# Requires: mesa-vulkan-drivers (lavapipe), libvulkan-dev, glslangValidator, g++.
set -euo pipefail
export VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.json   # D14: select lavapipe
export LP_NUM_THREADS=0                                       # D4: determinism lever
glslangValidator -V determinism-probe.comp -o probe.spv
g++ -std=c++17 -O2 determinism-probe-host.cpp -lvulkan -o probe
./probe out1.bin probe.spv && ./probe out2.bin probe.spv
sha256sum out1.bin out2.bin
cmp -s out1.bin out2.bin && echo "BIT-IDENTICAL (baseline a7f85bd4...)" || echo "DIVERGENCE"
