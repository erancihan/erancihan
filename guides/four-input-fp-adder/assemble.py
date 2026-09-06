#!/usr/bin/env python3
"""Assemble guide.md from front-matter.md plus chapters/ch01..ch14.

Run from guides/four-input-fp-adder/:   python3 assemble.py

The merge is mechanical and re-runnable.  It does exactly three things:

  1. drops the per-file "<!-- ... sections complete: N/N -->" build markers
     (and the blank line that follows each), which are authoring scaffolding;
  2. substitutes a generated two-level table of contents for the "<!-- TOC -->"
     placeholder in front-matter.md;
  3. joins the pieces with a single blank line.

Chapter bodies are otherwise copied byte for byte.  Headings are NOT rewritten:
every chapter file already carries its own "# Chapter N — Title" heading and its
"##" sections, so the merged document has one clean hierarchy already.

Heading detection is fence-aware: "#" lines inside ``` blocks are Makefile and
python comments, not headings, and must never reach the table of contents.
"""
import re
import sys

CHAPTERS = ['chapters/ch%02d.md' % n for n in range(1, 15)]
FRONT = 'front-matter.md'
OUT = 'guide.md'

MARKER = re.compile(r'^<!--\s*(?:front matter )?sections complete:\s*\d+/\d+\s*-->\s*$')
FENCE = re.compile(r'^\s*(```|~~~)')


def strip_marker(text):
    """Remove the build-status marker line and one following blank line."""
    lines = text.split('\n')
    out = []
    i = 0
    while i < len(lines):
        if MARKER.match(lines[i]):
            i += 1
            if i < len(lines) and lines[i].strip() == '':
                i += 1
            continue
        out.append(lines[i])
        i += 1
    return '\n'.join(out)


def headings(text):
    """(level, title) for every ATX heading outside a fenced code block."""
    found = []
    infence = False
    for line in text.split('\n'):
        if FENCE.match(line):
            infence = not infence
            continue
        if infence:
            continue
        m = re.match(r'^(#{1,2})\s+(.+?)\s*$', line)
        if m:
            found.append((len(m.group(1)), m.group(2).strip()))
    return found


def slug(title, seen):
    """GitHub-style anchor slug, with the -1/-2 disambiguation GitHub applies."""
    s = title.lower()
    s = s.replace('`', '')
    s = re.sub(r'[^\w\s-]', '', s, flags=re.UNICODE)
    s = re.sub(r'\s+', '-', s.strip())
    n = seen.get(s, 0)
    seen[s] = n + 1
    return s if n == 0 else '%s-%d' % (s, n)


def main():
    front = strip_marker(open(FRONT).read())
    bodies = [strip_marker(open(f).read()) for f in CHAPTERS]

    # --- build the TOC over the whole assembled document -------------------
    seen = {}
    # the guide title itself claims the first slug
    title_line = front.split('\n', 1)[0]
    slug(re.sub(r'^#\s+', '', title_line), seen)

    toc = []
    for lvl, t in headings(front):
        if lvl == 1:
            continue
        if t == 'Contents':          # the table of contents does not list itself
            slug(t, seen)
            continue
        toc.append('- [%s](#%s)' % (t, slug(t, seen)))
    for body in bodies:
        hs = headings(body)
        for lvl, t in hs:
            if lvl == 1:
                toc.append('')
                toc.append('**[%s](#%s)**' % (t, slug(t, seen)))
                toc.append('')
            else:
                toc.append('- [%s](#%s)' % (t, slug(t, seen)))

    if '<!-- TOC -->' not in front:
        sys.exit('front-matter.md has no <!-- TOC --> placeholder')
    front = front.replace('<!-- TOC -->', '\n'.join(toc))

    parts = [front.rstrip('\n')] + [b.rstrip('\n') for b in bodies]
    open(OUT, 'w').write('\n\n'.join(parts) + '\n')

    print('wrote %s' % OUT)
    print('  front matter : %6d words' % len(open(FRONT).read().split()))
    tot = 0
    for f, b in zip(CHAPTERS, bodies):
        w = len(open(f).read().split())
        tot += w
        print('  %-18s %6d words' % (f, w))
    print('  chapters total %6d words' % tot)
    print('  guide.md       %6d words' % len(open(OUT).read().split()))


if __name__ == '__main__':
    main()
