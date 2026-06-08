# Bit-Physics — Stack-C binary packaging (CPack) configuration.
#
# Phase 5 sub-phase 5.2 (binary-release). This is the ONE file the binary-release
# sub-phase lands OUTSIDE tools/productization/binary-release/ — CMake's include-path
# convention puts packaging config under the top-level cmake/ dir (phase plan § 6.2;
# documented as a rule-of-three candidate in the closing audit § 11).
#
# DEPLOY IS GATED OFF in Phase 5 (§ 4.3 / § 4.5): this file is NOT auto-included by
# the default top-level configure (which stays byte-for-byte the cpp-strict build,
# so that green job is unperturbed). It is included explicitly only at packaging /
# go-live time, e.g.:
#
#     cmake -S . -B build/pkg -DCMAKE_PROJECT_bit_physics_INCLUDE=cmake/Packaging.cmake
#     cmake --build build/pkg --target package
#
# Per the phase-plan delivery decisions:
#   § 4.4 — Linux binary format: AppImage (CPack External / linuxdeploy at go-live).
#   § 4.3 — macOS: UNSIGNED; `xattr -d com.apple.quarantine` workaround in the runbook.
#   § 4.x — Windows: zip + DLL bundling (CMake fixup_bundle / windeployqt) at go-live.
# Windows + macOS are DEFERRED-to-Phase-6 (the bootstrap gate is lavapipe/linux;
# see docs/productization/binary-release.md § go-live).

set(CPACK_PACKAGE_NAME "bit-physics")
set(CPACK_PACKAGE_VENDOR "Bit-Physics")
set(CPACK_PACKAGE_DESCRIPTION_SUMMARY
  "Bit-Physics Stack-C (C++ / Vulkan) headless capture binaries")
set(CPACK_PACKAGE_VERSION "${PROJECT_VERSION}")
set(CPACK_RESOURCE_FILE_LICENSE "${CMAKE_CURRENT_LIST_DIR}/../LICENSE")

# Only the headless capture executables ship; the test executables and libraries
# are build-time artifacts. Install rules are added by the go-live packaging pass
# (held out of Phase 5 — build-and-validate only, no Release).
set(CPACK_COMPONENTS_ALL capture)

# Per-OS generator selection (resolved at go-live; AppImage via CPACK_EXTERNAL).
if(CMAKE_SYSTEM_NAME STREQUAL "Linux")
  set(CPACK_GENERATOR "TGZ")          # AppImage packaging is a go-live CPACK_EXTERNAL hook
elseif(CMAKE_SYSTEM_NAME STREQUAL "Darwin")
  set(CPACK_GENERATOR "TGZ")          # unsigned .app bundling at go-live (§ 4.3)
elseif(WIN32)
  set(CPACK_GENERATOR "ZIP")          # + fixup_bundle / windeployqt at go-live
endif()

# Shared component/AppImage hooks live with the sub-phase tooling.
include("${CMAKE_CURRENT_LIST_DIR}/../tools/productization/binary-release/cmake/cpack-hooks.cmake"
        OPTIONAL)

include(CPack)
