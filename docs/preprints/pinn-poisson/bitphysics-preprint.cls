%% bitphysics-preprint.cls — Bit-Physics preprint-extraction class (Phase 5 sub-phase 5.5).
%%
%% A thin, conservative wrapper over the standard `article` class (LPPL, the most
%% permissive / arXiv-safe base; phase plan § 6.5 "permissively-licensed standard
%% class"). It loads only widely-available, arXiv-accepted packages so the extracted
%% main.tex compiles clean under any pinned TeX Live. No exotic packages, no shaded
%% boxes, no fonts that need a system install — pdflatex-clean by construction.
\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{bitphysics-preprint}[2026/06/09 v1 Bit-Physics preprint-extraction class]

\DeclareOption*{\PassOptionsToClass{\CurrentOption}{article}}
\ProcessOptions\relax
\LoadClass[11pt]{article}

\RequirePackage[utf8]{inputenc}
\RequirePackage[T1]{fontenc}
\RequirePackage[margin=1in]{geometry}
\RequirePackage{amsmath}
\RequirePackage{amssymb}
\RequirePackage{graphicx}
\RequirePackage{parskip}
\RequirePackage[hidelinks]{hyperref}
\graphicspath{{figures/}}

%% Long monospace tokens (file paths, capture descriptors) extracted from spec
%% sheets can run past the margin; relax line-breaking rather than overflow.
\sloppy
\emergencystretch=3em

\endinput
