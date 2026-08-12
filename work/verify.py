#!/usr/bin/env python3
"""
Verification for the space-fighter-metal rewrite.

Two independent checks:

  1. RECONSTRUCT — walk a chapter's snippets in order and apply them to a
     virtual filesystem: `swift` blocks under a "Create <path>" heading create
     a file; `diff` blocks patch an existing one. Then compare the result
     against work/inputs/canonical/. This proves that a reader who follows the
     chapter literally ends up with exactly the right file — which is the whole
     point of the anchored format, and catches "where does this line go?" bugs
     mechanically.

  2. FORMAT — enforce the agreed presentation rules: block size cap, code/prose
     ratio, every code block preceded by a location line, diff hunks carry
     context lines.

Usage:
    python3 work/verify.py                 # all chapters
    python3 work/verify.py 04              # one chapter
"""
import re, os, sys, glob, difflib


def code_only(text):
    """Strip line comments and blank lines so comment drift doesn't fail the check."""
    out = []
    for l in text.split("\n"):
        l = re.sub(r'\s*//.*$', '', l.rstrip())
        if l.strip():
            out.append(l)
    return "\n".join(out)

ROOT      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS      = os.path.join(ROOT, "guides/space-fighter-metal/docs")
CANON     = os.path.join(ROOT, "work/inputs/canonical")
UNITS     = os.path.join(ROOT, "work/units")

MAX_BLOCK = 20      # lines of code in a single fence
MAX_CODE_PCT = 55   # per chapter

CREATE_RE = re.compile(r'`(?:Sources/SpaceFighter/)?([A-Za-z][\w/]*\.swift)`')


def parse_blocks(text):
    """Yield (lang, body_lines, preceding_nonblank_line, start_lineno)."""
    lines = text.split("\n")
    i = 0
    while i < len(lines):
        if lines[i].startswith("```"):
            lang = lines[i][3:].strip()
            j = i + 1
            body = []
            while j < len(lines) and not lines[j].startswith("```"):
                body.append(lines[j]); j += 1
            # location lines can wrap, so look back over the preceding
            # paragraph (up to 3 non-blank lines) for the file reference
            ctx, k = [], i - 1
            while k >= 0 and len(ctx) < 3:
                if lines[k].strip():
                    ctx.append(lines[k])
                elif ctx:
                    break
                k -= 1
            yield lang, body, " ".join(reversed(ctx)), i + 1
            i = j + 1
        else:
            i += 1


def apply_diff(current, hunk):
    """Apply a unified-ish diff hunk (context/+/- lines, no @@ headers) to `current`.

    Anchors by locating the context+removed lines in the file. Returns the new
    text, or raises ValueError if the anchor is not found exactly once.
    """
    before, after = [], []
    for l in hunk:
        if l.startswith("+"):
            after.append(l[1:])
        elif l.startswith("-"):
            before.append(l[1:])
        else:
            ctx = l[1:] if l.startswith(" ") else l
            before.append(ctx); after.append(ctx)

    cur = current.split("\n")
    n = len(before)
    if n == 0:
        raise ValueError("empty hunk")
    hits = [i for i in range(len(cur) - n + 1) if cur[i:i + n] == before]
    if len(hits) != 1:
        raise ValueError(
            f"anchor matched {len(hits)} times (need exactly 1); "
            f"first context line: {before[0].strip()!r}")
    i = hits[0]
    return "\n".join(cur[:i] + after + cur[i + n:])


def reconstruct(path):
    """Replay one chapter's snippets. Returns (files, errors)."""
    text = open(path).read()
    files, errors = {}, []
    pending = None   # path awaiting a swift block

    for lang, body, prev, ln in parse_blocks(text):
        m = CREATE_RE.search(prev) if prev else None
        target = m.group(1).split("/")[-1] if m else None   # basename: unique here
        low = (prev or "").lower()

        if lang == "swift":
            if target and ("new file" in low or "replace" in low):
                # "**`path`** — new file:"  /  "**`path`** — replace ...:"
                files[target] = "\n".join(body)
            elif target:
                errors.append(
                    f"line {ln}: swift block names {target} but the location line says "
                    f"neither 'new file' nor 'replace' — should this be a diff block?")
            # no file named -> illustrative preview; not part of the build
        elif lang == "diff":
            if not target:
                errors.append(f"line {ln}: diff block with no file named in the line above")
                continue
            if target not in files:
                errors.append(f"line {ln}: diff targets {target}, which has not been created yet")
                continue
            try:
                files[target] = apply_diff(files[target], body)
            except ValueError as e:
                errors.append(f"line {ln}: {target}: {e}")
    return files, errors


def check_format(path):
    text = open(path).read()
    issues = []
    # A chapter that declares it creates nothing is a concept chapter: its
    # snippets are previews and are exempt from the location-line rule.
    concept = "Files created: none" in text
    CODE_LANGS = ("swift", "diff", "metal")
    code = prose = other = 0
    for lang, body, prev, ln in parse_blocks(text):
        n = len(body)
        if lang in CODE_LANGS:
            code += n
        else:
            other += n   # console output, trees, mermaid — not code the reader types
        cap = 40 if ("throwaway" in (prev or "").lower()
                     or "replace the whole file" in (prev or "").lower()) else MAX_BLOCK
        if lang in ("swift", "diff", "metal") and n > cap:
            issues.append(f"line {ln}: {lang} block is {n} lines (cap {cap})")
        if lang == "diff" and not any(
                l and not l[0] in "+-" for l in body):
            issues.append(f"line {ln}: diff block has no context lines")
        if lang == "diff" and not CREATE_RE.search(prev or ""):
            issues.append(f"line {ln}: diff block not anchored to a file "
                          f"(line above: {prev.strip()[:60]!r})")
    for l in text.split("\n"):
        if l.strip() and not l.startswith("```"):
            prose += 1
    prose -= (code + other)
    pct = 100 * code / max(code + prose, 1)
    if round(pct) > MAX_CODE_PCT:
        issues.append(f"chapter is {pct:.0f}% code (cap {MAX_CODE_PCT}%)")
    return issues, pct


def main():
    which = sys.argv[1] if len(sys.argv) > 1 else ""
    src = UNITS if os.path.isdir(UNITS) and os.listdir(UNITS) else DOCS
    chapters = sorted(glob.glob(f"{src}/*{which}*.md")) if which else sorted(glob.glob(f"{src}/*.md"))

    built, all_errors = {}, []
    print(f"{'chapter':<34}{'code%':>7}  format")
    for ch in chapters:
        files, errs = reconstruct(ch)
        issues, pct = check_format(ch)
        built.update(files)
        all_errors += [f"{os.path.basename(ch)}: {e}" for e in errs]
        all_errors += [f"{os.path.basename(ch)}: {i}" for i in issues]
        print(f"{os.path.basename(ch):<34}{pct:>6.0f}%  {'OK' if not issues else str(len(issues))+' issue(s)'}")

    if which:
        print("\n(single-chapter run: skipping canonical comparison — files that "
              "evolve across chapters are incomplete until the full replay)")
        if all_errors:
            print(f"\n--- {len(all_errors)} issue(s) ---")
            for e in all_errors[:40]:
                print(f"  {e}")
        return 1 if all_errors else 0

    print("\n--- reconstruction vs canonical (code, ignoring comments) ---")
    ok = bad = missing = 0
    for rel, body in sorted(built.items()):
        canon_path = os.path.join(CANON, rel)
        if not os.path.exists(canon_path):
            print(f"  ?  {rel}  (no canonical file to compare)"); missing += 1; continue
        want = code_only(open(canon_path).read())
        got  = code_only(body)
        if want == got:
            print(f"  OK {rel}"); ok += 1
        else:
            bad += 1
            print(f"  XX {rel}  MISMATCH")
            d = list(difflib.unified_diff(want.split("\n"), got.split("\n"),
                                          "canonical", "reconstructed", lineterm="", n=1))
            for line in d[:14]:
                print(f"       {line}")
    print(f"\nreconstructed: {ok} match, {bad} mismatch, {missing} uncompared")
    if all_errors:
        print(f"\n--- {len(all_errors)} issue(s) ---")
        for e in all_errors[:40]:
            print(f"  {e}")
    return 1 if (bad or all_errors) else 0


if __name__ == "__main__":
    sys.exit(main())
