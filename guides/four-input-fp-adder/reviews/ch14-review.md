# Chapter 14 review — round 1 — persona: Citation checker

<!-- sections complete: 11/11 -->

## Verdict

# Score: 8 / 10 — real defects, all correctable; the citation set itself is clean

**What I did.** Re-fetched **88 URLs** with `curl` (recording status, content-type, size,
effective URL and saving every body), cross-checked the disputed ones through `WebFetch`,
extracted text from all 12 cited PDFs with `pypdf` and from 19 HTML sources by
tag-stripping, and substring-tested **73 quoted strings** under whitespace- and
PDF-artifact-tolerant normalisations. Re-ran the chapter's three `python3` models. Ran
`bash run_all.sh ch14` and the full `SIM_TIMEOUT=120 bash run_all.sh` cold. Rebuilt all
**nine mutants** and all **three required failures** from scratch. Audited every
cross-chapter reference and every restated number against the source chapter.

**The core job — the citation set — comes back clean.** No invented URL. No malformed
URL. No unresolved DOI. No entry whose URL points at something other than what it claims.
Numbering is 1-86 with no gaps and no duplicates. The two DOIs the chapter prints are
both accounted for by an observed resolution, and the one it endorses
(`10.14529/jsfi170206`) does land on the Gustafson & Yonemoto article. All 33 URLs
chapters 1-13 ship are alive, exactly as claimed. **Every one of the ~40 verbatim
quotations that carries a technical claim checks out** — including all three `[sic]`
misspellings, the four TF32 sentences, all ten augmented-operations strings, all six posit
standard definitions, all five Fasi et al. V100 conclusion bullets, and the twelve
de Dinechin counterweight strings. The chapter's most distinctive methodological findings
reproduce field for field: `github.com` 403-to-curl / 200-to-WebFetch with **493 commits
on master**, `hal.science` 200-to-curl / 403-Anubis-"Oh noes!"-to-WebFetch, sunburst's
200-to-a-search-page, Springer's cookie wall, the `digitalsignallabs` TLS reset, the
Wikipedia `Kulisch_accumulator` 404. The `~280`-bit derivation and its cross-check against
Uguen & de Dinechin's Table 1 (80 / 554 / 4196) both hold; the census model reproduces
ch05's E4M3 table and NVIDIA's 448 and 57,344 from field widths alone; the posit decoder
reproduces Table 1's fraction-length row and the 2²⁰ crossover that the de Dinechin
"golden zone" independently names. The eight `grep` literal counts (48/29/14/12/9/9/5/1)
reproduce **to the digit**. `tb_mono4` runs green cold, its census line matches to every
field, all three required failures fire exactly as recorded, and all nine mutants die.
I adjudicated the NVIDIA E4M3 dispute by fetching: **the writer is right and the research
note is wrong** — the passage is present at the current URL today, on a page now titled
"Using FP8 and FP4 with Transformer Engine".

**Why not 9.** Two defects are blocking-grade under this guide's own rules, and both are
cases of the chapter failing a rule it spends 18,000 words establishing.

1. **The mutation record's headline split is wrong.** The chapter's central caveat — "8 of
   9 mutants died to pinned directed vectors rather than to monotonicity", with "zero order
   violations recorded" and "every one is perfectly monotonic" — does not survive
   reproduction. M1, an inverted result sign bit, composes the tree with negation and
   therefore **reverses** the order: I measure **11,737 order violations**, exactly equal
   to the baseline's `n_strict`, not 0. M2 is placement-ambiguous and none of three
   readings reproduces its recorded row. M9's 358 violations reproduce exactly. The
   qualitative conclusion (six of nine badly wrong adders sail through the order check;
   monotonicity is a weak property) is intact and still striking — but the number in the
   chapter, the README, the measured-here table and STATE.md is not what the code does,
   and a reviewer was specifically asked to check it.
2. **The chapter misquotes chapter 5.** *"So chapter 12's plan: parameterise the adder
   on `EXP_W` and `MANT_W`…"* is printed as a quotation; ch05 line 489 says *"So the plan
   this argument recommends: …"*. A paraphrase inside quotation marks, under Rule 3, in
   the chapter that made Rule 3.

Below those: two shipped MIT OCW sources cited by ch01 never enter the 86-entry
bibliography; two numbers in the closing arc are wrong (ch03 has **fourteen** classic bugs,
not nine; ch02 has **40** modules / 27 targets, not thirty-three); the 640-bit Kulisch
figure is presented as following from a construction it does not follow from and is
attested in nothing fetched; "enumerated over all patterns … posit32" is not feasible with
the printed decoder (≈13 hours, and the checklist tells readers to do it); nine
`[title-only]` tags lack the reason Rule 2 demands; the Traps section says two 202 DOIs
are "not printed" when the bibliography prints both; and the declared 10,832/7,983
body/bibliography split is really 14,174/4,641 — the bibliography figure silently absorbs
2,422 words of closing prose.

**What is excellent, and should not be lost in the fix round.** The three-mechanism
"an HTTP 200 is not a verification" account is the best-executed passage in the chapter and
every part of it is independently supportable. The `[verified but not quotable]` and
`[title-only — blocked here]` tags do real work and are applied consistently. The refusal
to quote the OCP specification it could not read, while still cashing out the E4M3
collision from two independent fetched confirmations, is exactly right. The
"is there hardware?" paragraph states the weaker evidence-supported sentence instead of
the satisfying one. Entries 85 and 86 — sources met only through someone else's summary,
declared once rather than hedged at each mention — are the most honest citation practice
in the whole guide. The bibliography is genuine reference material at ~54 words an entry,
not padding. And the closing section really does close the book rather than the chapter.

Fix B1, B2 and D1-D7, and this is a 9. None of them requires new research.

## URL verification table

**Method.** 88 URLs were re-requested from this container on 2026-08-21 with
`curl -sS -L --max-time 45 -o <file> -w '%{http_code}\t%{content_type}\t%{size_download}\t%{url_effective}'`,
saving every body. That set is the union of (a) every URL the chapter prints, (b) every
URL the bibliography lists including the ones given without a scheme in backticks, and
(c) the sub-pages the chapter names collectively (the three `iverilog` usage pages, the
Wikipedia articles named only by title in entries 56 and 77, the sibling MIMS eprint,
the arXiv PDFs). **Content-type and body bytes were inspected for every one**, per the
chapter's own Rule 1; disputed results were retried through `WebFetch`.

**Headline: no invented URL, no malformed URL, no unresolved DOI, and no entry whose URL
points to something other than what it claims.** Numbering is **1-86 with zero gaps and
zero duplicates** (verified mechanically over the `### Part A` … `## What This Guide
Measured` span: entry 1 as a bold paragraph, 2-61 as table rows, 62-86 as bold
paragraphs).

### Results by outcome

| outcome | count | notes |
|---|---|---|
| 200 with the expected content | 74 | includes all 12 PDFs, `%PDF` magic confirmed |
| 200 that is **not** the cited work | 3 | sunburst-design, Springer, `cloud.google.com` (all three already tagged in the chapter) |
| 403 | 6 | `dl.acm.org`, `opencompute.org` (both `opencompute.org` and `www.`), `peerj.com/articles/cs-330/`, `siam.org`, two `github.com` paths |
| 202 (landing page, zero bytes) | 2 | both DOIs the chapter records as 202 |
| 404 | 1 | `en.wikipedia.org/wiki/Kulisch_accumulator` — the chapter's deliberate negative result |
| 400 | 1 | bare `https://github.com` (my probe, not a cited URL) |
| TLS reset, no status | 1 | `www.digitalsignallabs.com` |

### The chapter's three "200 is not resolution" mechanisms, re-tested

| mechanism | chapter's claim | my result |
|---|---|---|
| off-host redirect | `sunburst-design.com/.../CummingsSNUG2000SJ_NBA.pdf` 200s to a Paradigm Works **search page** | **REPRODUCES EXACTLY.** 200, `text/html`, 189,459 bytes, effective URL `https://www.paradigm-works.com/technical-library?term=Nonblocking+Assignments+…Kill%21` — byte-for-byte the same length as fetching the Paradigm Works search URL directly |
| cookie wall | Springer's Kulisch article 200s to a cookie-error landing page | **REPRODUCES**, with a wrinkle worth recording. Default `curl` UA: 200, effective URL grown to `…?error=cookies_not_supported&code=6b6cdb2a-…`. Browser UA: 200, 3,038 bytes, `<title>Client Challenge</title>`. Two different non-article 200s from one URL |
| bot interstitial | `posithub.org/docs/posit_standard-2.pdf` 200s with `content-type: text/html` | **DID NOT REPRODUCE.** My cold `curl` got 200, `content-type: application/pdf`, **138,415 bytes** — the real standard, matching the chapter's "138 KB". `pypdf` extracted it and every posit quotation checks out. The interstitial is real but intermittent; the chapter's claim is a session observation and should be marked as one |

### The two-fetch-path disagreement, re-tested both ways

| URL | `curl` here | `WebFetch` here | chapter's claim |
|---|---|---|---|
| `github.com/gtkwave/gtkwave` | **403** (`application/json`, 378 B) | **200** — "gtkwave/gtkwave", **GPL-2.0**, not archived, **493 Commits** on master | 403 / 200, GPL-2.0, not archived, 493 commits — **CONFIRMED, every field** |
| `hal.science/hal-01488916` | **200** | **403** — page titled **"Oh noes!"**, "Access Denied … Protected by Anubis" | 200 / 403 Anubis "Oh noes!" — **CONFIRMED, including the page title** |

**A fourth mechanism, found here and not in the chapter.** `hal.science` now also serves
the Anubis interstitial **to `curl`** when the User-Agent looks like a browser: with
`-A "Mozilla/5.0 (Windows NT 10.0…)"` the PDF endpoint returns 200 / `text/html` /
12,603 bytes of "Making sure you're not a bot!"; with the default `curl/8.x` UA the same
URL returns 200 / `application/pdf` / 383,047 bytes. **All four HAL URLs the chapter
cites (entries 64, 67, 80's record page, and the B.5 `hal-02982017` item) behave this
way.** This does not falsify anything the chapter says — its recorded result is the one a
default `curl` gets — but a re-verifier who "helpfully" sets a browser UA will record
four false failures on the sources half the accumulator and augmented-operations sections
rest on. Worth one sentence in the bibliography's fetch-path subsection.

The chapter also notes the legacy `hal.archives-ouvertes.fr` host "still redirects
correctly": **confirmed** — `hal.archives-ouvertes.fr/hal-01488916/document` 302s to
`hal.science/hal-01488916/document` and delivers the identical 383,047-byte PDF.

### Individually checked, entry by entry (the load-bearing ones)

| entry | URL | result |
|---|---|---|
| 1 | `standards.ieee.org/ieee/754/6210/` | 200, purchase/record page — `[verified but not quotable]` is right |
| 2 | `standards.ieee.org/ieee/1364/3641/` | 200 |
| 9 | `doi.org/10.1515/9783110301793` | **202**, 0 bytes, resolves to `degruyterbrill.com/document/doi/10.1515/9783110301793/html` — exactly as recorded |
| 9 | `en.wikipedia.org/wiki/Kulisch_accumulator` | **404** — confirmed, and the chapter is right to print the negative |
| 11 | `docs.oracle.com/…/ncg_goldberg.html` | 200, the full Goldberg text |
| 35 | `doi.org/10.1109/TCSI.2014.2333680` | **202**, resolves to `ieeexplore.ieee.org/document/6862076` — a redirect target, not a document, as recorded |
| 39, 40, 41 | MIT 6.375 mirrors, `lcdm-eng.com` | all 200 `application/pdf` |
| 46 | five Icarus URLs incl. `raw.githubusercontent.com` | all 200; the `raw.` / `github.com` asymmetry the chapter flags is real |
| 48 | both `jhauser.us` plain-`http://` URLs | 200, **no redirect to HTTPS** — the chapter's warning is correct |
| 51 | `gtkwave.sourceforge.net`, `gtkwave.github.io/.../mac.html` | 200 / 200; the two `github.com` URLs 403 to curl, 200 via WebFetch |
| 57 | `www.digitalsignallabs.com/` | **`curl: (35) Recv failure: Connection reset by peer`** — TLS layer, no status. Confirmed, and worse than ch06's recorded 503 |
| 62, 63, 70, 75, 82, 83 | all six arXiv abs pages | 200; PDFs 200 `application/pdf` |
| 64 | `hal.science/hal-01488916` + `/document` | 200 record page (82,680 B), 200 PDF (383,047 B) with default UA |
| 65 | `acsel-lab.com/arithmetic/arith25/pdf/34.pdf` | 200, `application/pdf`, 135,186 B — the Riedy & Demmel paper |
| 65 | `par.nsf.gov/biblio/10089378-…` | 200, the NSF mirror record |
| 66 | `754r.ucbtest.org/background/` + `grouper.ieee.org/…/background/` | 200 / 200, both carrying the quoted text |
| 67 | `hal.science/hal-02137968v1/file/Emulation-RN0-HalVersion.pdf` | 200 PDF (347,152 B) |
| 71 | `opencompute.org` and `www.opencompute.org` and a document URL | **403 to both fetch paths** — confirmed |
| 72 | TE 2.3.0 primer | 200, and the quoted passage present |
| 73, 74 | both NVIDIA developer-blog posts | 200 |
| 76 | `cloud.google.com/tpu/docs/bfloat16` | 200, **effective URL `docs.cloud.google.com/tpu/docs/bfloat16`** — the chapter's "cite the effective URL" instruction is correct |
| 78 | `posithub.org/docs/posit_standard-2.pdf` + `posithub.org/` | 200 `application/pdf` 138,415 B / 200 |
| 79 | `superfri.org/…/view/137` and DOI `10.14529/jsfi170206` | 200; the DOI **resolves to that exact URL**, and the page title is "Beating Floating Point at its Own Game: Posit Arithmetic" — the printed DOI is safe |
| 80 | Berkeley PDF, `inria.hal.science/hal-01959581`, `posithub.org/conga/2019/programme` | 200 / 200 / 200 |
| 81 | `eprints.maths.manchester.ac.uk/2774/1/fhmp20.pdf` + sibling `2761` | 200 / 200; `peerj.com/articles/cs-330/` **403** as recorded |
| 84 | NVIDIA Ampere whitepaper PDF | 200, 7.98 MB `application/pdf` |
| B.5 | fprox, `~wkahan/`, `inria.hal.science/hal-02982017/document` | 200 / 200 / 200 (the last needs the default UA) |

### Defects found in the URL set

1. **Two URLs the guide ships are audited but never enter the bibliography.** Chapter 1's
   numbered sources 2 and 3 are MIT 6.004 OpenCourseWare pages —
   `ocw.mit.edu/courses/6-004-computation-structures-spring-2017/pages/c4/` and `…/c5/`.
   Both are in the research notes' 33-row audit (rows 3-4, both 200), both return **200**
   here, and **neither appears anywhere in the 86 entries.** The chapter says its Part A
   is "sixty-one that chapters 1-13 already cite, consolidated and de-duplicated from
   their own source lists"; two shipped, live, cited sources are missing from that
   consolidation.
2. **Entry B.5 prints the wrong Kahan URL.** ch07 cites
   `people.eecs.berkeley.edu/~wkahan/ieee754status/754story.html` (200 here). B.5 prints
   only the directory root `people.eecs.berkeley.edu/~wkahan/`, described as "already the
   home of ch07's 754 history source". A reader following the bibliography cannot reach
   the cited document.
3. **At least nine `[title-only]` entries carry no reason**, against the chapter's own
   Rule 2 ("tagged `[title-only]`, with the *reason* stated"): entries **4, 5, 30, 34, 36,
   37, 38, 43, 45, 60**. Entry 3 says "paywalled" and entry 6 says "withdrawn"; entry 4
   (IEEE 1800-2017) and entry 5 (IEEE 1800.2-2020) give none, though both are paywalled
   for the same reason as entry 3. A.2's blanket ("None has a free full text") is a proper
   reason and covers 7-28; A.3's header ("`[title-only]` unless a fetch is noted") states
   the *tag*, not the *reason*, and so does not discharge Rule 2 for 30, 34, 36, 37, 38,
   43 and 45.
4. **"Two DOIs … which is why neither is printed" is false — both are printed.** The
   "Traps Beginners Fall Into" section says two DOIs return 202 "which is why neither is
   printed". Entry 9 prints `<https://doi.org/10.1515/9783110301793>` and entry 35 prints
   `<https://doi.org/10.1109/TCSI.2014.2333680>`, both as live angle-bracket links. The
   entries themselves say the right thing ("so no URL is asserted"); the Traps sentence
   contradicts the bibliography it summarises.
5. **The 418 did not reproduce.** The chapter records `ieeexplore.ieee.org` returning
   "418 I'm a teapot" (one 418 in the 97-fetch tally). Today the Xplore root returns
   **200** and document URLs return **202**. Not a defect in the chapter — the recorded
   observation was real — but the sentence "IEEE Xplore returns 418 to this machine" and
   the `418` row in the tally should be dated, since the failure mode is not stable.
6. **Springer's failure mode has drifted**, as with digitalsignallabs before it: the
   `?error=cookies_not_supported` landing page is what a default UA gets, but a browser UA
   now gets an Akamai "Client Challenge". The chapter's description ("The bytes are a
   cookie-error landing page") is right for one path and incomplete for the other.

## Quotation verification

**Method.** Every source that carries a quotation was downloaded and converted to text
here — PDFs with `pypdf` 6.16.1 (the installed build's `cryptography` backend panics on
import, so the crypt providers were stubbed out; extraction itself is unaffected), HTML
by tag-stripping and entity-unescaping. **73 quoted strings** were then substring-tested
under two normalisations: whitespace-collapsed (`ws`), and a "squeeze" that removes all
whitespace and hyphens after NFKC + ligature + dash + curly-quote folding, which is what
it takes to match a PDF text layer that splits hyphenated words across line breaks,
collapses `fi`/`fl` ligatures, or drops inter-word spaces. Every failing case was then
re-extracted **programmatically from `ch14.md` itself** rather than retyped, so my own
transcription could not manufacture a defect.

**Result: 50 EXACT, 16 exact-after-PDF-normalisation, 1 correct elision, 6 with an added
terminal period, 0 fabricated, 0 paraphrased.**

### The load-bearing quotations all verify

Every quotation supporting a technical claim about single-rounding architectures,
augmented operations, format definitions or accelerator behaviour was checked. All pass.

| group | source | strings checked | result |
|---|---|---|---|
| Mikaitis's four classes + the *n* ≥ 4 result | `arxiv.org/pdf/2304.01407` | 11 | all present; see the two notes below |
| Kulisch-accumulator widths, the 4288 provenance, the FPGA cost | Uguen & de Dinechin PDF | 3 | **all EXACT**, including `"absorbe [sic]"` and `"The Proposed 1 accumulator requires 5x the resources, but brings in a 30x latency improvement."` |
| alignment as the serial bottleneck, the 3-23 % / 4-26 % savings | Alexandridis & Dimitrakopoulos | 2 | **both EXACT** |
| 754-2019 committee background (approval date, chair/editor, the 9.5 sentence, the rationale sentence) | `754r.ucbtest.org/background/` | 3 | **all EXACT**, and independently present at the `grouper.ieee.org` mirror |
| augmented operations: abstract, twoSum mechanism, gradual-underflow precondition, abrupt-underflow warning, roundTiesToZero rationale, all four exceptional-case rules | Riedy & Demmel ARITH-25 PDF | 10 | **all EXACT or squeeze-EXACT**, including the `"a 33% speed improvements [sic]"` grammatical slip |
| "the paper exists because the hardware does not" | Boldo/Lauter/Muller HAL PDF | 1 | present; one nit below |
| bfloat16 definition, "approximate dynamic range" | Wikipedia bfloat16 | 2 | **both EXACT** |
| TF32: 8/10/1 layout, "same range of values as FP32", operation-mode-not-a-type, round-multiply-accumulate | NVIDIA TF32 blog | 4 | **all four EXACT** — the chapter's "all four strings confirmed verbatim" is true |
| FP8 abstract incl. `"representatio [sic]"` | `arxiv.org/abs/2209.05433` | 1 | **EXACT**, typo and all |
| E4M3/E5M2 datatype passage, FP16 loss-scaling, per-tensor scaling | TE 2.3.0 primer | 3 | **all three EXACT** |
| posit standard: exponent bits, exponent, regime bits, regime, NaR, the 16*n* quire | `posit_standard-2.pdf` | 6 | **all six squeeze-EXACT**; the missing-inter-word-space artifact the chapter documents is exactly what forces squeeze matching |
| Gustafson & Yonemoto abstract | `superfri.org/…/view/137` | 1 | **EXACT** |
| de Dinechin et al.: golden zone, the "corners" caution, comparable area/latency, the LDC trade, the quire cost paragraph, Kulisch support, the "few products" caution, the incomplete-quire criticism, the storage-format alternative, double rounding, "rebuilt from scratch", the subnormal-conversion note | CoNGA 2019 PDF | 12 | **all present** |
| TPU: 65,536 8-bit MAC, 15X-30X | `arxiv.org/abs/1704.04760` | 2 | **both EXACT** |
| Fasi et al.: Volta white-paper sentence, the three unspecified items, the "loose requirements" consequence, the PTX sentence, all five V100 conclusion bullets, the `{3.23}`/`{4.24}` width sentence, the non-monotonicity sentence | MIMS eprint PDF | 12 | **all present** |
| Markidis abstract opener | `arxiv.org/abs/1803.04014` | 1 | **EXACT** |

The three `[sic]` misspellings the chapter promises are all real and all reproduce:
**"representatio"** in the arXiv FP8 abstract, **"a 33% speed improvements"** in the
Riedy & Demmel abstract, **"absorbe"** in the Uguen & de Dinechin preprint. A citation
checker who re-fetches does find them, exactly as the chapter predicts.

### Nits — six added terminal periods, one un-noted normalisation

None of these changes a meaning. All of them violate the chapter's own Rule 3, which is
strict ("confirmed by a literal substring test") and is the reason this chapter gets to
claim what it claims. They should be fixed because the rule is the product.

1. **The four Mikaitis class headings gain a full stop the source does not have.** The
   PDF reads `1.2.1 Class I: Adders that use long accumulators\nOne approach is to
   retain…` — no terminal period; the chapter prints `"Class I: Adders that use long
   accumulators."` Same for Classes II, III and IV. (Class II is additionally
   line-wrapped in the source as "correct rounding withou t\nthe use of long
   accumulators", which the squeeze test handles.) *Fix:* drop the period inside the
   quotation marks, or move it outside.
2. **The Boldo quotation ends with a period where the source has a comma.** The source
   sentence continues `…with conventional floating-point operations (with the usual round
   to nearest "ties to even" rounding direction), with reasonable efficiency.` The chapter
   truncates at "operations" and closes with a full stop. 315 of 316 squeezed characters
   match. *Fix:* end with `operations …"` or extend to the sentence's end.
3. **The chapter's quotation of chapter 5 is not verbatim** — see "The guide's own
   measurements" below. This is the one quotation defect that changes an attribution.
4. **The Mikaitis abstract sentence is silently de-LaTeXed.** The chapter quotes
   `"common techniques for performing multi-term addition with n≥4, … increasing one of
   the addends x_i decreases the sum s_n."` The arXiv **abs page** (the URL cited) reads
   `…with $n\geq 4$, …one of the addends $x_i$ decreases the sum $s_n$.` The **PDF** of
   the same v2 reads differently again: `We prove that computing multi-term
   floating-point addition with n ≥ 4, …can result in non-monotonicity—increasing one of
   the addends xi decreases the sum sn.` So the chapter is quoting the abs page with its
   LaTeX rendered — defensible, and the `--` in the chapter matches the abs page rather
   than the PDF's em dash, which shows the writer was careful about *which* source. But
   Rule 3 lists only three extraction artifacts (hyphen splits, ligatures, dropped
   spaces) and this is a fourth. *Fix:* add "LaTeX markup in arXiv abstract listings is
   rendered" to Rule 3's artifact list, or quote the PDF's wording and cite the PDF.
   Worth noting for its own sake that **the two v2 abstracts differ in substance**
   ("common techniques … can result" vs "We prove that computing … can result").
5. The Fasi non-monotonicity quotation's `…` correctly elides a four-item citation list
   (`Kim and Kim, 2009; Tao et al., 2013; Sohn and Swartzlander, 2016; Kaul et al.,
   2019`). **Properly marked; not a defect.** Same for the golden-zone quotation, whose
   odd spacing (`within[2−20,(2− 2−23)· 219)`) is verbatim from the PDF, exactly as the
   chapter warns.

## Attribution and technical claims

Fourteen attributed claims were checked against their fetched sources, and the chapter's
three `python3` models were re-run here.

### 1. The ~280-bit binary32 accumulator — both halves verified

**Derived half.** 128 − (−149) = **277**; 277 + ⌈log₂ 4⌉ + 1 sign = **280**. Arithmetic,
correct, and correctly labelled "arithmetic, not a citation".

**Published-table half.** Uguen & de Dinechin's **Table 1** in the fetched PDF reads,
verbatim: `format bmin bmax min wa / binary16 (half) 2−24 215 80 bits / binary32
(single) 2−149 2127 554 bits / binary64 (double) 2−1074 21023 4196 bits / Table 1:
Accumulator sizes for the IEEE-754 formats`. **80, 554 and 4196 confirmed.** The
chapter's product-span derivation reproduces all three from field widths alone:
2·128 + 2·149 = 554, 2·16 + 2·24 = 80, 2·1024 + 2·1074 = 4196. The cross-check the
chapter says licenses its 277 and 280 **does hold**.

**One should-fix inside this passage.** The chapter writes: *"So 4288 is 4196 plus 92 bits
of headroom, stated rather than inferred; **the same construction gives 554 + 86 = 640**
for binary32 — the number folklore quotes."* The construction is not the same: the
headroom is 92 bits for binary64 and 86 for binary32. Kulisch's headroom is a free
parameter (log₂ of the maximum summand count), so the *arithmetic* is fine, but "the same
construction" implies the same *k* and would give 646. Also, **640 is not attested in any
source fetched here** — it appears nowhere in the Uguen, Mikaitis or de Dinechin PDFs
(searched). The research notes are more careful: they write "~640" and "the analogous
headroom". The chapter hardened a hedge. *Fix:* restore the notes' wording — "the
analogous construction, with a different headroom parameter (86 rather than 92), gives
~640 for binary32, which is the number folklore quotes; no source fetched here states it."

### 2. Mikaitis's four-class taxonomy — accurate

All four class names appear as section headings `1.2.1`-`1.2.4` in the fetched PDF, in the
order and with the wording the chapter gives. The chapter's class assignments are the
paper's own: Kulisch/long accumulators → I; Tenca's fused three-term → II; Kim and Kim's
bit-matching 4-term dot product → III; Kaul et al. / Lopes and Constantinides / Hickmann
et al. → IV. The `fp32_add4` → Class III placement follows from the paper's Class III
definition, not from assertion. The "fused means something different in Class IV" warning
is quoted correctly. **The chapter is also honest that Kim and Kim is quoted *through*
Mikaitis** (entry 85), which is the right form.

### 3. IEEE 754-2019 clause 9.5 and roundTiesToZero — accurate, and correctly sourced

The chapter never quotes the standard; it quotes the revision committee's page and the
proposers' paper, and says so. Both are fetched and both carry the quoted strings. The
substantive claims check out:

- **"recommended and not required, with the committee flagging a possible promotion"** —
  the committee page says exactly `These recommended operations might be required in a
  future edition of this standard.` ✓
- **roundTiesToZero is a sixth rounding direction, required for these operations, and
  independent of other rounding attributes** ✓, and `defined only in the recommended
  augmented arithmetic operations clause` ✓.
- **Gradual underflow is a precondition, not a preference** ✓ — both the positive
  statement and the converse (`Abrupt underflow, for example, breaks the exact
  transformation property of augmentedAddition.`) are verbatim.
- **All four exceptional-case rules** ✓ verbatim, including the counter-intuitive flag
  rule.
- The chapter's conclusion that `augmentedAddition` "is not a mode switch on `fp32_add4`"
  follows from the quoted text (new rounding direction + a second output port) and is
  presented as inference, correctly.
- The **"does anything implement them?"** paragraph is the strongest piece of
  epistemics in the chapter: it states the weaker, evidence-supported sentence rather
  than "no hardware implements them". Correct.

### 4. Fasi et al. on tensor cores — accurate, including the source's own oddity

- **Table 1 device/format matrix reproduced exactly**, all six rows: 2016 TPU v2, 2017 TPU
  v3, 2017 V100, **2018** T4, 2019 ARMv8.6-A, 2020 A100 with four shapes. The A100 row's
  `TensorFloat-32 → binary64` output — which looks like an error in the source — is
  faithfully reproduced rather than silently "corrected". Good practice.
- **Clause 9.4** — the paper says `(IEEE, 2019, Sec. 9.4), since it does not prescribe the
  order in which the partial sums should be evaluated and allows the use of a
  higher-precision internal format`. The chapter's paraphrase is exact and it correctly
  flags that the clause number comes from the paper, not from the standard. ✓
- **The counterexample.** The chapter says "c₁₁ plus four copies of 2⁻²⁴, where
  c₁₁ = 1 − 2⁻²⁴ gives 1 + 2⁻²³ and c₁₁ = 1 gives 1." The paper's own summary lines are
  `d11 = c11 + 2−24 + 2−24 + 2−24 + 2−24 = 1 + 2−23 when c11 = 1− 2−24,` and `… = 1 when
  c11 = 1.` **Exact match.** ✓
- **The `{3.23}`/`{4.24}` reading.** The chapter converts the quoted brace notation to
  "26 to 28 bits" and compares with ch08's 28-bit budget. 3+23 = 26 and 4+24 = 28 ✓, and
  the taxonomy explanation (Class IV, not Class I) is the paper's own framing. ✓
- **The five summands** are equation (2)'s `a11b11 + a12b21 + a13b31 + a14b41 + c11` ✓.

### 5. TPU — accurate, with the right caveats

Both quotations EXACT. The chapter's two annotations — that the matrix unit is **8-bit
integer**, and that the 15X-30X figures are against *2015-era* contemporaries — are both
supportable from the fetched abstract and are exactly the clauses secondary summaries drop.

### 6. OCP / NVIDIA FP8 — accurate, and the ch05 caveat is correctly cashed out

The census model in the chapter was **re-run here verbatim**. Every cell of both tables
reproduces:

| | ch05 IEEE-shaped E4M3 | OCP E4M3 | E5M2 |
|---|---|---|---|
| zeros / subnormals | 2 / 14 | 2 / 14 | 2 / 6 |
| normals | **224** | **238** | **240** |
| infinities | 2 | **0** | 2 |
| NaN encodings | 14 | **2** | 6 |
| max finite | **240** | **448** | **57,344** |

**448 and 57,344 are exactly NVIDIA's published figures**, and the model was told only
`(ew, mw)` — so the E5M2 agreement genuinely does license the E4M3 column, as the chapter
argues. `448 = 1.75 × 2⁸` ✓. "One mantissa bit-pattern for NaNs" ↔ two encodings ✓.
The 1.87× ratio: 448/240 = 1.8667 ✓. Twelve NaN encodings' difference: 14 − 2 ✓.

**The chapter correctly notes ch05's IEEE-shaped E4M3 differs**, and ch05's actual text
(line 485) reads `an IEEE-*shaped* E4M3, with infinities; the OCP FP8 format of the same
name has none, so its population differs)` — the chapter's quotation substitutes a period
for ch05's closing parenthesis, which is trivial. ch05's own census (2 / 14 / 224 / 2 / 14)
matches the chapter's left-hand column exactly.

The chapter is also right that **it quotes no clause of the OCP specification** — I found
no OFP8 or MX quotation anywhere in the text, and `opencompute.org` is 403 to both paths
here, so the `[title-only — blocked here]` tag is correct and honestly applied.

### 7. Posits against the posit standard — every number verified

The chapter's decoder was re-run here. Against the standard's **Table 1** (extracted
verbatim from the PDF: `fractionlength 0to3bits 0to11bits 0to27bits …`, `minPos 2−24 …
2−56 … 2−120`, `maxPos 224 … 256 … 2120`, `quireformatprecision 128bits 256bits 512bits
16𝑛bits`, `quiresumlimit 255 … 287 … 2151`):

| | decoder here | standard's Table 1 |
|---|---|---|
| posit8 minPos / maxPos / max frac bits | 2⁻²⁴ / 2²⁴ / **3** | 2⁻²⁴ / 2²⁴ / "0 to 3 bits" ✓ |
| posit16 | 2⁻⁵⁶ / 2⁵⁶ / **11** | ✓ |
| posit32 | 2⁻¹²⁰ / 2¹²⁰ / **27** | ✓ |
| posit32 quire | 512 bits, sum limit 2¹⁵¹ | ✓ |
| posit8 / posit16 census | 1 zero + 1 NaR + 254 / 65,534 | ✓ — the "a posit spends 2, binary16 spends 2,050" contrast is right |

The **taper table reproduces row for row**, including the load-bearing row: at regime 4,
`[2¹⁶, 2²⁰)`, 6 regime bits, **23 fraction bits** — binary32's precision. And the
independent confirmation the chapter claims is real: de Dinechin et al.'s own text says
`The thresholds2−20 and 220 are not out-of-the-ordinary` — **both routes land on 2²⁰**.

The chapter's normative posit facts all check against the standard: two fixed exponent
bits ✓, power-of-16 regime ✓, one NaR ✓, quire at 16*n* ✓, sponsor NSCC Singapore ✓,
John Gustafson listed as **Chair** ✓, dated **March 2, 2022** ✓, 12 pages ✓.

**One reproducibility defect.** The chapter says *"Enumerated over all patterns: posit8
gives … posit16 gives … posit32 gives 27"* and elsewhere calls these models
"re-runnable in seconds". posit16's full enumeration takes **0.7 s** here; posit32 is
2¹⁶ times larger, i.e. roughly **13 hours** with the printed `Fraction`-based decoder.
posit32's 27 is a *structural* result (`n − 1 − 2 − es`), not an enumerated one. The
"What You Should Be Able to Do Now" checklist tells the reader to "Run the posit decoder
and reproduce Table 1's fraction-length row for **all three precisions**" — a reader who
does that literally will hang. *Fix:* say posit8 and posit16 were enumerated exhaustively
and posit32's 27 derived from the field layout (and spot-checked), and adjust the
checklist item.

### 8. The de Dinechin counterweight — attributed correctly and not adjudicated

Both sides are quoted verbatim and the chapter explicitly declines to settle the
"less circuitry" vs "comparable area and latency" dispute on the ground that it has no
synthesis tool. That is the right call and consistent with ch11's epistemic wall. The
dating rule applied to the quire criticism ("not yet completely specified" — 2019, vs the
2022 standard that does specify it) is correct: the fetched 2022 standard does define the
quire, and I verified the definition is present.

### 9. Vendor-claim hedging — correct in both places

"The same range of values as FP32" (TF32) and "approximate dynamic range" (bfloat16) are
both flagged, and the chapter's arithmetic behind the flag is right: TF32 max finite
3.40116e+38 vs binary32 3.40282e+38 ✓ (recomputed); bfloat16 subnormal floor 2⁻¹³³ =
9.18355e−41 vs binary32's 2⁻¹⁴⁹ ✓, "sixteen binades shallower" ✓, and both formats' min
**normal** identical at 1.17549e−38 ✓.

## The guide's own measurements

### Cross-references by section title — 19 of 19 resolve

Every "chapter *N*'s '<Title>'" reference was extracted mechanically and matched against
the actual `##`/`###` headings of that chapter file. **All resolve.**

| chapter | section title cited by ch14 | resolves |
|---|---|---|
| ch05 | "Verifying Floating Point Specifically" | ✓ |
| ch06 | "Where Fixed Point Runs Out" | ✓ |
| ch07 | "Rounding: Five Attributes, One Default" | ✓ |
| ch07 | "Bias 127, and What the Missing One Buys" | ✓ |
| ch07 | "The Flags an Adder Can Actually Raise" | ✓ |
| ch08 | "Compare, Swap, and the Alignment Shift" | ✓ |
| ch08 | "The Width Budget: 28 Bits" | ✓ |
| ch08 | "Why the Shortcuts Fail" | ✓ |
| ch08 | "The Algorithm: Ten Steps, Stated Once" | ✓ |
| ch08 | "Round, and the Renormalize Random Never Finds" | ✓ |
| ch09 | "Seven Modules and a Top: The Port Map" | ✓ |
| ch10 | "Accuracy Against the Correctly Rounded Sum" | ✓ |
| ch10 | "Rounding Once Instead of Three Times" | ✓ |
| ch10 | "How Often the Shape Matters" | ✓ |
| ch10 | "One Multiset, Three Answers" | ✓ |
| ch10 | "'Both Orders Agree' Is Not an Oracle" | ✓ (ch10's heading uses double quotes; ch14 renests them as single quotes — correct typography, not a mismatch) |
| ch10 | "Flags Under Composition" | ✓ |
| ch11 | "Timing, Fmax, and the Epistemic Wall" | ✓ |
| ch11 | "Cutting at the Priced Seams" | ✓ |
| ch12 | "Seeds for Chapters 13 and 14" | ✓ |
| ch12 | "Pinning the Bins: The Last Unpaid Debt" | ✓ |

The chapter's discipline of citing by title and **not restating** the ch10/ch12 accuracy
tables is honoured — I found no restatement of the 98.3 % / 67.96-73.12 % figures, and
the S3 accuracy numbers are cited by section title only. Good.

### Numbers the chapter does restate — mostly exact, two wrong

**Verified correct:**

- **ch08's 28 bits** ✓ (the section title itself, and ch08's derivation).
- **ch05's E4M3 census** — "2 zeros, 14 subnormals, 224 normals, 2 infinities and 14 NaNs"
  in ch05 line 485; ch14's left-hand column matches to the digit ✓.
- **ch05's "10.6 % of operand pairs involve at least one subnormal against 0.78 % for
  random binary32"** — ch05 line 485 verbatim ✓.
- **ch05's "65,536 pairs at E4M3"** ✓.
- **ch08/ch09's "zero occurrences in a million random pairs"** — ch09 line 352 says
  "**0 times in 1,000,000 random pairs**" ✓.
- **ch10's ">13σ"** — `reviews/ch10-review.md` lines 21 and 105 both give a >13σ gap in
  win2 ✓; the withdrawal of "statistically indistinguishable" is recorded there ✓.
- **ch12's tb_add4_stream "60,000 quadruples (101,000 in the headline run)"** (README) —
  `src/ch12/README.md` records 60,992 shipped and 101,019 headline ✓.
- **`1 << 40` folklore** — ch02 has a section literally headed "The folklore about
  `1 << 40`, corrected" ✓.
- **123/123 repository regression** ✓ — reproduced cold here (see Code and mutations).

**Two restated numbers are wrong:**

1. **"Chapter 3 asked how many of the *nine* classic beginner bugs the simulator reports"
   — ch03's table has FOURTEEN rows.** ch03's own summary sentence is: *"Fourteen bugs;
   one warning at `-Wall`; one further warning available only if you name a class `-Wall`
   leaves out; one compile error."* The "answer was one" half is defensible (one `-Wall`
   warning), but nine is not the count of anything in ch03. *Fix:* "how many of the
   **fourteen** classic beginner bugs".
2. **"Chapter 2 compiled thirty-three throwaway modules" — unattested.** `src/ch02/`
   contains **40 `.v` files and 40 module declarations** (21 non-testbench, 19
   testbenches) and **27 build targets**. Thirty-three matches none of those, and the
   string "thirty-three" / "33 modules" appears nowhere in ch02, `src/ch02/README.md`,
   the ch02 reviews, or STATE.md. *Fix:* use a number the tree supports — "forty
   throwaway modules across twenty-seven build targets" — or drop the count.

### The parameterisation audit — reproduced exactly, and the ch05 correction is real

The chapter's `grep` claims were re-run over exactly the stated scope
(`src/ch09/*.v` plus `src/ch12/fp32_add4.v`):

| claim | measured here |
|---|---|
| 48 × `24'…` | **48** ✓ |
| 29 × `[23:0]` | **29** ✓ |
| 14 × `27'…` | **14** ✓ |
| 12 × `[22:0]` | **12** ✓ |
| 9 × `[26:0]` | **9** ✓ |
| 9 × `23'…` | **9** ✓ |
| 5 × `8'd255` | **5** ✓ |
| 1 × `8'd254` | **1** ✓ |
| zero `parameter`/`localparam` **declarations** in the eight RTL modules and `fp32_add4.v` | ✓ — the only hit in an RTL file is the word "localparam" inside a *comment* in `fp32_align.v` line 8 |
| "the only two files under `src/ch09` that declare one at all are testbenches" | ✓ — `tb_equiv.v` and `tb_short.v`, exactly two |

**All eight literal counts reproduce to the digit.** This is the most impressive
verification in the chapter and it holds.

**ch05's correction is in place and dated.** `chapters/ch05.md` line 491 carries a
blockquote headed *"What chapter 12 actually did, recorded 2026-08-21"* that says exactly
what ch14 says it says, including "every format retarget in chapter 14 is a rewrite, not
an instantiation" and "the reduced-width verification strategy this section argues for was
never exercised on the guide's own design". ✓

### The one quotation defect that changes an attribution

**ch14 misquotes ch05.** The chapter prints, in italics and inside quotation marks:

> *"So chapter 12's plan: parameterise the adder on `EXP_W` and `MANT_W`, verify
> exhaustively at E4M3 in a second, run binary16 overnight, and only then instantiate at
> E8M23…"*

`chapters/ch05.md` line 489 actually reads:

> So **the plan this argument recommends**: parameterise the adder on `EXP_W` and
> `MANT_W`, verify exhaustively at E4M3 in a second, run binary16 overnight, and only
> then instantiate at E8M23 and verify with corner cases, constrained random and coverage.

Substring-tested: the full quoted string is **NOT FOUND** in ch05; the string from
"parameterise" onward **IS FOUND**. The chapter has rewritten the lead-in clause and
re-attributed the plan from ch05's own argument to "chapter 12". This is small in
substance — ch05's correction blockquote does frame it as the route ch12 declined — but
it is a paraphrase inside quotation marks, in the chapter whose Rule 3 is that every
quotation was confirmed by a literal substring test. It is also the easiest defect in the
chapter for a reader to catch, since both files ship together. *Fix:* quote ch05
verbatim ("So the plan this argument recommends: …") and put the ch12 framing outside the
quotation marks.

### Module-level quotations from the RTL — all verbatim

| chapter's quotation | file | result |
|---|---|---|
| `// Invariant out: every finite operand is now (-1)^s * sig * 2^(e-127-23)` | `src/ch09/fp32_unpack.v` line 8 | **byte-identical** ✓ |
| `assign ovf = (e_rnd > 9'd254);` | `src/ch09/fp32_round_pack.v` line 37 | **byte-identical** ✓ |
| `{sign, 8'd255, 23'd0}` | `src/ch09/fp32_round_pack.v` line 40 | ✓ |
| infinity and NaN "share E = 255" | `src/ch09/fp32_screen.v` line 16 | ✓ |

## Code and mutations

### Cold runs

```
$ cd guide/src && bash run_all.sh ch14
=== ch14 ===
  PASS  ../ch02/align_sticky.v … ../ch10/fp32_add4_tree.v tb_mono4.v
  passed: 1
  failed: 0
real  0m6.935s
```

```
$ cd guide/src && SIM_TIMEOUT=120 bash run_all.sh
  passed: 123
  failed: 0
```

**1/1 and 123/123, cold, zero FAIL lines anywhere in the full log.** The target count also
reconciles: summing `grep -c '^(run|warn|xfail)'` over all fourteen `targets.txt` files
gives exactly **123**, of which ch14 contributes **1**.

### The census line reproduces to the digit

```
tb_mono4 census: 39605 ordered comparisons (11737 strictly up, 27868 unchanged),
23 NaN-born, 26 NaN-base trials skipped, 268 ports unbumpable, 6 directed
PASS tb_mono4 (39605 one-ulp increases, 0 non-monotonic)
```

Every field matches the chapter and the README. 27,868 / 39,605 = **70.36 %** unchanged,
so the chapter's "70.4 % of one-ulp increases move the four-input sum not at all" is
right.

### Does the bench measure what the chapter says?

**Yes.** Reading `tb_mono4.v` in full:

- The property implemented is the one stated: for a non-NaN base result, replace one
  addend by `nextup` and require `ordkey(bumped) >= ordkey(base)`.
- `nextup` handles the three awkward points correctly — `-0 → 0x00000001`, negatives walk
  *down* in bit pattern (`w - 1`), and `0x7F7FFFFF + 1 = 0x7F800000` (`+inf`). `nextup` of
  `-inf` gives `-maxnormal`, which is right, and `-inf` is deliberately *not* in the
  unbumpable set — only NaN and `+inf` are, which is correct.
- `ordkey` canonicalises `-0` to `+0` before keying, so signed zeros compare equal. The
  chapter's explanation of why (ch12's "`-0` only when all four operands are") is right.
- NaN handling is disciplined and asymmetric in the right direction: a NaN **base** skips
  and counts (`n_nanbase`); a NaN **bumped** from a non-NaN base counts separately
  (`n_nanborn`) and is explicitly **not** a violation.
- The DUT is `fp32_add4_tree` (combinational), and the transfer to the shipped pipelined
  `fp32_add4` is via ch12's `tb_add4_stream` equivalence — a real, shipped, proven link,
  not an assumption. ✓
- `eval` X-guards the result (`^res === 1'bx`) before comparing, so an undriven design
  cannot pass quietly — the ch09 lesson applied.
- `task keyladder` runs **before** any DUT vector and checks twelve pinned patterns plus
  three `nextup` edge cases.

**Directed vector arithmetic checked by hand.** D1: `0x3F7FFFFF + 0x33800000` = exactly
`1.0`; `+ (2⁻²⁴ + 2⁻²⁴ = 2⁻²³)` = `0x3F800001` = 1 + 2⁻²³ ✓. Bumped: `a` becomes exactly
`1.0`, `1.0 + 2⁻²⁴` is a tie that rounds to even → `1.0`, `+ 2⁻²³` = `0x3F800001` again ✓.
**The chapter's explanation ("the level-one tie rounds to even") is exactly right**, and
this is Fasi et al.'s counterexample shape reduced to *n* = 4. D6: `1.0 − (1 − 2⁻²⁴)` =
`2⁻²⁴` = `0x33800000` ✓; bumping `b` gives `2⁻²³` = `0x34000000` ✓.

### Required failures — all three reproduce

| # | undermining | expected | observed here |
|---|---|---|---|
| R1 | `-DNT=0` | 3 guards | **3 guards, exactly the three named**: `NT=0 is too small to certify anything`, `the NaN-born path never fired`, `no comparison ever increased -- stimulus is inert`. The chapter's point that `n_cmp < NT*4` is satisfied by `NT = 0` and needed an absolute floor in front of it is correct ✓ |
| R2 | one directed vector deleted (I removed D6) | count guard | `FAIL tb_mono4: 5 directed vectors ran, expected 6` ✓ |
| R3 | `ordkey`'s negative branch `~v` → `v` | fail before any DUT vector | **exactly 5 key-ladder failures**, printed before the first DUT vector, then a cascade of order violations ✓ |

The bench cannot pass vacuously. ✓

### Mutation record — 9/9 kills confirmed, but the headline split is WRONG

I rebuilt all nine mutants in the scratchpad against copies of the RTL and re-ran the
shipped-size bench. **All nine are killed** — that half of the record holds. But the
column the chapter builds its central caveat on does not.

| # | mutation | killed? | **order violations, chapter/README** | **order violations, measured here** |
|---|---|---|---|---|
| M1 | sign bit of the tree result inverted | KILLED (all 6 directed) | **0** | **11,737** ❌ |
| M2 | result mantissa bits 22 and 23 swapped | KILLED (D1, D2, D3, D6) | **0** | **25** ❌ (placement-dependent, see below) |
| M3 | `fp32_normalize` sticky forced to 0 | KILLED (D3) | 0 | **0** ✓ |
| M4 | sticky forced to 1 | KILLED (D1, D3) | 0 | **0** ✓ |
| M5 | `round_up` forced to 1 | KILLED (D1, D3, D6) | 0 | **0** ✓ |
| M6 | `round_up` forced to 0 | KILLED (D3) | 0 | **0** ✓ |
| M7 | level-2 add fed `sum_ab` twice | KILLED (all 6 directed) | 0 | **0** ✓ |
| M8 | result mantissa bit 22 inverted | KILLED (all 6 directed) | 0 | **0** ✓ |
| M9 | result bit 1 inverted only when the result exponent ∈ [200, 220] | KILLED by monotonicity alone | **358** | **358**, zero directed failures ✓ |

**M9 reproduces to the exact count — 358 order violations out of 39,605 comparisons, and
all six directed vectors pass.** That is a precise, checkable, correct record.

**M1 is not monotone and cannot be.** Inverting the sign bit of the result composes the
tree's output with negation, which reverses the real-number order everywhere the result is
nonzero. A violation must therefore occur at every comparison that strictly increased in
the baseline — and that is exactly what happens: **11,737 violations, equal to the
baseline's `n_strict` to the unit.** The chapter's sentence

> "Eight of nine were caught by the six pinned directed vectors, **with zero order
> violations recorded** — an inverted result sign bit; … Every one is a badly wrong adder
> and every one is **perfectly monotonic**"

is false for the first item on its own list. Note also that the chapter's stated *reasons*
("truncation is monotone, always-round-up is monotone, and a function ignoring two of its
arguments is monotone in those two by definition") cover M3-M8 and conspicuously do not
cover M1 or M2 — the prose already knows the argument does not reach them.

**M2 is placement-ambiguous.** "Result mantissa bits 22 and 23" is odd, because bit 23 of
a binary32 word is the exponent LSB, not a mantissa bit. I tried three readings:
result-word bits 23↔22 → **25 violations**; `fsig[22]`↔`fsig[21]` inside
`fp32_round_pack` → **66 violations, zero directed kills**; result-word bits 22↔21 →
**0 violations but killed by D2, not D1**. None reproduces "0 violations, killed by D1".
The mutation needs to be specified precisely enough to re-run.

**What this costs.** The qualitative conclusion survives: **six of nine mutants (M3-M8)
are badly wrong adders that the monotonicity check does not notice at all**, and M9 had
to be built specifically to be caught by it. "Monotonicity is a weak property" remains
true and remains well-supported. But the number in the headline — in the chapter body, in
`src/ch14/README.md`, in the "What This Guide Measured" row 11, and in STATE.md's
RESUME-HERE block — is wrong, and it is wrong in the direction that *understates* the
bench. That matters more than usual here because this is the chapter's own honesty
mechanism, the thing it points at to stop the reader over-reading the 396,225 figure.
Since a reviewer was explicitly asked to reproduce this split, it will not survive
re-checking as written.

*Fix:* re-run M1 and M2 with the exact mutations recorded, correct the "order violations"
column, restate the split as measured (I get **6 of 9 caught only by directed vectors**
with my M1/M2 readings), and drop "an inverted result sign bit" from the list of mutants
that are "perfectly monotonic". The lesson does not need the wrong number — six is
already a striking result.

### Listings

**Both Verilog listings in the chapter are byte-identical excerpts of
`src/ch14/tb_mono4.v`** — verified by literal substring test of each fenced ```` ```verilog ````
block against the file. Two listings, as required. The two ```` ```python ```` blocks are
correctly labelled illustrative and are not shipped; `src/ch14/README.md` explains why in
terms consistent with ch12's `.py` scoping decision.

### `targets.txt` and README

`targets.txt` carries one `run` row with the full 13-file dependency list, and a long
header comment that states the code decision and its justification. The README's mutation
table, required-failure table, headline-run recipe and "monotonicity is a weak property"
paragraph are all present and consistent with the chapter — **including, unfortunately,
the same wrong order-violation column**.

## Craft

### Markers, TODOs, structure

- `<!-- sections complete: 16/16 -->` and exactly **16 `##` sections** ✓.
- **Zero** TODO / FIXME / XXX / `_TODO_` markers ✓.
- Both Verilog listings byte-identical (see Code and mutations) ✓.
- Every transcript in the chapter was observed this session: the shipped census line,
  the PASS line, the three required-failure outputs, and `bash run_all.sh ch14`. The
  100,000-trial headline run (396,225 comparisons, 68 s) I did not re-run at full size —
  it is a `-DNT=25000` scaling of a binary I did run, and the shipped-size numbers
  reproduce exactly, so I have no reason to doubt it.

### The "200 is not resolution" guidance is present and correct

It appears three times, at increasing depth, and the escalation works: a one-line warning
in "How to Read This Chapter's Citations" ("**An HTTP 200 is not a verification**"), the
full three-mechanism account in the bibliography's opening subsection, and the
Traps-section version. All three are technically correct, all three are supported by my
own re-fetches, and the "confirm a PDF's first four bytes are `%PDF`" advice is exactly
the check that catches the posithub case. This is the best-executed part of the chapter.

Two small corrections belong there anyway (both in Required changes): the posithub
interstitial should be dated as a session observation since it did not reproduce here,
and the fourth, User-Agent-dependent mechanism on `hal.science` deserves a sentence.

### The length judgment — the declared split is wrong, and it matters

`wc -w` gives **18,509**; a python `.split()` count gives **18,815**, which is exactly the
chapter's declared `10,832 + 7,983`. So the writer's counting method was python, and the
total is consistent. **The split is not.** Measured per section:

| block | words |
|---|---|
| everything before `## The Annotated Bibliography` | 13,814 |
| `## The Annotated Bibliography` (Parts A and B, entries 1-86) | **4,641** |
| `## What This Guide Measured That the Literature Would Want` | 920 |
| `## Traps Beginners Fall Into` | 466 |
| `## What You Should Be Able to Do Now` | 615 |
| `## The Arc, and Where to Go Next` | 881 |
| `## Sources for This Chapter` | 460 |

`4,641 + 920 + 466 + 615 + 881 + 460 = 7,983`. The "bibliography" figure is
**everything from the bibliography heading to the end of the chapter** — it silently
includes the Traps section, the checklist, the closing arc and the Sources section, which
are body prose by any reading and total **2,422 words**. The honest split is **body
14,174 / annotated bibliography 4,641**.

This is worth fixing rather than waving through, because the bibliography's length is what
STATE.md treats as mandated and therefore exempt. The real overrun against a ~11k body
target is about 3,200 words, not zero.

**Is the bibliography genuinely reference material rather than padding?** **Yes.** I read
all 86 entries. Each carries citation + "good for" + "cited by" + verification status;
the *good for* fields are specific and usable ("the p′ ≥ 2p + 2 condition behind the
one-operation `$shortrealtobits` guarantee"; "the pre-Verilator open coverage tool"), and
several carry genuine editorial instructions a re-user needs — entry 1's "for the
*changes* in 754-2019, cite entry 66 instead", entry 39's "never cite a
`sunburst-design.com` URL", entry 79's "pair it with entry 80 or do not use it", entry 76's
"cite the effective URL". Entries 85 and 86 (the cited-through-someone-else group) are the
single most honest thing in the chapter. At 4,641 words for 86 annotated entries that is
about 54 words each — dense, not padded. The mandate is earned.

### The closing section does close the BOOK

"The Arc, and Where to Go Next" is a book ending, not a chapter ending: it names what the
book was, walks the falsification thread chapter by chapter from ch02 to ch13, states what
a reader can do that they could not at chapter 1, and gives six concrete next steps
ordered by how well the guide prepared them. The final line ("what would have to be true
for this to be wrong, and have you gone and looked?") lands the whole method. **Two
factual slips inside it** (the "nine classic beginner bugs" and "thirty-three throwaway
modules" — see The guide's own measurements) are the only blemishes, and both are exactly
the kind of unchecked restatement the chapter spends 18,000 words warning against, which
makes them worse than they look.

The "Sources for This Chapter" section correctly declines to duplicate the bibliography
and instead records the verification pass — fetch tally, content pass, audit pass,
arithmetic, the one measurement, the standing epistemic wall. That is the right content
for a chapter whose deliverable is a bibliography.

### ch05's parameterisation correction — cross-referenced correctly

The chapter points at ch05's dated correction three times (the retargeting section, the
checklist, and the "Where to go next" list), all consistently, and never re-litigates the
decision. ch05 line 491 carries the correction verbatim as described. ✓ The only problem
is the misquoted lead-in clause, covered above.

### Smaller craft notes

- The four-tag table in "How to Read This Chapter's Citations" is genuinely useful and
  every tag is used consistently in the bibliography as defined.
- Rule 4's three registers ("The standard says" / "This vendor claims" / "We measured")
  are honoured throughout — every vendor claim I checked is flagged as one, and no
  synthesis/area/latency figure is presented as the guide's own.
- The "What You Should Be Able to Do Now" checklist is unusually good: sixteen items,
  every one checkable against shipped material, and the last one ("re-fetch three URLs
  … including which of the three lied to you about its status code") is the chapter's
  method turned into an exercise. One item needs the posit-decoder fix noted above.
- Section 11's row in "What This Guide Measured" carries the same wrong mutation split as
  the body and README; it will need the same correction.

## Research-note audit

`research/ch14-frontier.md`, ~20.9k words, 12 sections plus appendix. Chapter-vs-notes
consistency is high: the census tables, the E4M3 collision table, the taxonomy summary,
the posit Table-1 reproduction and the per-format change list all carry the same numbers
in both documents, and I reproduced all of them independently.

### The NVIDIA E4M3 dispute — adjudicated, and the writer is right

The research notes assert twice (§1c row 167 and §5.3) that the E4M3/E5M2 passage has been
**removed** from the current Transformer Engine docs URL: *"the current TE docs — the
E4M3/E5M2 prose has been removed from this version"* and *"**no longer contains that
passage** — the text has been reorganized around MXFP8 and block scaling, and the
E4M3/E5M2 description is gone from it."* The chapter contradicts this and records both
observations.

**I fetched `docs.nvidia.com/deeplearning/transformer-engine/user-guide/examples/fp8_primer.html`
and extracted its text. The passage is present.** The page is now titled *"Using FP8 and
FP4 with Transformer Engine — Transformer Engine 2.18.0"*, it does discuss MXFP8 and
NVFP4, and all three quoted strings substring-match it:

| quoted string | present on current URL | present on 2.3.0 URL |
|---|---|---|
| the full E4M3/E5M2 datatype passage (448, 57344, inf/nan) | **yes** | yes |
| the FP16 loss-scaling sentence | **yes** | yes |
| the per-FP8-tensor scaling-factor sentence | **yes** | yes |

`448` occurs twice and `57344` once on the current page. **The chapter's correction of the
research pass is correct; the research note is wrong.** The chapter's handling — record
both observations, decline to adjudicate which fetch was right, and pin the citation to
the immutable 2.3.0 release URL because "that is the one whose bytes cannot change
underneath the quotation" — is the right disposition regardless, and the version-pinning
lesson survives intact. Nothing needs to change in the chapter here; **the research note
should be annotated as superseded** so a later pass does not re-import the error.

### Six further note claims, spot-checked

| # | note claim | verdict |
|---|---|---|
| 1 | §1a: "33 attempts … 31 of 33 are alive; the two failures are both `github.com` and both are proxy artifacts" | **CONFIRMED.** I extracted the ch01-13 URL set independently and got **exactly 33**; both `github.com` URLs 403 to curl and the repo page 200s via WebFetch. The 33-row table is accurate row by row |
| 2 | §1b: `sunburst-design.com` whole-domain redirect to Paradigm Works; `www.sunburst-design.com/` → `www.paradigm-works.com/` | **CONFIRMED**, and the paper URL's 189,459-byte body is identical in length to the Paradigm Works search page fetched directly |
| 3 | §1b: `digitalsignallabs.com` degraded from ch06's 503 to `curl: (35) Recv failure: Connection reset by peer` | **CONFIRMED**, same error string, no HTTP status at all |
| 4 | §1c: `en.wikipedia.org/wiki/Kulisch_accumulator` → **404**, "No such article. Recorded so nobody cites one" | **CONFIRMED** — 404, and this is the right way to record a negative |
| 5 | §1c: `doi.org/10.14529/jsfi170206` "DOI resolved in session; safe to cite because the redirect was observed" | **CONFIRMED** — resolves to `superfri.org/index.php/superfri/article/view/137`, whose page title is the Gustafson & Yonemoto paper |
| 6 | §2.2: the width table (277 / 280 / 28 / 554 / 4196 / 4288) and the Uguen Table 1 quotation | **CONFIRMED** — every number reproduces, and Table 1 reads exactly as the notes transcribe it |

### Where the chapter *hardened* the notes, and should not have

The notes' §2.2 row reads `| widely quoted Kulisch width for binary32 | ~640 bits | 554 +
86 guard bits, consistent |`, and its prose says *"The same construction gives ~640 for
binary32 … the 640 is 554 plus the **analogous** headroom."* The chapter drops the tilde
and the word "analogous" and prints *"the same construction gives 554 + 86 = 640"*. Since
the binary64 headroom is 92 and the binary32 headroom is 86, "the same construction" is
literally wrong, and **640 is attested in no source fetched in either pass**. The notes
were appropriately hedged; the chapter over-tightened. See Required changes.

### Where the chapter improved on the notes

Worth recording, because it is most of the delta:

- The notes describe the posit standard fetch as a clean 200; the **writer** discovered
  the `text/html` bot interstitial and made it the chapter's third "200 lies" mechanism.
  That is a genuine new finding, correctly propagated to STATE.md.
- The notes record 92 fetch attempts; the chapter records 97 with a fuller breakdown
  (79/9/4/1/1/1/2 = 97 ✓, notes 77/9/2/1/1/2 = 92 ✓, both internally consistent) and adds
  the Wikipedia 429-then-200 transient.
- The chapter's `[verified but not quotable]` tag is a writer-side invention that the
  notes lack, and it is the tag that makes the Google Cloud and IEEE-754 record-page
  entries honest.
- The chapter correctly declines to import the notes' suggestion that ch06's "returned
  HTTP 503" be silently edited; it flags it as a maintenance note instead (entry 57).

## Required changes for a 9+

Priority order, blocking first. Nothing here requires new research; every fix is a re-run
or a rewording, and the two blocking items are both cases of the chapter failing its own
stated rule.

### Blocking

**B1. Correct the mutation record's order-violation column and the "8 of 9" headline.**
*Where:* `chapters/ch14.md` "What the mutation record showed"; `src/ch14/README.md`
mutation table and the paragraph under it; the row-11 entry in "What This Guide
Measured"; `STATE.md`'s RESUME-HERE block and the 2026-08-21 log entry.
*Problem:* M1 ("sign bit of the tree result inverted") is recorded with **0 order
violations** and described as "perfectly monotonic". Reproduced here it produces
**11,737** — exactly the baseline's `n_strict`, because composing the tree with a sign
flip reverses the order wherever the result strictly increases. It cannot be monotone.
M2 as written is placement-ambiguous and none of the three readings I tried reproduces
"0 violations, killed by D1". The chapter's own stated reasons ("truncation is monotone,
always-round-up is monotone, a function ignoring two arguments is monotone in those two")
cover M3-M8 only.
*Fix:* re-run M1 and M2 with the exact mutations, record the measured violation counts,
and restate the split as measured — with my readings it is **six of nine** caught only by
the pinned directed vectors, with M1, M2 and M9 also caught by the order property. Remove
"an inverted result sign bit" and "two mantissa bits swapped" from the list of mutants
that are "perfectly monotonic", and specify M2 precisely enough to re-run (which module,
which signal, which bit indices). The conclusion — *monotonicity is a weak property* —
survives on six mutants and does not need the wrong number.

**B2. Fix the misquotation of chapter 5.**
*Where:* `chapters/ch14.md`, "The starting point: there are no parameters".
*Problem:* the chapter prints, in quotation marks, *"So chapter 12's plan: parameterise
the adder on `EXP_W` and `MANT_W` …"*. `chapters/ch05.md` line 489 reads *"So the plan
this argument recommends: parameterise the adder on `EXP_W` and `MANT_W` …"*. A literal
substring test fails; a paraphrase is presented as a quotation, in the chapter whose Rule
3 is that every quotation was substring-tested.
*Fix:* quote ch05 verbatim and move the "chapter 12" framing outside the quotation marks —
e.g. *the plan chapter 12 was expected to carry out: "So the plan this argument
recommends: parameterise the adder on `EXP_W` and `MANT_W`, verify exhaustively at E4M3
in a second, run binary16 overnight, and only then instantiate at E8M23…"*

### Real defects

**D1. Two shipped, live, cited sources are missing from the bibliography.** Chapter 1's
numbered sources 2 and 3 are MIT 6.004 OpenCourseWare pages (`…/pages/c4/`, `…/pages/c5/`),
both 200 here and both in the research notes' 33-row audit — and neither appears among the
86 entries, which claim to consolidate all sixty-one sources chapters 1-13 cite.
*Fix:* add one entry to A.4 (or A.2) covering both, `[verified 2026-08-21, HTTP 200]`,
*cited by:* ch01, *good for:* combinational and sequential logic foundations. This changes
the count to 87; either renumber or fold them into an existing multi-source entry in the
style of entries 38 and 42.

**D2. Fix the two restated numbers in the closing arc.**
- "Chapter 3 asked how many of the **nine** classic beginner bugs" → ch03's table has
  **fourteen** rows and ch03 says so explicitly ("Fourteen bugs; one warning at `-Wall`…").
- "Chapter 2 compiled **thirty-three** throwaway modules" → `src/ch02/` has **40 `.v`
  files / 40 module declarations** and **27 build targets**; thirty-three matches nothing
  and appears nowhere in the repository.
*Fix:* use the source numbers, or cite by section title as the chapter does everywhere
else. These are the only two unchecked restatements in an 18,000-word chapter about not
making unchecked restatements.

**D3. Fix the 640-bit claim.** The chapter says "the same construction gives 554 + 86 =
640 for binary32". The construction is not the same — the headroom is 92 bits for
binary64 and 86 for binary32 — and **640 appears in no source fetched in either pass**.
*Fix:* revert to the research notes' hedge: "the analogous construction, with a smaller
headroom parameter, gives ~640 for binary32 — the number folklore quotes; no source
fetched here states it, while the paper's own minimum is 554."

**D4. Fix the posit-enumeration claim and the checklist item it drives.** "Enumerated over
all patterns … posit32 gives 27" is not what happened and is not feasible with the printed
decoder: posit16's 65,536 patterns take 0.7 s here, so posit32's 2³² take roughly 13 hours.
posit32's 27 is structural (`n − 1 − 2 − es`).
*Fix:* say posit8 and posit16 were enumerated exhaustively and posit32's fraction count
derived from the field layout; amend the checklist item "reproduce Table 1's
fraction-length row for all three precisions" to say which two are enumerable.

**D5. Give the nine reason-less `[title-only]` tags their reasons.** Entries **4, 5, 30,
34, 36, 37, 38, 43, 45, 60** carry the tag with no reason, against Rule 2. Entry 3 says
"paywalled" and entry 6 says "withdrawn"; 4 and 5 are paywalled for the same reason and
should say so. A.2's blanket ("None has a free full text") is a proper reason and covers
7-28; A.3's header states the tag, not the reason, so it does not discharge Rule 2.
*Fix:* one clause each — "paywalled", "no free full text located; no fetch attempted",
"same `sunburst-design.com` hazard as entry 39", etc.

**D6. "which is why neither is printed" is contradicted by the bibliography.** The Traps
section says the two 202-returning DOIs are not printed; entries 9 and 35 both print them
as angle-bracket links.
*Fix:* "which is why neither is asserted as the source's URL — both appear in their
entries only as the record of what was tried."

**D7. Correct the declared body/bibliography split.** Declared: 10,832 + 7,983. Measured:
the annotated bibliography is **4,641** words; the 7,983 figure silently includes Traps
(466), the checklist (615), the closing arc (881), Sources (460) and "What This Guide
Measured" (920) — 2,422 words of body prose plus the measured-here table.
*Fix:* record the split as **body 14,174 / annotated bibliography 4,641** in the chapter's
own accounting and in STATE.md, and state the overrun against target honestly rather than
letting the bibliography exemption absorb it.

### Nits

**N1. Six added terminal periods inside quotation marks.** The four Mikaitis class
headings (the source has no full stop after "…long accumulators", "…long accumulators",
"…software behaviour", "…limited precision accumulator") and the Boldo quotation (the
source sentence continues ", with reasonable efficiency"). *Fix:* move the period outside
the quotation marks, or close with `…"`.

**N2. Record the LaTeX normalisation in Rule 3.** The Mikaitis abstract quotation renders
`$n\geq 4$`, `$x_i$`, `$s_n$` from the arXiv abs page as `n≥4`, `x_i`, `s_n`. Rule 3 lists
three extraction artifacts; this is a fourth. Also worth a half-sentence that the v2 PDF's
abstract and the v2 abs-page abstract differ in wording ("We prove that computing…" vs
"…common techniques…"), which is itself a nice citation-hygiene example.

**N3. Date the posithub interstitial and the Xplore 418.** Neither reproduced here: the
posit standard PDF arrived directly as `application/pdf` on a cold `curl`, and Xplore
returned 200 (root) / 202 (documents), not 418. Both were real observations; both are
unstable. *Fix:* "observed on 2026-08-21; intermittent — a later fetch got the PDF
directly."

**N4. Add the fourth "200 lies" mechanism.** `hal.science` serves the Anubis
"Making sure you're not a bot!" page **to `curl`** when the User-Agent looks like a
browser, and the real PDF when it does not. Four cited URLs are affected. One sentence in
the fetch-path subsection would save a re-verifier four false failures.

**N5. Print the Kahan document URL.** B.5 gives `people.eecs.berkeley.edu/~wkahan/`; ch07
cites `…/~wkahan/ieee754status/754story.html`, which returns 200. *Fix:* print the
document URL beside the home page.

**N6. Note that Springer's failure mode is UA-dependent** — cookie-error landing page to a
default UA, Akamai "Client Challenge" to a browser UA. One clause in the entry.

## Tree restoration proof

All mutation work, all fetched bodies, all extracted text and all re-run models were kept
in the session scratchpad
(`/tmp/claude-0/-home-user-erancihan/8377a90d-8b6e-517e-bae4-6490e82ea18d/scratchpad`).
The nine mutants and the three required-failure variants were built by copying the RTL and
testbench into `scratchpad/mut/w<M>/` and patching the copies; **`guide/src/` was never
written to.**

**Baseline, taken before any work:**

```
$ cd guide/src && find . -type f | sort | xargs sha256sum > …/src-baseline.sha256
217 files
$ sha256sum …/src-baseline.sha256
9507d7c20eac370a0c617b8263cc69f7229cf18dc38445122db065ed382d04a7
```

**After all runs, mutations and required-failure experiments:**

```
$ cd guide/src && find . -type f | sort | xargs sha256sum > …/src-after.sha256
$ diff …/src-baseline.sha256 …/src-after.sha256
(no output)
SRC TREE IDENTICAL (217 files)
$ sha256sum …/src-after.sha256
9507d7c20eac370a0c617b8263cc69f7229cf18dc38445122db065ed382d04a7
```

**The manifest digests are identical**, so every one of the 217 files under `guide/src/`
is byte-for-byte what it was at the start of this review.

**Working tree:**

```
$ git status --porcelain
(no output apart from this review file)
```

`git status` is clean of any change of mine other than the newly created
`guide/reviews/ch14-review.md`, which is this document.

**Final green run, after restoration was proved:** `bash run_all.sh ch14` → **1/1**;
`SIM_TIMEOUT=120 bash run_all.sh` → **123/123**, zero FAIL lines in the full log.

---

## Post-fix verification — 2026-08-21 (round 1 fixes)

# Final score: 9 / 10 — fit to ship, nits only

Re-verified at every site against the post-fix tree (commit `e5b16f1`). Only
`src/ch14/README.md` changed under `guide/src/`; no RTL or testbench was touched, which
is correct for a fix round that re-measured mutants in a scratchpad.

### B1 — mutation record: confirmed by re-running the coordinator's exact mutations

I rebuilt both mutants from the current tree using the exact text now recorded in the
README, applied at the tree's `result` port.

| mutant | mutation as recorded | my re-run |
|---|---|---|
| M1 | `assign result = {~r_raw[31], r_raw[30:0]};` | **11,744 errors**; census `39605 ordered comparisons (0 strictly up, 27868 unchanged)`; 11,737 order violations; all 6 directed fail; **`FAIL tb_mono4: no comparison ever increased -- stimulus is inert`** fires |
| M2 | `assign result = {r_raw[31:24], r_raw[22], r_raw[23], r_raw[21:0]};` | **29 errors**; 25 order violations (genuine non-monotonic pairs); 4 directed fail (D1, D2, D3, D6) |

**Both counts match the record exactly, including the detail that M1 drives `n_strict` to
zero and so trips the inert-stimulus guard as well** — a nice secondary confirmation that
sign inversion reverses the order rather than merely perturbing it. M9's 358 still
reproduces. The baseline census line is unchanged (`39605 … 11737 strictly up`), so the
shipped result is untouched.

Every downstream restatement is corrected and **no "eight of nine" survives anywhere in
`chapters/ch14.md` or `src/ch14/README.md`** (grepped). The chapter's mutation section now
lists exactly the six monotone mutants (sticky ×2, `round_up` ×2, `sum_ab` twice, mantissa
bit 22), reports 11,744 / 29 / 358, and says "the order property does catch a third of this
set. The conclusion it cannot support is the stronger one: six badly wrong adders sail
through it." The measured-here row 11, the Traps entry and the caveat paragraph all say six
of nine. The README paragraph records the correction as **"a failure of this project's own
standing rule: a mutation row is a measurement and must be re-run, not reasoned about"** —
which is the right register, and better than a silent patch.

### B2 — the chapter 5 quotation is now literal

Extracted programmatically from `ch14.md` and substring-tested against `ch05.md`:

```
EXTRACTED: 'So the plan this argument recommends: parameterise the adder on `EXP_W` and
            `MANT_W`, verify exhaustively at E4M3 in a second, run binary16 overnight,
            and only then instantiate at E8M23…'
literal substring of ch05 (ellipsis trimmed) : True
old string "So chapter 12's plan:" still present : False
preceding text: '…ends its exhaustive-testing argument with the plan chapter 12 was
                 expected to carry out: '
```

**Verbatim, with the chapter-12 framing outside the quotation marks and the truncation
marked by `…`.** Correct.

The coordinator's diagnosis — that ch05's sentence was edited *after* ch14's research had
quoted the old wording — is worth the STATE.md hazard entry it is getting. **Editing a
chapter silently falsifies every other chapter's quotation of it**, and this guide now has
a measured instance. Suggested F1 check: extract every inter-chapter quotation and
substring-test it against its target chapter, exactly as this chapter does for external
sources. It is a ten-line script and it would have caught this.

### D-items and nits

| item | verdict |
|---|---|
| **D1** entry 87 | **Applied, verified, incomplete.** Entry 87 added with both OCW URLs, the ch01 attribution, and the omission recorded rather than silently patched. I re-fetched both: **200, no redirect**, titles `4 Combinational Logic \| Computation Structures \| … \| MIT OpenCourseWare` and `5 Sequential Logic \| …`, and the bodies contain "Sum of Products", "Karnaugh", "multiplexer" (c4) and "D Latch", "D Register" (c5) — the entry's *good for* text describes the pages accurately. Numbering re-checked mechanically: **1-87, no gaps, no duplicates.** README says 87. **But four chapter sites still say "eighty-six"** — see nits below |
| **D2** | ✅ "Chapter 2 compiled **forty** throwaway modules" (re-verified: 40 `.v` files, 40 module declarations in `src/ch02/`) and "how many of the **fourteen** classic beginner bugs" (re-verified against ch03's own "Fourteen bugs; one warning at `-Wall`…") |
| **D3** | ✅ now "the analogous construction, with a smaller headroom parameter, gives about 640 for binary32 — the number folklore quotes, **though no source fetched here states it**, while the paper's own *minimum* is 554." Exactly the research notes' hedge, restored |
| **D4** | ✅ "posit32's 27 is derived from the field layout (`n − 1 − 2 − es`) rather than enumerated: its 2³² patterns would take about thirteen hours through the decoder printed above", and the checklist item now says "for the two enumerable precisions (posit8 and posit16; posit32's entry is derived from the field layout, not enumerated)" |
| **D5** | ⚠️ **7 of 10.** Fixed: 36 ("ARITH proceedings paywalled, no free full text"), 37 ("Springer paywalled"), 38 ("historical primary sources, none fetched"), 42/43 ("sunburst-design.com is login-walled (same hazard as entry 39)" — now self-contained), 45 ("DVCon proceedings not freely available"), 60 ("commercial study, gated behind vendor registration"), and 33 improved to "IEEE Xplore paywalled, no free full text". **Still bare: entries 4 and 5** (both paywalled, like entry 3, which says so) **and entry 30** (`siam.org` is 403 from here — that is the reason). Entry 34 gives its reason only by reference ("same caveat" → entry 33) |
| **D6** | ✅ "which is why **neither is asserted as the source's URL** — both appear in their entries only as the record of what was tried" |
| **D7** | ⏳ **Not yet applied** — STATE.md carries no `14,174 / 4,641` entry. Re-measured on the post-fix chapter: **body before the bibliography 11,071 / annotated bibliography 4,882 / closing sections after it 3,376**, total **19,329**. The honest body figure is 11,071 + 3,376 = **14,447**, not 11,071 |
| **N1** | ⚠️ **Half.** All four Mikaitis class headings now test as **literal substrings of the fetched PDF** (period moved outside the quotation marks) ✅. The Boldo quotation still ends `…with conventional floating-point operations."` where the source continues ", with reasonable efficiency" — still fails a literal test, passes once the added period is trimmed |
| **N3** | ✅ Both dated. posithub: "returned 200 with `content-type: text/html` — a bot interstitial — **while a later cold fetch got the PDF directly. Both observed; retry before concluding anything.**" Xplore: "both observed then, and **both unstable enough that a later pass saw Xplore answer 200 at the root and 202 for documents**" |
| **N4** | ✅ Added verbatim as the fourth mechanism: "`hal.science` serves the Anubis 'Making sure you're not a bot!' page to `curl` **when the User-Agent looks like a browser**, and the document itself when it does not — so a re-verifier who politely sets a browser UA gets four false failures on this chapter's HAL citations" |
| **N2, N5** | Not done, by agreement. **Both are worth doing** — see below |

### Green, after the fixes

```
$ bash run_all.sh ch14                      → passed: 1   failed: 0
$ SIM_TIMEOUT=120 bash run_all.sh           → passed: 123 failed: 0
```

Markers `16/16` with 16 `##` sections ✅; zero TODO/FIXME ✅; **both Verilog listings still
byte-identical** to `src/ch14/tb_mono4.v` ✅ (re-tested by literal substring).

### Remaining nits — none blocking

1. **Four stale "eighty-six" counts in the chapter.** `chapters/ch14.md` lines **17**
   ("eighty-six sources — sixty-one the guide already cites, twenty-five added here"),
   **541** ("Eighty-six sources: **sixty-one** … **twenty-five** added here"), **788**
   ("Eighty-six sources is an afternoon"), **817** ("closed with eighty-six numbered
   entries"). Entry 87 itself says "the consolidation is now 87 entries", so the chapter
   currently contradicts itself. The breakdown also needs 61 → **62**, since the OCW entry
   is a source ch01 already cites. `src/ch14/README.md` is already correct at 87. This is
   cosmetic but it is a *count*, in the chapter that made counting the point.
2. **Entries 4, 5 and 30 still carry `[title-only]` with no reason** (Rule 2). One clause
   each: "paywalled" for 4 and 5, "`siam.org` 403 from here" for 30. Entry 34 would read
   better with its reason spelled out rather than inherited from entry 33.
3. **N1's Boldo period.** End the quotation `…with conventional floating-point
   operations …"` or extend it to the sentence's end.
4. **D7 and the two STATE.md entries** (the corrected word split; the
   editing-falsifies-quotations hazard) are still pending, as flagged.
5. **Answering the question asked: yes, do N2 and N5.** Both are one line.
   **N2** — add "LaTeX markup in an arXiv abstract listing is rendered" to Rule 3's
   artifact list, since the Mikaitis abstract quotation renders `$n\geq 4$`, `$x_i$` and
   `$s_n$`; it is the only normalisation in the chapter that Rule 3 does not declare, and
   the fact that the v2 abs-page and v2 PDF abstracts differ in wording ("common
   techniques…" vs "We prove that computing…") is itself a free citation-hygiene example
   the chapter would enjoy. **N5** — print `…/~wkahan/ieee754status/754story.html`
   (200 here) beside the home-page URL in B.5, so a reader can reach ch07's actual source.

### Why 9

Both blocking items are fixed and I confirmed each by the same method that found it —
re-running the mutants and re-testing the quotation as a literal substring, not by reading
the diff. The citation set was already clean at round 1 (88 URLs re-fetched, 73 quotations
substring-tested, zero invented URLs, zero unresolved DOIs, zero fabricated quotations);
entry 87 closes the one completeness gap and its two URLs verify. What is left is four
stale counts, three missing `[title-only]` clauses, one terminal period, and two pending
STATE.md entries — nits, none of which changes a claim, a number the code produces, or a
source's meaning. The chapter now states its own weakest measurement correctly, records
*why* it got it wrong, and names the editing hazard that produced its one misquotation.
That is a better ending for this book than a clean first draft would have been.

### Tree restoration proof (post-fix round)

```
$ cd guide/src && find . -type f | sort | xargs sha256sum > …/src-baseline2.sha256   # before my re-runs
217 files, digest e6e6575cba3ab2dc17aca0cddead097f18408f17db008fe89e43946838716b3a

$ …                                        # after all M1/M2 re-runs and re-fetches
$ diff …/src-baseline2.sha256 …/src-after2.sha256
(no output)
IDENTICAL to post-fix baseline (217 files)
digest e6e6575cba3ab2dc17aca0cddead097f18408f17db008fe89e43946838716b3a

$ git status --porcelain
(no output — working tree clean)
```

Mutants were built in `scratchpad/mut2/M1/` and `scratchpad/mut2/M2/` from copies;
`guide/src/` was never written to. The only difference from my round-1 baseline is
`src/ch14/README.md`, which is the coordinator's B1 correction.
