#!/usr/bin/env python3
"""Measure code-vs-prose ratios and block sizes in a guide's chapters."""
import re, sys, os, glob

def analyse(path):
    lines = open(path).read().split("\n")
    in_block = False
    lang = None
    blocks = []          # (lang, size, start_line, anchored)
    cur = []
    cur_start = 0
    code_lines = 0
    prose_lines = 0
    for i, ln in enumerate(lines, 1):
        m = re.match(r"^\s*```(\w*)", ln)
        if m and not in_block:
            in_block = True; lang = m.group(1) or "(none)"; cur = []; cur_start = i
            continue
        if in_block and re.match(r"^\s*```\s*$", ln):
            in_block = False
            # anchoring: look at preceding 3 non-blank lines for a file reference
            j = cur_start - 2
            ctx = []
            while j >= 0 and len(ctx) < 3:
                if lines[j].strip():
                    ctx.append(lines[j])
                elif ctx:
                    break
                j -= 1
            ctxs = " ".join(ctx)
            anchored = bool(re.search(r"`[\w./]+\.(cpp|hpp|h|txt|vert|frag|md|cmake|swift|glsl|py|json)`", ctxs)
                            or "CMakeLists" in ctxs)
            if lang == "diff":
                added = sum(1 for l in cur if l.startswith("+"))
            else:
                added = len(cur)
            blocks.append((lang, added, len(cur), cur_start, anchored))
            code_lines += len(cur) + 2
            continue
        if in_block:
            cur.append(ln)
        else:
            prose_lines += 1
    total = code_lines + prose_lines
    return dict(path=path, code=code_lines, prose=prose_lines, total=total,
                pct=100.0*code_lines/total if total else 0, blocks=blocks)

def report(paths):
    all_blocks = []
    print(f"{'chapter':<40} {'lines':>6} {'code':>6} {'code%':>6} {'blks':>5} {'max+':>5} {'avg+':>6} {'anch%':>6}")
    print("-"*90)
    tot_c = tot_t = 0
    for p in paths:
        r = analyse(p)
        bs = r["blocks"]
        codeb = [b for b in bs if b[0] not in ("console","text","mermaid","(none)")]
        sizes = [b[1] for b in codeb] or [0]
        anch = [b for b in codeb if b[4]]
        all_blocks += [(p,)+b for b in codeb]
        tot_c += r["code"]; tot_t += r["total"]
        print(f"{os.path.basename(p):<40} {r['total']:>6} {r['code']:>6} {r['pct']:>5.1f}% {len(codeb):>5} {max(sizes):>5} {sum(sizes)/len(sizes):>6.1f} "
              f"{100.0*len(anch)/len(codeb) if codeb else 0:>5.0f}%")
    print("-"*90)
    print(f"{'TOTAL':<40} {tot_t:>6} {tot_c:>6} {100.0*tot_c/tot_t:>5.1f}%")
    sizes = sorted([(b[2], b[0], b[4]) for b in all_blocks], reverse=True)
    print(f"\nLargest blocks (added lines):")
    for s, p, ln in sizes[:12]:
        print(f"  {s:>4}  {os.path.basename(p)}:{ln}")
    n = len(all_blocks)
    over20 = sum(1 for b in all_blocks if b[2] > 20)
    print(f"\ncode blocks: {n}   avg added: {sum(b[2] for b in all_blocks)/n:.1f}   >20 added: {over20} ({100.0*over20/n:.0f}%)")
    print(f"anchored: {sum(1 for b in all_blocks if b[5])}/{n} ({100.0*sum(1 for b in all_blocks if b[5])/n:.0f}%)")

if __name__ == "__main__":
    report(sorted(glob.glob(sys.argv[1])))
