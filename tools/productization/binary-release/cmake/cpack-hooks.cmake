# Binary-release CPack component hooks (phase plan § 6.2 — cmake/ subdir).
#
# Complements the top-level cmake/Packaging.cmake. Sub-phase-specific CPack
# component definitions + the AppImage (linuxdeploy) external-generator hook,
# applied only at go-live packaging (DEPLOY GATED OFF in Phase 5). Kept under the
# tool tree so `git grep binary-release` returns it; included OPTIONAL by
# Packaging.cmake so the default top-level configure is unaffected.

# The single shipping component: the headless capture executables.
if(COMMAND cpack_add_component)
  cpack_add_component(capture
    DISPLAY_NAME "Headless capture binaries"
    DESCRIPTION  "Stack-C (C++ / Vulkan) canonical-capture executables")
endif()

# AppImage (§ 4.4) is produced at go-live via a CPACK_EXTERNAL script invoking
# linuxdeploy + the appimage plugin (web-fetched/pinned at go-live). Stubbed here
# so the wiring point is explicit and discoverable:
#   set(CPACK_EXTERNAL_PACKAGE_SCRIPT "${CMAKE_CURRENT_LIST_DIR}/appimage-build.cmake")
#   set(CPACK_EXTERNAL_ENABLE_STAGING ON)
# AppImage > 100 MB → upload as a Release asset, not an Actions artifact (§ 6.2).
