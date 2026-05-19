# Security policy

## Supported versions

Bit-Physics is pre-release. There is no supported-versions table yet.

## Reporting a vulnerability

Report security issues privately via GitHub's
[private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
feature on the
[StevenFAU/Bit-Physics](https://github.com/StevenFAU/Bit-Physics) repository.

Please do not file public issues for suspected vulnerabilities.

## Scope

Bit-Physics is a simulation portfolio; it does not handle user secrets,
network traffic, or production data. Security-relevant areas are vendored
upstream dependencies and supply-chain pins documented in
[`docs/dependencies.md`](docs/dependencies.md) and the per-vendoring
manifest files under `references/`.
