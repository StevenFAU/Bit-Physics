# Self-hosted IBM Plex web fonts (shared chrome)

woff2 latin subsets of the two house-style families
(`docs/design/house-style.md` § 3), committed so the shared presentation
chrome carries NO runtime Google Fonts dependency:

- **IBM Plex Mono** — weights 300 / 400 / 500 / 600 (`--mono`)
- **IBM Plex Sans Condensed** — weights 500 / 600 / 700 (`--cond`)

Provenance: fetched 2026-06-11 (Lane B dispatch P-3) from fonts.gstatic.com
(Google Fonts static CDN; IBM Plex Mono v20, IBM Plex Sans Condensed v15),
latin subset only — the portfolio's presentation copy is English. License:
SIL OFL 1.1 (`LICENSE.txt`, from https://github.com/IBM/plex).

`@font-face` declarations live in `../src/theme.css`; per-sim Vite builds
bundle whichever weights the page references as hashed dist assets (the
browser fetches only the weights actually used). The landing page is served
verbatim with no build step, so it keeps its own copy under
`tools/productization/web-deploy/web/pages/assets/fonts/`.
