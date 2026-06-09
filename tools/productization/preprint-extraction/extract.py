"""Phase-5 preprint-extraction: spec-ref.md -> main.tex + references.bib (§ 6.5 map).

Deterministic extractor. Input is ONE sim's reference spec sheet (``spec-ref.md``);
output is a self-contained LaTeX preprint source (``main.tex``) plus its bibliography
(``references.bib``) and a copy of the preprint class (``bitphysics-preprint.cls``).
NO PDF is produced here — the workflow builds it on demand (no-binary-artifact
discipline).

Section mapping (phase plan § 6.5):

  spec § 1 (Scope)          -> \\section{Introduction}
  spec § 3 (Algorithm)      -> \\section{Method}
  spec § 4 (Algebraic form) -> \\section{Mathematical Formulation}
  spec § 6 (Verification)   -> \\section{Evaluation}
  spec § 12 (References)     -> references.bib (with the vendored upstreams)

THE DETERMINISM GATE (STEP-5a) is the § 3.8 surrogate for this sub-phase: running
``extract`` twice on the same spec sheet MUST produce byte-identical ``main.tex``.
Every collection is SORTED before emission (the bibliography is keyed and emitted in
sorted cite-key order; the section order is a fixed list) so the output is a pure
function of the input — no dict/set iteration order leaks into the bytes. Do NOT
loosen this to a diff-tolerant compare; a nondeterministic emit is fixed here by
sorting, never tolerated.

Markdown -> LaTeX (anticipated-problems list, § 6.5): inline ``$...$`` math is kept;
a complete Unicode->LaTeX table maps math glyphs so output is pure ASCII (pdflatex-
clean); ``code`` -> ``\\texttt{}``, ``**bold**`` -> ``\\textbf{}``; tables -> ``tabular``;
fenced blocks -> typewriter ``quote``; ``-``/``N.`` lists -> ``itemize``/``enumerate``;
PNG figures in scope -> ``figures/`` + ``\\includegraphics`` (none for pinn-poisson).
"""

from __future__ import annotations

import argparse
import re
import shutil
import tomllib
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
TEMPLATE_DIR = THIS_DIR / "template"
REPO_ROOT = THIS_DIR.parents[2]
REFERENCES_ROOT = REPO_ROOT / "references"

# § 6.5 section map: spec-ref number -> LaTeX title. A FIXED list (not hash-ordered).
SECTION_MAP: list[tuple[str, str]] = [
    ("1", "Introduction"),
    ("3", "Method"),
    ("4", "Mathematical Formulation"),
    ("6", "Evaluation"),
]

# --- Unicode -> LaTeX (complete for the spec corpus; output stays pure-ASCII) ----
# Greek/operator glyphs shared by both contexts (math-form; text wraps it in $...$).
_GREEK_OPS = {
    "Δ": "\\Delta",
    "Ω": "\\Omega",
    "θ": "\\theta",
    "λ": "\\lambda",
    "π": "\\pi",
    "σ": "\\sigma",
    "∂": "\\partial",
    "∈": "\\in",
    "≈": "\\approx",
    "≠": "\\neq",
    "≥": "\\geq",
    "→": "\\to",
    "↔": "\\leftrightarrow",
    "↦": "\\mapsto",
    "·": "\\cdot",
}
# Math context (already inside $...$): emit the bare command.
_U_MATH = {
    **{k: v + " " for k, v in _GREEK_OPS.items()},
    "²": "^{2}", "³": "^{3}", "₃": "_{3}", "½": "\\tfrac{1}{2}", "¼": "\\tfrac{1}{4}",
    "−": "-", "…": "\\dots ", "§": "\\S ", "–": "\\text{--}", "—": "\\text{---}",
}  # fmt: skip
# Text context (prose / code): wrap math glyphs in $...$; text commands otherwise.
_U_TEXT = {
    **{k: "$" + v + "$" for k, v in _GREEK_OPS.items()},
    "²": "\\textsuperscript{2}", "³": "\\textsuperscript{3}",
    "₃": "\\textsubscript{3}", "½": "$\\tfrac{1}{2}$", "¼": "$\\tfrac{1}{4}$",
    "−": "$-$", "…": "\\dots ", "§": "\\S{}", "–": "--", "—": "---",
}  # fmt: skip
_SPECIALS = {
    "\\": "\\textbackslash{}", "&": "\\&", "%": "\\%", "$": "\\$", "#": "\\#",
    "_": "\\_", "{": "\\{", "}": "\\}", "~": "\\textasciitilde{}",
    "^": "\\textasciicircum{}",
}  # fmt: skip


def _map_unicode(s: str, table: dict[str, str]) -> str:
    return "".join(table.get(ch, ch) for ch in s)


def _escape_text(s: str) -> str:
    """Escape LaTeX specials, then map Unicode glyphs (text forms)."""
    out = "".join(_SPECIALS.get(ch, ch) for ch in s)
    return _map_unicode(out, _U_TEXT)


def _escape_math(s: str) -> str:
    """Inside $...$: map Unicode to bare math commands; do NOT escape specials."""
    return _map_unicode(s, _U_MATH)


def _escape_code(s: str) -> str:
    """Inside \\texttt{}: escape specials then map Unicode (text forms compile here)."""
    return _escape_text(s)


_INLINE_RE = re.compile(r"`([^`]*)`|\$([^$]*)\$|\*\*([^*]+?)\*\*|\*([^*\s][^*]*?)\*")


def inline(s: str) -> str:
    """Convert markdown inline spans (code / math / bold / italic) + text to LaTeX."""
    out: list[str] = []
    pos = 0
    for m in _INLINE_RE.finditer(s):
        out.append(_escape_text(s[pos : m.start()]))
        if m.group(1) is not None:
            out.append("\\texttt{" + _escape_code(m.group(1)) + "}")
        elif m.group(2) is not None:
            out.append("$" + _escape_math(m.group(2)) + "$")
        elif m.group(3) is not None:
            out.append("\\textbf{" + inline(m.group(3)) + "}")
        else:
            out.append("\\emph{" + inline(m.group(4)) + "}")
        pos = m.end()
    out.append(_escape_text(s[pos:]))
    return "".join(out)


# --- Block-level markdown -> LaTeX ----------------------------------------------


def _split_cells(row: str) -> list[str]:
    cells = row.strip().strip("|").split("|")
    return [c.strip() for c in cells]


def _render_table(lines: list[str]) -> str:
    rows = [ln for ln in lines if ln.strip()]
    header = _split_cells(rows[0])
    body = [_split_cells(r) for r in rows[2:]]  # rows[1] is the |---|---| separator
    ncol = len(header)
    width = round(0.92 / ncol, 3)
    col = "|" + ("p{%g\\linewidth}|" % width) * ncol
    out = ["\\begin{center}", "\\begin{tabular}{%s}" % col, "\\hline"]
    out.append(" & ".join("\\textbf{%s}" % inline(c) for c in header) + " \\\\ \\hline")
    for r in body:
        cells = (r + [""] * ncol)[:ncol]
        out.append(" & ".join(inline(c) for c in cells) + " \\\\ \\hline")
    out += ["\\end{tabular}", "\\end{center}"]
    return "\n".join(out)


def _render_fenced(lines: list[str]) -> str:
    out = ["\\begin{quote}\\small\\ttfamily\\setlength{\\parindent}{0pt}\\noindent"]
    rendered = []
    for ln in lines:
        stripped = ln.rstrip("\n")
        indent = len(stripped) - len(stripped.lstrip(" "))
        body = "~" * indent + _escape_code(stripped.lstrip(" "))
        rendered.append(body if body.strip("~") else "~")
    out.append(" \\\\\n".join(rendered))
    out.append("\\end{quote}")
    return "\n".join(out)


def _render_list(lines: list[str], ordered: bool) -> str:
    env = "enumerate" if ordered else "itemize"
    marker = re.compile(r"^\s*(?:\d+\.|[-*])\s+(.*)$")
    items: list[str] = []
    for ln in lines:
        m = marker.match(ln)
        if m:
            items.append(m.group(1).rstrip())
        elif ln.strip() and items:
            items[-1] += " " + ln.strip()  # continuation line
    out = ["\\begin{%s}" % env]
    out += ["  \\item %s" % inline(it) for it in items]
    out.append("\\end{%s}" % env)
    return "\n".join(out)


def _blocks(body: str) -> list[list[str]]:
    """Split a section body into blank-line-separated blocks (fenced blocks kept whole)."""
    blocks: list[list[str]] = []
    cur: list[str] = []
    in_fence = False
    for ln in body.splitlines():
        if ln.lstrip().startswith("```"):
            cur.append(ln)
            if in_fence:
                blocks.append(cur)
                cur = []
            in_fence = not in_fence
            continue
        if in_fence:
            cur.append(ln)
            continue
        if not ln.strip():
            if cur:
                blocks.append(cur)
                cur = []
        else:
            cur.append(ln)
    if cur:
        blocks.append(cur)
    return blocks


def _is_table(block: list[str]) -> bool:
    return (
        len(block) >= 2
        and block[0].lstrip().startswith("|")
        and re.match(r"^\s*\|[\s:|-]+\|\s*$", block[1])
    )


def render_section_body(body: str) -> str:
    out: list[str] = []
    for block in _blocks(body):
        first = block[0].lstrip()
        if first.startswith("```"):
            out.append(_render_fenced(block[1:-1]))
        elif _is_table(block):
            out.append(_render_table(block))
        elif re.match(r"^\s*\d+\.\s", block[0]):
            out.append(_render_list(block, ordered=True))
        elif re.match(r"^\s*[-*]\s", block[0]):
            out.append(_render_list(block, ordered=False))
        elif first.startswith("###"):
            title = block[0].lstrip("#").strip()
            out.append("\\subsection*{%s}" % inline(title))
            if len(block) > 1:
                out.append(inline(" ".join(b.strip() for b in block[1:])))
        elif first.startswith(">"):
            text = " ".join(b.lstrip(">").strip() for b in block)
            out.append("\\begin{quote}\n%s\n\\end{quote}" % inline(text))
        else:
            out.append(inline(" ".join(b.strip() for b in block)))
    return "\n\n".join(out)


# --- Section parsing ------------------------------------------------------------


def parse_sections(md: str) -> dict[str, str]:
    """Map spec-ref section number -> body text (between ``## N. ...`` headers)."""
    sections: dict[str, str] = {}
    cur_num: str | None = None
    cur: list[str] = []
    for ln in md.splitlines():
        m = re.match(r"^##\s+(\d+)\.\s+(.*)$", ln)
        if m:
            if cur_num is not None:
                sections[cur_num] = "\n".join(cur).strip()
            cur_num, cur = m.group(1), []
        elif cur_num is not None:
            cur.append(ln)
    if cur_num is not None:
        sections[cur_num] = "\n".join(cur).strip()
    return sections


def _title(md: str, fallback: str) -> str:
    m = re.search(r"^#\s+(.*)$", md, re.MULTILINE)
    if not m:
        return fallback
    t = re.sub(r"\s*[—-]\s*Reference Spec\s*$", "", m.group(1)).strip()
    return t or fallback


# --- Bibliography assembly (deterministic; sorted by cite-key) ------------------


def _slug(s: str) -> str:
    return re.sub(r"[^A-Za-z0-9]", "", s).lower()


# Bibliography values are run through BibTeX's ``plain`` style, which lowercases and
# purifies titles — so they must contain NO fragile macros (``\S`` would be lowered to
# the undefined ``\s``). Use a bib-SAFE Unicode table and brace-protect every value.
_BIB_UNICODE = {**_U_TEXT, "§": "Sec."}
_BIB_SPECIALS = {"&": "\\&", "%": "\\%", "#": "\\#", "_": "\\_"}


def _bib_text(s: str) -> str:
    """Clean markdown reference text into a safe, brace-protectable BibTeX value."""
    s = re.sub(r"\*\*([^*]+?)\*\*", r"\1", s)  # drop bold markers
    s = re.sub(r"\*([^*]+?)\*", r"\1", s)  # drop italic markers
    s = "".join(_BIB_SPECIALS.get(ch, ch) for ch in s)
    return _map_unicode(s, _BIB_UNICODE).strip()


def _manifest_entries(sim_id: str) -> dict[str, str]:
    """@misc entries from references/*/MANIFEST.toml whose used_by_sims include sim_id."""
    entries: dict[str, str] = {}
    if not REFERENCES_ROOT.is_dir():
        return entries
    for manifest in sorted(REFERENCES_ROOT.glob("*/MANIFEST.toml")):
        try:
            doc = tomllib.loads(manifest.read_text(encoding="utf-8"))
        except tomllib.TOMLDecodeError:
            continue
        up = doc.get("upstream", {})
        used_by = doc.get("scope", {}).get("used_by_sims", [])
        if sim_id not in used_by:
            continue
        name = up.get("name", manifest.parent.name)
        version = str(up.get("version", "")).strip()
        url = up.get("url", "")
        license_ = up.get("license", "")
        sha = str(up.get("sha", ""))
        year = ""
        fetched = doc.get("vendoring", {}).get("fetched_utc", "")
        ym = re.match(r"(\d{4})", str(fetched))
        if ym:
            year = ym.group(1)
        org = ""
        om = re.search(r"github\.com/([^/]+)/", url)
        if om:
            org = om.group(1)
        key = _slug(name) + _slug(version)
        note = "vendored read-only reference oracle"
        if version:
            note = f"version {version}; " + note
        if license_:
            note += f"; {license_}"
        if sha:
            note += f"; commit {sha[:12]}"
        fields = [f"  title        = {{{{{_bib_text(name)}}}}}"]
        if org:
            fields.append(f"  author       = {{{{{_bib_text(org)}}}}}")
        if year:
            fields.append(f"  year         = {{{year}}}")
        if url:
            fields.append(f"  howpublished = {{\\url{{{url}}}}}")
        fields.append(f"  note         = {{{_bib_text(note)}}}")
        entries[key] = "@misc{%s,\n%s,\n}" % (key, ",\n".join(fields))
    return entries


def _reference_entries(section12: str) -> dict[str, str]:
    """@misc entries parsed from the spec § 12 reference bullets (minimal fallback)."""
    entries: dict[str, str] = {}
    seen: dict[str, int] = {}
    for ln in section12.splitlines():
        m = re.match(r"^\s*[-*]\s+(.*)$", ln)
        if not m:
            continue
        text = m.group(1).strip()
        if "references/" in text:
            continue  # the vendored upstream — already emitted from its MANIFEST.toml
        ym = re.search(r"\b(19|20)\d{2}\b", text)
        year = ym.group(0) if ym else ""
        head = re.split(r"\s*\(", text, maxsplit=1)[0]
        author = re.split(r",\s*\*|,\s+[A-Z]", head, maxsplit=1)[0].strip(" .,")
        base = (_slug(author.split()[0]) if author else _slug(text[:8])) + year
        base = base or "ref"
        n = seen.get(base, 0)
        seen[base] = n + 1
        key = base if n == 0 else f"{base}{chr(ord('a') + n)}"
        fields = [f"  title  = {{{{{_bib_text(text)}}}}}"]
        if author:
            fields.append(f"  author = {{{{{_bib_text(author)}}}}}")
        if year:
            fields.append(f"  year   = {{{year}}}")
        fields.append("  note   = {{extracted from spec-ref Sec.~12 references}}")
        entries[key] = "@misc{%s,\n%s,\n}" % (key, ",\n".join(fields))
    return entries


def build_bibliography(md: str, sim_id: str) -> str:
    sections = parse_sections(md)
    entries: dict[str, str] = {}
    entries.update(_manifest_entries(sim_id))
    entries.update(_reference_entries(sections.get("12", "")))
    header = (
        "% references.bib -- extracted from spec-ref.md sec. 12 + vendored MANIFEST.toml.\n"
        "% Emitted in sorted cite-key order (deterministic; preprint-extraction).\n\n"
    )
    return header + "\n\n".join(entries[k] for k in sorted(entries)) + "\n"


# --- main.tex assembly ----------------------------------------------------------


def _figures(spec_path: Path, out_dir: Path) -> list[str]:
    """Copy any PNG figures next to the spec sheet into figures/; return include lines."""
    fig_dir = out_dir / "figures"
    fig_dir.mkdir(parents=True, exist_ok=True)
    (fig_dir / ".gitkeep").touch()
    includes: list[str] = []
    for png in sorted(spec_path.parent.glob("*.png")):
        shutil.copy2(png, fig_dir / png.name)
        includes.append(
            "\\begin{figure}[h]\\centering\n"
            "\\includegraphics[width=0.8\\linewidth]{figures/%s}\n"
            "\\caption{%s}\\end{figure}" % (png.name, inline(png.stem))
        )
    return includes


def build_main_tex(md: str, sim_name: str, figures: list[str]) -> str:
    sections = parse_sections(md)
    title = _title(md, sim_name)
    lines = [
        "% main.tex -- preprint extracted from spec-ref.md (Bit-Physics preprint-extraction).",
        "% Deterministic output: regenerating from the same spec sheet is byte-identical.",
        "\\documentclass{bitphysics-preprint}",
        "",
        "\\title{%s}" % inline(title),
        "\\author{Bit-Physics Project}",
        "\\date{}",
        "",
        "\\begin{document}",
        "\\maketitle",
        "",
    ]
    for num, heading in SECTION_MAP:
        body = sections.get(num)
        if not body:
            continue
        lines.append("\\section{%s}" % heading)
        lines.append(render_section_body(body))
        lines.append("")
        if num == "4" and figures:  # figures belong with the formulation
            lines += figures + [""]
    lines += [
        "\\nocite{*}",
        "\\bibliographystyle{plain}",
        "\\bibliography{references}",
        "",
        "\\end{document}",
        "",
    ]
    return "\n".join(lines)


def extract(spec_path: Path, out_dir: Path) -> tuple[Path, Path]:
    """Extract spec_path -> out_dir/{main.tex, references.bib, bitphysics-preprint.cls}."""
    md = spec_path.read_text(encoding="utf-8")
    sim_name = spec_path.parent.name
    sim_id = f"{spec_path.parent.parent.name}/{sim_name}"
    out_dir.mkdir(parents=True, exist_ok=True)

    figures = _figures(spec_path, out_dir)
    main_tex = build_main_tex(md, sim_name, figures)
    bib = build_bibliography(md, sim_id)

    main_path = out_dir / "main.tex"
    bib_path = out_dir / "references.bib"
    main_path.write_text(main_tex, encoding="utf-8")
    bib_path.write_text(bib, encoding="utf-8")
    shutil.copy2(
        TEMPLATE_DIR / "bitphysics-preprint.cls", out_dir / "bitphysics-preprint.cls"
    )
    return main_path, bib_path


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="extract.py")
    ap.add_argument("spec", help="path to a sim's spec-ref.md")
    ap.add_argument("--out", required=True, help="output main.tex path")
    args = ap.parse_args(argv)
    spec_path = Path(args.spec).resolve()
    out_path = Path(args.out)
    out_dir = out_path.parent if out_path.suffix else out_path
    main_path, _ = extract(spec_path, out_dir)
    if out_path.suffix and out_path.name != "main.tex":
        shutil.copy2(main_path, out_path)
    print(str(out_path if out_path.suffix else main_path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
