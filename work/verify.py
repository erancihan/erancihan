#!/usr/bin/env python3
"""Verify the space-fighter-vulkan chapters.

Two independent halves:

  (a) Reconstruction — replay every chapter's snippets, in chapter order, into an
      in-memory filesystem carried forward cumulatively, then diff each
      reconstructed file against work/inputs/canonical/.

  (b) Format lint — block size, anchoring, code/prose ratio, diff-block sanity.

Usage:
    python3 work/verify.py [chapters_glob] [--partial]

    --partial  skip the comparison against canonical (for a run over a subset of
               chapters, where files legitimately are not finished yet)
"""

import glob
import os
import re
import sys

CANON = "work/inputs/canonical"

# Blocks in these languages are prose furniture, never project files.
NON_CODE_LANGS = {"console", "text", "mermaid", "", "diff-illustration"}

TEACHING_CAP = 20     # added lines per ordinary snippet
THROWAWAY_CAP = 45    # checkpoint harnesses are scaffolding, not instruction
CODE_PCT_CAP = 55.0

LOC_FILE_RE = re.compile(r"`([\w./-]+\.(?:cpp|hpp|h|txt|vert|frag|cmake|py|swift|glsl|metal))`")
LOC_START_RE = re.compile(r"^\*\*`")


class Fail(Exception):
    pass


# --------------------------------------------------------------------------
# parsing
# --------------------------------------------------------------------------

def parse_blocks(path):
    """Yield dicts describing every fenced block in a chapter."""
    lines = open(path).read().split("\n")
    blocks = []
    i = 0
    prose_lines = 0
    code_lines = 0
    while i < len(lines):
        m = re.match(r"^\s*```(\S*)\s*$", lines[i])
        if not m:
            prose_lines += 1
            i += 1
            continue
        lang = m.group(1)
        start = i + 1
        j = start
        while j < len(lines) and not re.match(r"^\s*```\s*$", lines[j]):
            j += 1
        body = lines[start:j]
        code_lines += len(body) + 2

        # Location line: scan back over the preceding paragraph (they wrap).
        ctx = []
        k = i - 1
        while k >= 0 and len(ctx) < 4:
            if lines[k].strip():
                ctx.append(lines[k])
            elif ctx:
                break
            k -= 1
        ctx.reverse()
        para = " ".join(ctx)

        loc_line = None
        for c in ctx:
            if LOC_START_RE.match(c):
                loc_line = para
                break

        blocks.append(dict(lang=lang, body=body, line=i + 1, para=para,
                           loc=loc_line, chapter=path))
        i = j + 1
    return blocks, code_lines, prose_lines


def target_of(block):
    """The file a block writes to, or None if it is not a project file."""
    if block["lang"] in NON_CODE_LANGS:
        return None
    para = block["para"]
    if "illustration only" in para.lower() or "don't type this" in para.lower():
        return None
    if not block["loc"]:
        return None
    m = LOC_FILE_RE.search(block["loc"])
    if not m:
        # CMakeLists is written without an extension in some prose
        if "CMakeLists.txt" in block["loc"]:
            return "CMakeLists.txt"
        return None
    return os.path.basename(m.group(1))


def is_creation(block):
    """True when the block writes the file wholesale rather than patching it."""
    para = block["para"].lower()
    return "new file" in para or "replace the whole file" in para or \
           "replace the generated file" in para or "replace it with" in para


def added_count(block):
    if block["lang"] == "diff":
        return sum(1 for l in block["body"] if l.startswith("+"))
    return len(block["body"])


# --------------------------------------------------------------------------
# (a) reconstruction
# --------------------------------------------------------------------------

def apply_diff(fs, name, block):
    """Patch fs[name] using a unified-ish diff block with real context lines."""
    body = list(block["body"])
    while body and body[-1].strip() == "":
        body.pop()

    before, after = [], []
    for l in body:
        if l.startswith("+"):
            after.append(l[1:])
        elif l.startswith("-"):
            before.append(l[1:])
        elif l.startswith(" "):
            before.append(l[1:])
            after.append(l[1:])
        elif l == "":
            before.append("")
            after.append("")
        else:
            raise Fail(f"{block['chapter']}:{block['line']}: diff line lacks a "
                       f"+/-/space marker: {l!r}")

    if name not in fs:
        raise Fail(f"{block['chapter']}:{block['line']}: diff targets {name}, "
                   f"which no earlier chapter created")
    if not any(l.startswith(" ") for l in body):
        raise Fail(f"{block['chapter']}:{block['line']}: diff for {name} has no "
                   f"context lines — the anchor is ambiguous")

    doc = fs[name]
    n = len(before)
    hits = [i for i in range(len(doc) - n + 1)
            if [x.rstrip() for x in doc[i:i + n]] == [x.rstrip() for x in before]]

    first_ctx = next((l[1:] for l in body if l.startswith(" ")), "?")
    if len(hits) == 0:
        raise Fail(f"{block['chapter']}:{block['line']}: diff anchor NOT FOUND in "
                   f"{name}\n    first context line: {first_ctx!r}")
    if len(hits) > 1:
        raise Fail(f"{block['chapter']}:{block['line']}: diff anchor matches "
                   f"{len(hits)} places in {name} — ambiguous\n"
                   f"    first context line: {first_ctx!r}")

    at = hits[0]
    fs[name] = doc[:at] + after + doc[at + n:]


def is_throwaway(block):
    """Checkpoint harnesses live in scratch/: real files the reader types, but
    not part of the project, so they are replayed and then excluded."""
    return "scratch/" in (block["loc"] or "")


def reconstruct(chapters):
    fs = {}
    throwaway = set()
    problems = []
    for ch in chapters:
        blocks, _, _ = parse_blocks(ch)
        for b in blocks:
            name = target_of(b)
            if not name:
                continue
            if is_throwaway(b):
                throwaway.add(name)
            try:
                if b["lang"] == "diff":
                    apply_diff(fs, name, b)
                elif is_creation(b):
                    fs[name] = list(b["body"])
                else:
                    raise Fail(f"{b['chapter']}:{b['line']}: block for {name} is "
                               f"neither a diff nor marked 'new file'/'replace'")
            except Fail as e:
                problems.append(str(e))
    for name in throwaway:
        fs.pop(name, None)
    return fs, problems


# --------------------------------------------------------------------------
# comparison
# --------------------------------------------------------------------------

def strip_code(text, name):
    """Reduce to comparable code: no comments, no blank lines, no trailing space."""
    if name.endswith((".txt", ".cmake", ".py")):
        text = re.sub(r"#.*", "", text)
    else:
        text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
        text = re.sub(r"//.*", "", text)
    out = []
    for l in text.split("\n"):
        l = l.rstrip()
        if l.strip():
            out.append(l)
    return out


def canonical_files():
    files = {}
    for root, _, names in os.walk(CANON):
        if "build" in root.split(os.sep) or "third_party" in root.split(os.sep):
            continue
        for n in names:
            files[n] = os.path.join(root, n)
    return files


def compare(fs):
    canon = canonical_files()
    exact, differing, missing, extra = [], [], [], []

    for name, path in sorted(canon.items()):
        if name not in fs:
            missing.append(name)
            continue
        want = strip_code(open(path).read(), name)
        got = strip_code("\n".join(fs[name]), name)
        if want == got:
            exact.append(name)
        else:
            differing.append((name, want, got))

    for name in sorted(fs):
        if name not in canon:
            extra.append(name)
    return exact, differing, missing, extra


def show_diff(name, want, got, limit=12):
    print(f"\n  --- {name} differs ---")
    shown = 0
    n = max(len(want), len(got))
    for i in range(n):
        w = want[i] if i < len(want) else "<missing>"
        g = got[i] if i < len(got) else "<missing>"
        if w != g:
            print(f"    line {i+1}:\n      canonical: {w}\n      chapters : {g}")
            shown += 1
            if shown >= limit:
                print(f"    ... ({sum(1 for a,b in zip(want,got) if a!=b)} "
                      f"differing lines total, {len(want)} vs {len(got)} lines)")
                break


# --------------------------------------------------------------------------
# (b) lint
# --------------------------------------------------------------------------

def lint(chapters):
    problems = []
    rows = []
    for ch in chapters:
        blocks, code, prose = parse_blocks(ch)
        base = os.path.basename(ch)
        head = open(ch).read()[:1200]
        exempt = "**Files created: none" in head

        code_blocks = [b for b in blocks if b["lang"] not in NON_CODE_LANGS]
        anchored = 0
        oversized = []
        for b in code_blocks:
            para = b["para"]
            throwaway = "throwaway" in para.lower() or "scratch/" in para
            cap = THROWAWAY_CAP if throwaway else TEACHING_CAP
            n = added_count(b)
            if n > cap:
                oversized.append((b["line"], n, cap))
            if target_of(b) or "illustration only" in para.lower() \
               or "don't type this" in para.lower() or exempt:
                anchored += 1
            else:
                problems.append(f"{base}:{b['line']}: block is not anchored to a "
                                f"file and is not marked as an illustration")

        # count only ADDED lines toward the code percentage
        added = sum(added_count(b) + 2 for b in blocks)
        total = added + prose
        pct = 100.0 * added / total if total else 0.0

        for line, n, cap in oversized:
            problems.append(f"{base}:{line}: block has {n} added lines (cap {cap})")
        if pct > CODE_PCT_CAP:
            problems.append(f"{base}: {pct:.1f}% code (cap {CODE_PCT_CAP}%)")

        sizes = [added_count(b) for b in code_blocks] or [0]
        rows.append((base, total, pct, len(code_blocks), max(sizes),
                     sum(sizes) / len(sizes), 100.0 * anchored / len(code_blocks)
                     if code_blocks else 100.0))
    return rows, problems


# --------------------------------------------------------------------------

def emit(fs, outdir):
    """Write the reconstructed files into a real tree, so it can be compiled."""
    layout = {}
    for root, _, names in os.walk(CANON):
        if "build" in root.split(os.sep):
            continue
        for n in names:
            layout[n] = os.path.relpath(os.path.join(root, n), CANON)
    written = 0
    for name, lines in fs.items():
        rel = layout.get(name, name)
        dest = os.path.join(outdir, rel)
        os.makedirs(os.path.dirname(dest) or ".", exist_ok=True)
        with open(dest, "w") as f:
            f.write("\n".join(lines) + "\n")
        written += 1
    # third_party is vendored, not authored by the chapters
    src = os.path.join(CANON, "third_party", "vk_mem_alloc.h")
    if os.path.exists(src):
        os.makedirs(os.path.join(outdir, "third_party"), exist_ok=True)
        with open(src) as a, open(os.path.join(outdir, "third_party",
                                               "vk_mem_alloc.h"), "w") as b:
            b.write(a.read())
    return written


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    partial = "--partial" in sys.argv
    outdir = None
    for a in sys.argv[1:]:
        if a.startswith("--emit="):
            outdir = a.split("=", 1)[1]
    pattern = args[0] if args else "guides/space-fighter-vulkan/docs/*.md"
    chapters = sorted(glob.glob(pattern))
    if not chapters:
        print(f"no chapters matched {pattern}")
        return 1

    print("=" * 78)
    print("(b) FORMAT LINT")
    print("=" * 78)
    rows, lint_problems = lint(chapters)
    print(f"{'chapter':<38}{'lines':>6}{'code%':>7}{'blks':>6}{'max+':>6}"
          f"{'avg+':>7}{'anch':>6}")
    print("-" * 78)
    for base, total, pct, nb, mx, avg, anch in rows:
        print(f"{base:<38}{total:>6}{pct:>6.1f}%{nb:>6}{mx:>6}{avg:>7.1f}{anch:>5.0f}%")
    print("-" * 78)
    allsizes = []
    for ch in chapters:
        bs, _, _ = parse_blocks(ch)
        allsizes += [added_count(b) for b in bs if b["lang"] not in NON_CODE_LANGS]
    if allsizes:
        print(f"{len(allsizes)} code blocks   avg {sum(allsizes)/len(allsizes):.1f} "
              f"added lines   largest {max(allsizes)}   "
              f"over-{TEACHING_CAP}: {sum(1 for s in allsizes if s > TEACHING_CAP)}")

    print()
    print("=" * 78)
    print("(a) RECONSTRUCTION")
    print("=" * 78)
    fs, recon_problems = reconstruct(chapters)
    for p in recon_problems:
        print("  FAIL " + p)
    print(f"  replayed to {len(fs)} files")
    if outdir:
        print(f"  wrote {emit(fs, outdir)} files to {outdir}")

    ok = True
    if not partial:
        exact, differing, missing, extra = compare(fs)
        total = len(exact) + len(differing) + len(missing)
        print(f"\n  {len(exact)} of {total} files reconstruct exactly "
              f"(code only; comments and blank lines ignored)")
        if missing:
            print(f"  MISSING from the chapters ({len(missing)}): "
                  + ", ".join(missing))
        if extra:
            print(f"  EXTRA, not in canonical ({len(extra)}): " + ", ".join(extra))
        for name, want, got in differing:
            show_diff(name, want, got)
        ok = not (differing or missing or extra)

    print()
    print("=" * 78)
    if lint_problems:
        print(f"LINT: {len(lint_problems)} problem(s)")
        for p in lint_problems:
            print("  " + p)
    else:
        print("LINT: clean")
    if recon_problems:
        print(f"RECONSTRUCTION: {len(recon_problems)} problem(s)")
    elif not partial:
        print("RECONSTRUCTION: " + ("all files match canonical" if ok else "MISMATCH"))
    else:
        print("RECONSTRUCTION: replay clean (comparison skipped: --partial)")
    print("=" * 78)

    return 0 if (ok and not lint_problems and not recon_problems) else 1


if __name__ == "__main__":
    sys.exit(main())
