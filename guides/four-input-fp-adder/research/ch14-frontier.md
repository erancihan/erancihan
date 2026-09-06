# Chapter 14 research notes — Research frontier: FP accelerators, bfloat16/posits, annotated bibliography

<!-- sections complete: 12/12 + appendix -->

**Researcher's charter.** Chapter 14 is the last chapter and its reviewer persona is the
**citation checker**. Every source recorded here is either fetch-verified in this session
(HTTP status + date recorded beside it) or tagged `[title-only]` with the reason. No URL in
this file was constructed, guessed or remembered; each one was either typed from a
fetch that succeeded or is absent.

---

## 0. Method, budget, and how to read the verification tags

**Why this chapter's method differs from chapters 1-13.** In every earlier chapter the
authority was measurement: something was compiled under Icarus 13.0 or computed in
`python3`, and the prose reported what happened. Chapter 14 cannot work that way. Its
subject is *other people's* architectures, standards and formats — things this project
neither built nor can run. The corresponding discipline is therefore not mutation testing
but **citation hygiene**, and the reviewer persona for this chapter (citation checker,
per the rotation table in `STATE.md`) will re-fetch every URL below. So the rules:

1. **Every URL in these notes was requested from this container during this session.**
   The request method, the HTTP status code and the date are recorded in §1. Nothing was
   typed from memory. Where a URL came out of a `WebSearch` result rather than a page I
   had already fetched, I still fetched it before recording it.
2. **A source with no successful fetch gets no URL.** It is cited author / title / venue /
   year and tagged `[title-only]`, with the *reason* it could not be fetched. This is
   chapter 3's rule (the `sunburst-design.com` hazard) applied to a whole bibliography.
   No DOI appears below unless it was resolved in this session and the redirect target is
   recorded next to it.
3. **Quotations are verbatim and located.** Every quoted string in these notes was
   extracted mechanically from the fetched bytes — `curl` to a file, then a `python3`
   tag-strip or `pypdf` text extraction — and checked with a literal `in` test, not read
   off a rendering. Where a quotation contains an oddity (there is one: a typo in the
   arXiv abstract of the FP8 paper) the oddity is preserved and flagged, because a
   "corrected" quotation is a quotation that fails re-verification.
4. **Three epistemic registers, kept apart**, as every chapter since 3 has done:
   *the standard says* (normative text, mostly `[title-only]` here because IEEE 754-2019
   is paywalled), *this vendor claims* (documentation, flagged), and *we measured*
   (this guide's own chapters, cited by chapter and quoted section title).

**Budget and outcome.** The charter allowed roughly 20-30 fetch attempts because the
bibliography *is* the deliverable. The actual count is in §1: **92 distinct URLs
attempted on 2026-08-21**, of which 77 returned HTTP 200, 9 returned 403, 2 failed at the
TLS layer (`curl: (35) Recv failure: Connection reset by peer`), 1 returned 404, 1 returned
418, and 2 returned 202. That over-runs the nominal 20-30 budget, deliberately: **33 of
those 92 are the audit** of links chapters 1-13 already shipped, which F1 and F3 need and
which nobody else in this project is positioned to do.

**Tool note, recorded so the reviewer can reproduce the difference.** Two fetch paths
were available and they do not agree. Plain `curl` through this container's agent proxy
gets **HTTP 403 from `github.com`** — including `api.github.com` — for every request,
with any user agent. `WebFetch` retrieves the same GitHub pages fine. So a 403 in the log
below means "403 to `curl` from here", not "dead", and every 403 was retried through the
second path before being written down. This matters for chapter 4's two GitHub citations,
which are alive.

**A note on strength.** Nothing in §§2-8 was built or measured here. Those sections are
literature and vendor documentation, and the writer must flag them as such in place, the
way chapter 10's "Rounding Once Instead of Three Times" already does. The only
measurements chapter 14 may state as measurements are this guide's own, and §11 lists
exactly which ones and at what strength.

## 1. Fetch log — every URL attempted this session, with outcome

All requests made from this container on **2026-08-21** through the session's HTTPS agent
proxy. Method is `curl -sS -o /dev/null -w '%{http_code}' -L --max-time 40 <url>` unless a
`WebFetch` column entry says otherwise; the code recorded is the **final** code after
redirects, and where the effective URL differs from the requested one that is shown too.
`[content]` marks the pages whose bytes were downloaded and parsed here (for the verbatim
quotations in §§2-8); the rest were status-checked only, which is all a bibliography audit
needs.

**Totals: 92 URLs attempted. 77 → 200. 9 → 403. 2 → TLS reset. 1 → 404. 1 → 418. 2 → 202.**

### 1a. Audit of URLs the guide already ships (chapters 1-13) — 33 attempts

Source list built mechanically: `grep -rn "http" guide/chapters/*.md`. **31 of 33 are
alive.** The two failures are both `github.com` and both are proxy artifacts, not dead
links — see the note under the table.

| # | URL as shipped | Chapter(s) | Status |
|---|---|---|---|
| 1 | `https://standards.ieee.org/ieee/754/6210/` | 1, 7 | **200** |
| 2 | `https://standards.ieee.org/ieee/1364/3641/` | 2 | **200** |
| 3 | `https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/pages/c4/` | 1 | **200** |
| 4 | `https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/pages/c5/` | 1 | **200** |
| 5 | `https://docs.amd.com/r/en-US/ug901-vivado-synthesis` | 1, 3 | **200** |
| 6 | `https://en.wikipedia.org/wiki/Verilog` | 2 | **200** |
| 7 | `https://steveicarus.github.io/iverilog/usage/command_line_flags.html` | 2, 13 | **200** |
| 8 | `https://steveicarus.github.io/iverilog/usage/getting_started.html` | 2 | **200** |
| 9 | `https://steveicarus.github.io/iverilog/usage/vvp_flags.html` | 5 | **200** |
| 10 | `https://steveicarus.github.io/iverilog/` | 11 | **200** |
| 11 | `https://raw.githubusercontent.com/steveicarus/iverilog/master/README.md` | 11 | **200** |
| 12 | `https://csg.csail.mit.edu/6.375/6_375_2009_www/papers/cummings-nonblocking-snug99.pdf` | 3 | **200** |
| 13 | `https://csg.csail.mit.edu/6.375/6_375_2006_www/papers/cummings-case-snug99.pdf` | 3 | **200** |
| 14 | `https://lcdm-eng.com/papers/snug12_Paper_final.pdf` | 3 | **200** |
| 15 | `https://gtkwave.sourceforge.net/` | 4 | **200** |
| 16 | `https://github.com/gtkwave/gtkwave` | 4 | **403 to `curl`; 200 via `WebFetch`** `[content]` |
| 17 | `https://gtkwave.github.io/gtkwave/install/mac.html` | 4 | **200** |
| 18 | `https://github.com/Homebrew/homebrew-cask/blob/HEAD/Casks/g/gtkwave.rb` | 4 | **403 to `curl`** |
| 19 | `https://surfer-project.org/` | 4 | **200** |
| 20 | `https://gitlab.com/surfer-project/surfer/-/raw/main/README.md` | 4 | **200** |
| 21 | `https://marketplace.visualstudio.com/items?itemName=lramseyer.vaporview` | 4 | **200** |
| 22 | `http://www.jhauser.us/arithmetic/TestFloat.html` | 5 | **200** (still plain HTTP; no redirect to HTTPS) |
| 23 | `http://www.jhauser.us/arithmetic/SoftFloat.html` | 5 | **200** (ditto) |
| 24 | `https://verilator.org/guide/latest/exe_verilator.html` | 5 | **200** |
| 25 | `https://covered.sourceforge.net/` | 5 | **200** |
| 26 | `https://zipcpu.com/dsp/2017/07/22/rounding.html` | 6 | **200** |
| 27 | `https://en.wikipedia.org/wiki/Q_(number_format)` | 6 | **200** |
| 28 | `https://en.wikipedia.org/wiki/Saturation_arithmetic` | 6 | **200** |
| 29 | `https://people.eecs.berkeley.edu/~wkahan/ieee754status/754story.html` | 7 | **200** |
| 30 | `https://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html` | 7, 8 | **200** |
| 31 | `https://www.verilogpro.com/systemverilog-always_comb-always_ff/` | 9 | **200** |
| 32 | `https://en.wikipedia.org/wiki/IEEE_754` | 10 | **200** |
| 33 | `https://en.wikipedia.org/wiki/Pairwise_summation` | 10 | **200** |

> **The two 403s are this container, not the web.** `curl` through the session proxy gets
> **403 from every `github.com` host** — `github.com/gtkwave/gtkwave`,
> `github.com/Homebrew/...`, and `api.github.com/repos/gtkwave/gtkwave` alike — with any
> `User-Agent` (tested: default and a browser string). `WebFetch` retrieved
> `github.com/gtkwave/gtkwave` normally and it is **active, GPL-2.0, 493 commits on
> master**, consistent with chapter 4's claim that the project is not archived. Note the
> asymmetry with `raw.githubusercontent.com` (row 11), which returns 200 to `curl`.
> **The reviewer should expect the same 403 and must not record it as a dead link.**
> Chapter 4's *substantive* GitHub claim (`archived: false`, tag `v3.3.116`, last commit
> 2026-04-18) could **not** be re-verified field-by-field here — `WebFetch`'s rendering of
> the repo page did not expose the tag or the commit date. Flag for F1: that claim is
> dated 2026-08-09 in the chapter and is now a stale-able measurement.

**Audit verdict: zero dead links in chapters 1-13.** Every one of the 31 non-GitHub URLs
resolved 200 with no cross-host redirect. `jhauser.us` (rows 22-23) is still served over
**plain HTTP and does not upgrade**, which is worth a one-line note if F1 ever normalizes
schemes — rewriting those two to `https://` would break them.

### 1b. Known hazards, re-checked this session — 4 attempts

| URL | Status | Note |
|---|---|---|
| `http://www.sunburst-design.com/papers/CummingsSNUG2000SJ_NBA.pdf` | **200, but redirected off-host** to `https://www.paradigm-works.com/technical-library?term=Nonblocking+Assignments+in+Verilog+Synthesis%2C+Coding+Styles+That+Kill%21` | The chapter-3 hazard **reproduces exactly**. A 200 here is a *false* green: the bytes returned are a search page on another company's site, not the paper. Cummings stays `[title-only]` (or via the MIT 6.375 mirror, rows 12-13, which is what chapters 3/4/11 correctly do). |
| `https://www.sunburst-design.com/` | **200 → `https://www.paradigm-works.com/`** | Whole-domain redirect confirmed. |
| `https://www.digitalsignallabs.com/` | **TLS failure**: `curl: (35) Recv failure: Connection reset by peer` | **Worse than chapter 6 recorded.** Ch06 saw HTTP 503; the connection is now reset during the TLS handshake, so there is no HTTP status at all. Randy Yates, *Fixed-Point Arithmetic: An Introduction* remains correctly `[title-only]` in chapter 6 — and chapter 6's phrasing ("its site returned HTTP 503") should be softened by F1 to "did not serve", since the failure mode has changed. |
| `https://www.digitalsignallabs.com/fp.pdf` | **TLS failure**, same error | — |

### 1c. Frontier sources fetched for this chapter — 43 attempts (first pass)

| URL | Status | Used for |
|---|---|---|
| `https://arxiv.org/abs/2209.05433` | **200** `[content]` | Micikevicius et al., *FP8 Formats for Deep Learning* — abstract, authors, dates (§5) |
| `https://arxiv.org/pdf/2209.05433` | **200** | same paper, PDF route (status only) |
| `https://arxiv.org/abs/1905.12322` | **200** | Kalamkar et al., *A Study of BFLOAT16 for Deep Learning Training* (§4) |
| `https://arxiv.org/abs/1704.04760` | **200** `[content]` | Jouppi et al., *In-Datacenter Performance Analysis of a Tensor Processing Unit* (§8) |
| `https://arxiv.org/abs/1803.04014` | **200** `[content]` | Markidis et al., *NVIDIA Tensor Core Programmability, Performance & Precision* (§8) |
| `https://arxiv.org/abs/2410.21959` | **200** `[content]` | Alexandridis & Dimitrakopoulos, *Online Alignment and Addition in Multi-Term Floating-Point Adders* (§2) |
| `https://arxiv.org/abs/2304.01407` | **200** `[content]` | Mikaitis, *Monotonicity of Multi-Term Floating-Point Adders* (§2, §8) |
| `https://www.opencompute.org/` | **403** | OCP site blocks this container entirely — see §5 |
| `https://www.opencompute.org/documents/ocp-8-bit-floating-point-specification-ofp8-revision-1-0-2023-12-01-pdf-1` | **403** (also 403 via `WebFetch`) | OFP8 spec → `[title-only]` |
| `https://www.opencompute.org/documents/ocp-microscaling-formats-mx-v1-0-spec-final-pdf` | **403** | OCP MX spec → `[title-only]` |
| `https://en.wikipedia.org/wiki/Minifloat` | **200** | FP8 landscape, secondary (§5) |
| `https://en.wikipedia.org/wiki/Bfloat16_floating-point_format` | **200** `[content]` | bfloat16 field widths and the range-preservation claim (§4) |
| `https://en.wikipedia.org/wiki/Half-precision_floating-point_format` | **200** | binary16 fields (§4) |
| `https://en.wikipedia.org/wiki/Unum_(number_format)` | **200** | posit/unum history, secondary (§6) |
| `https://en.wikipedia.org/wiki/Systolic_array` | **200** | systolic-array definition, secondary (§8) |
| `https://en.wikipedia.org/wiki/Tensor_Processing_Unit` | **200** | TPU generations, secondary (§8) |
| `https://en.wikipedia.org/wiki/Kulisch_accumulator` | **404** | **No such article.** Recorded so nobody cites one. Kulisch goes `[title-only]` (§2) |
| `https://docs.nvidia.com/deeplearning/transformer-engine/user-guide/examples/fp8_primer.html` | **200** `[content]` | current TE docs — the E4M3/E5M2 prose has been **removed** from this version (§5) |
| `https://docs.nvidia.com/deeplearning/transformer-engine-releases/release-2.3/user-guide/examples/fp8_primer.html` | **200** `[content]` | TE **2.3.0** — this is where the quoted E4M3/E5M2 sentences live (§5) |
| `https://developer.nvidia.com/blog/floating-point-8-an-introduction-to-efficient-lower-precision-ai-training/` | **200** | NVIDIA FP8 overview (§5) |
| `https://developer.nvidia.com/blog/accelerating-ai-training-with-tf32-tensor-cores/` | **200** | TF32 (§4, §8) |
| `https://cloud.google.com/tpu/docs/bfloat16` | **200**, redirects to `https://docs.cloud.google.com/tpu/docs/bfloat16` | Google's own bfloat16 page (§4). **Cite the effective URL**, not the requested one |
| `https://superfri.org/index.php/superfri/article/view/137` | **200** | Gustafson & Yonemoto, *Beating Floating Point at its Own Game: Posit Arithmetic* (§6) |
| `https://doi.org/10.14529/jsfi170206` | **200 → `superfri.org/...view/137`** | DOI **resolved in session**; safe to cite because the redirect was observed |
| `https://dl.acm.org/doi/10.14529/jsfi170206` | **403** | ACM DL blocks this container — do not cite ACM DL URLs |
| `https://posithub.org/` | **200** | Posit Working Group site (§6) |
| `https://posithub.org/docs/posit_standard-2.pdf` | **200** `[content]` | *Standard for Posit™ Arithmetic (2022)*, 12 pp. — the normative posit source (§6) |
| `https://posithub.org/conga/2019/programme` | **200** | CoNGA 2019 programme, corroborates the de Dinechin venue (§6) |
| `https://inria.hal.science/hal-01959581` | **200** | HAL record for *Posits: the good, the bad and the ugly* (§6) |
| `https://people.eecs.berkeley.edu/~demmel/ma221_Fall20/Dinechin_etal_2019.pdf` | **200** `[content]` | the full text quoted in §6 |
| `https://people.eecs.berkeley.edu/~wkahan/` | **200** | Kahan's page — the home of the 754 history chapter 7 already cites |
| `http://www.acsel-lab.com/arithmetic/arith25/pdf/34.pdf` | **200** `[content]` | Riedy & Demmel, *Augmented Arithmetic Operations Proposed for IEEE-754 2018*, ARITH-25 (§3) |
| `https://grouper.ieee.org/groups/msc/ANSI_IEEE-Std-754-2019/background/ieee-computer.pdf` | **200** | IEEE 754-2019 revision background (§3) |
| `https://754r.ucbtest.org/background/` | **200** | the 754 revision committee's own site (§3) |
| `https://www.siam.org/publications/siam-news/articles/a-new-ieee-754-standard-for-floating-point-arithmetic-in-an-ever-changing-world/` | **403** | SIAM News blocks this container → `[title-only]` |
| `https://peerj.com/articles/cs-330/` | **403** (also 403 via `WebFetch`) | Fasi et al. journal-of-record page → cite the Manchester eprint instead |
| `https://eprints.maths.manchester.ac.uk/2774/1/fhmp20.pdf` | **200** `[content]` | Fasi, Higham, Mikaitis & Pranesh, *Numerical Behavior of NVIDIA Tensor Cores*, MIMS EPrint 2020.10 (§8) |
| `https://eprints.maths.manchester.ac.uk/2761/1/fhms20.pdf` | **200** | sibling MIMS eprint (status only) |
| `https://inria.hal.science/hal-02982017/document` | **200** | correctly-rounded fixed-point dot product (§2, background) |
| `https://link.springer.com/article/10.1007/s00607-010-0131-y` | **200 but degraded** — effective URL gains `?error=cookies_not_supported&code=…` | Kulisch & Snyder, *Very fast and exact accumulation of products*. The 200 is a cookie-error landing page, **not** the article. Treat as a failure; Kulisch stays `[title-only]` |
| `https://ieeexplore.ieee.org/abstract/document/8023074/` | **418** (`I'm a teapot` — bot detection) | IEEE Xplore blocks this container |
| `https://doi.org/10.1109/TCSI.2014.2333680` | **202**, redirected to `https://ieeexplore.ieee.org/document/6862076` | DOI for Sohn & Swartzlander resolves but Xplore returns 202, not a document. **Not** a verified fetch → `[title-only]` |
| `https://api.github.com/repos/gtkwave/gtkwave` | **403** | GitHub API also blocked to `curl` here (see 1a note) |

### 1d. Sources fetched later, while drafting §§2-8 — 12 further attempts

Recorded separately rather than folded in, so the counts in §1c stay as they were measured.

| URL | Status | Used for |
|---|---|---|
| `https://arxiv.org/pdf/2304.01407` | **200** `[content]` | Mikaitis PDF — the four-class taxonomy and reference list (§2.1) |
| `https://arxiv.org/pdf/2410.21959` | **200** `[content]` | Alexandridis & Dimitrakopoulos PDF — alignment costs (§2.3) |
| `https://hal.science/hal-01488916` | **200 to `curl`; 403 to `WebFetch`** (Anubis challenge) | HAL record, Uguen & de Dinechin (§2.2). **Second case of the two fetch paths disagreeing, and in the opposite direction from GitHub.** |
| `https://hal.archives-ouvertes.fr/hal-01488916` | **200 → `hal.science/hal-01488916`** | the legacy HAL host still redirects correctly |
| `https://hal.science/hal-01488916/document` | **200**, `application/pdf` `[content]` | the Kulisch accumulator-width table quoted in §2.2 |
| `https://hal.science/hal-01488916v2/document` | **200**, `application/pdf` | the v2 permalink for the same PDF |
| `https://hal.science/hal-02137968v1/file/Emulation-RN0-HalVersion.pdf` | **200** `[content]` | Boldo, Lauter & Muller — emulating the augmented operations (§3.5) |
| `https://grouper.ieee.org/groups/msc/ANSI_IEEE-Std-754-2019/background/` | **200** | IEEE's own 754-2019 background-document index (§3) |
| `https://par.nsf.gov/biblio/10089378-augmented-arithmetic-operations-proposed-ieee` | **200** | NSF Public Access record for Riedy & Demmel — an open mirror of a paper IEEE Xplore blocks here |
| `https://fprox.substack.com/p/ieee-754-the-floating-point-standard` | **200** | secondary overview of the 754-2019 changes; fetched, **not quoted** |
| `https://doi.org/10.1515/9783110301793` | **202**, redirected to `https://www.degruyterbrill.com/document/doi/10.1515/9783110301793/html` | Kulisch's book. **Not a verified fetch** → stays `[title-only]` (§9.2, entry 9) |
| `https://www.nvidia.com/content/dam/en-zz/Solutions/Data-Center/nvidia-ampere-architecture-whitepaper.pdf` | **200** | *NVIDIA A100 Tensor Core GPU Architecture* whitepaper v1.0; fetched, not quoted (§10) |

**Three lessons this log carries for the writer.**

1. **A 200 is not a verification.** Three rows above return 200 and are still failures: the
   two `sunburst-design.com` rows (redirected to a different company's search page) and the
   Springer row (a cookie-error landing page). A citation checker who greps for status codes
   alone will pass all three. The test that matters is *did the expected content arrive*.
2. **Blocked ≠ dead.** `github.com`, `opencompute.org`, `dl.acm.org`, `peerj.com`,
   `ieeexplore.ieee.org` and `siam.org` all refuse this container while being perfectly
   healthy on the open web. The honest write-up says "not fetchable from here, on this
   date", never "dead".
3. **Vendor documentation moves under a stable URL.** The NVIDIA Transformer Engine FP8
   primer at the *current* docs URL no longer contains the E4M3/E5M2 description that the
   *2.3.0* release URL still does. Cite the pinned-version URL, and say which version.
4. **The two fetch paths disagree in both directions.** `github.com` is 403 to `curl` and
   fine through `WebFetch`; `hal.science` record pages are 200 to `curl` and 403 through
   `WebFetch` (an Anubis anti-bot challenge). **A single-tool verification pass will
   produce false failures either way.** Any reviewer re-checking this bibliography should
   retry a failure through the other path before recording it.

## 2. Single-rounding multi-operand addition: the road chapter 12 declined

**Where the guide left this.** Chapter 12's specification clause **S3** (in "The
Specification, in Full") fixes rounding as roundTiesToEven applied *per addition* — three
roundings for a four-input sum — and **S10** lists "the single-rounding four-input sum"
explicitly out of scope. Chapter 12's "Seeds for Chapters 13 and 14" prices that exclusion
against the exact single-rounding oracle, and chapter 10's "Accuracy Against the Correctly
Rounded Sum" and "Rounding Once Instead of Three Times" carry the fuller tables. **Those
numbers are not restated here.** This section's job is the other side of the ledger: what
the machines that *do* round once look like, and what they cost.

### 2.1 The taxonomy, from a source that names the classes

The cleanest published taxonomy of multi-term adders is in **Mikaitis, *Monotonicity of
Multi-Term Floating-Point Adders*** (arXiv:2304.01407v2, revised 4 Dec 2023 —
`https://arxiv.org/abs/2304.01407`, HTTP 200, 2026-08-21; the PDF at `arxiv.org/pdf/…`
was downloaded and text-extracted here). It sorts hardware multi-term adders into four
classes. Quoting the class headings verbatim from the extracted text:

- **"Class I: Adders that use long accumulators."** Retain every bit, round once at the
  end — "This is advocated by Kulisch". The paper cites an implementation by Koenig,
  Bachrach and Asanović that "used 4288 bits internally for multiplying and accumulating
  binary64 values exactly", and warns that "keeping all of the bits can be expensive in
  circuit area and latency due to carry propagation." ARM's High-Precision Anchored (HPA)
  accumulators (Burgess, Goodyer, Hinds, Lutz) are placed in this class too.
- **"Class II: Adders that achieve correct rounding without the use of long
  accumulators."** Tenca's fused three-term design — the paper's summary is the sentence
  chapter 14 should quote, because it is exactly the guide's own guard/round/sticky
  problem scaled up: Tenca "proposes a fused design for performing fl(a+b+c) with only one
  rounding error, which complicates the problem in that bits that are shifted out in the
  significand alignment step have to be tracked." Sohn and Swartzlander's fused two-term
  dot product, three-term adder and four-term dot product are in this class, as is Tao et
  al.'s generalized n-term fused dot product.
- **"Class III: Adders that replicate software behaviour."** Units that deliberately keep
  the intermediate roundings so their bits match a software IEEE 754 sequence. **This is
  the class the guide's `fp32_add4` belongs to** — and the paper supplies the motivation
  the guide arrived at independently, quoting Kim & Kim: *"the exact bit-level matching
  between hardware units and software models is more important in 3D graphics than the
  rounding errors to the real value."* That is S3's argument in someone else's words, and
  it is the single most useful citation in this section for chapter 14's framing.
- **"Class IV: Adders that use limited precision accumulator."** Align to the maximum
  exponent, shift in *limited* precision, add with a few carry bits, normalize once.
  Kaul et al.; Lopes & Constantinides' configurable FPGA dot product; Hickmann et al.'s
  32×32 matrix unit with "internal accumulation of products … limited to 37 bits". The
  paper flags the vocabulary trap here: Hickmann et al. call their unit *fused* although
  "only the products are exact, not the accumulation of them, this has a different
  meaning than the Class I/II designs".

The paper's central result matters directly to a guide about a **four**-input adder:
its abstract states that "common techniques for performing multi-term addition with
$n\geq 4$, without normalization of intermediate quantities, can result in
non-monotonicity -- increasing one of the addends $x_i$ decreases the sum $s_n$."
Non-monotonicity is a property the guide's composed design **cannot** have, because every
intermediate is a normalized, correctly rounded binary32 — a genuine, if unglamorous,
advantage of Class III that chapter 12 never claimed and now can.

### 2.2 The price tag, computed here rather than asserted

The literature quotes accumulator widths without deriving them. The derivation is short
and was run in `python3` this session (`widths.py` in the scratchpad); these are
**arithmetic, not citations**, and the writer should present them that way.

For binary32 the exact fixed-point span of a *single* finite value runs from the least
significant bit of the smallest subnormal, 2^−149, to just under 2^128:

| quantity | value | how |
|---|---|---|
| binary32 exact span, one value | **277 bits** | 128 − (−149) |
| exact accumulator for *n* = 4 binary32 addends | **280 bits** | 277 + ⌈log₂ 4⌉ carry bits + 1 sign |
| the guide's actual significand datapath | **28 bits** | chapter 8, "The Width Budget: 28 Bits" |
| ratio | **10×** | — |
| binary32 exact *product* span (dot product) | **554 bits** | 256 − (−298) |
| widely quoted Kulisch width for binary32 | ~640 bits | 554 + 86 guard bits, consistent |
| binary64 product span | **4196 bits** | 2×1024 − 2×(−1074) |
| Koenig/Bachrach/Asanović figure quoted by Mikaitis | **4288 bits** | 4196 + 92 guard bits, consistent |

**And there is a fetch-verified primary source for exactly this table.** **Uguen, Y. and
de Dinechin, F., "Design-space exploration for the Kulisch accumulator", HAL preprint
hal-01488916v2, 20 March 2017** — the record page `https://hal.science/hal-01488916`
returned HTTP 200 to `curl` (though **403 to `WebFetch`**, which hits an Anubis
challenge — a second case of the two fetch paths disagreeing, §1's tool note), and the PDF
at `https://hal.science/hal-01488916/document` returned HTTP 200 and was text-extracted
here. Its **Table 1, "Accumulator sizes for the IEEE-754 formats"**, verbatim:

> "binary16 (half) 2−24 215 80 bits / binary32 (single) 2−149 2127 554 bits / binary64
> (double) 2−1074 21023 4196 bits"

**Those are the same 554 and 4196 the `python3` derivation above produced**, from the field
widths alone and with no knowledge of the paper — two independent routes to the same
numbers. The paper also supplies the provenance of the 4288 figure directly: "Kulisch even
proposed [4] to add even more bits to absorbe possible temporary overflows, leading to 4288
bits of accumulator for double precision." So 4288 = 4196 + 92 headroom bits is *stated*,
not inferred; the guide's derivation only confirms the base.

The same paper gives the one cost figure in this section that comes from a real synthesis
flow: comparing its best binary32 Kulisch accumulator against the naive alternative of
accumulating in binary64, *"The Proposed 1 accumulator requires 5x the resources, but
brings in a 30x latency improvement."* **Flag as the authors' FPGA results**, not anything
measured here.

That last table row is the check worth keeping: the widely quoted 4288 is not a magic
number, it is the exact binary64 product span plus 92 bits of carry headroom. The same
construction gives ~640 for binary32, which is the number the folklore quotes — and note
that the *minimum* width for binary32, per the paper's own table, is **554**; the 640 is
554 plus the analogous headroom.

**So the honest headline for chapter 14 is:** buying single rounding for four binary32
operands at full range costs a **~280-bit** alignment-and-accumulate datapath and a
leading-zero count / normalize over the same width, against **28 bits** in the shipped
design — roughly an order of magnitude in the significand path, plus a normalize stage
whose depth grows with the accumulator, not with the format. Chapter 11's "Cutting at the
Priced Seams" already established where this design's long paths are; a 280-bit LZC lands
on exactly those seams and makes them worse. **No synthesis tool exists in this
environment** (chapter 11, "Timing, Fmax, and the Epistemic Wall"), so no area or Fmax
number may be claimed for a hypothetical wide-accumulator variant — only the bit widths,
which are arithmetic.

### 2.3 What the wide path buys, and what the cheap alternatives buy

- **Class I buys exactness and order-independence by construction.** Every quantity
  chapter 10 measured about association order — "How Often the Shape Matters", "One
  Multiset, Three Answers", "'Both Orders Agree' Is Not an Oracle" — becomes vacuous,
  because there is one rounding and no association to choose. It also removes the
  intermediate-overflow pathology chapter 12's S3 note documents (a level-1 `+inf` from
  four finite operands), because ±2^128-scale partials fit inside the register.
- **Class II buys the same answer at less width, by tracking shifted-out bits** instead
  of keeping them. This is the guide's own guard/round/sticky discipline (chapter 8,
  "Compare, Swap, and the Alignment Shift"; chapter 2's `align_sticky.v`) generalized to
  three or more operands — which is why Tenca's complication, "bits that are shifted out
  in the significand alignment step have to be tracked", reads as familiar rather than
  exotic to a reader of this guide.
- **Class IV buys speed and area and gives up both exactness and monotonicity.** It is
  what the deployed matrix units actually do (§8).

**Alignment is the cost centre, and there is recent work on it.** Alexandridis &
Dimitrakopoulos, *Online Alignment and Addition in Multi-Term Floating-Point Adders*
(arXiv:2410.21959, submitted 29 Oct 2024 — `https://arxiv.org/abs/2410.21959`, HTTP 200,
2026-08-21; PDF text-extracted here) states the problem in the guide's own terms:
"Alignment is executed serially by identifying first the maximum of all exponents and then
shifting the fraction of each term according to the difference of its exponent from the
maximum one." Their fused, associative align-and-add operator reports "area and power
savings range between 3%–23% and 4%–26%, respectively" over a baseline multi-term adder,
measured on 16-, 32- and 64-input FP32 and BFloat16 designs. **Flag as documentation:**
these are the authors' synthesis results on their own flow, not anything reproduced here.

### 2.4 The one thing this guide can say that the taxonomy does not

Chapter 10's "'Both Orders Agree' Is Not an Oracle" and chapter 12's S3 discharge a
question the multi-term-adder literature mostly steps past: *how wrong is Class III,
measured, at n = 4, in binary32, against an exact single-rounding oracle, split by
operand-exponent regime.* The literature's framing is "single rounding improves precision"
(Mikaitis's own opening clause). The guide's contribution is the number that "improves"
stands for, plus the finding that the improvement is regime-dependent by more than an
order of magnitude. §11 states that at its proper strength.

## 3. IEEE 754-2019 augmented operations

**Status of the standard itself: `[title-only]`.** IEEE Std 754-2019 is paywalled; the
IEEE record page `https://standards.ieee.org/ieee/754/6210/` was fetched (HTTP 200,
2026-08-21) but serves a purchase page, not clause text — exactly as chapter 1's source
list already says. **Nothing below quotes normative text.** Everything is from the
revision committee's own public background site, from the ARITH-25 paper by the proposers,
and from a follow-up paper — all three fetched and text-extracted here.

### 3.1 What was added, and where

`https://754r.ucbtest.org/background/` (HTTP 200, 2026-08-21) is the 754 revision
committee's public page. Verbatim from the fetched text:

> "754-2019 was approved by IEEE Standards Board on 13 June 2019 and published in July
> 2019. David Hough was chair, Mike Cowlishaw was editor."

and, in its list of principal changes from 754-2008:

> "9.5 new augmented{Addition,Subtraction,Multiplication} are recommended"

with the motivating sentence:

> "augmented addition, subtraction, and multiplication operations support building higher
> precision in software and support reproducible reductions on arrays, and new operations
> get and set NaN payloads. These recommended operations might be required in a future
> edition of this standard."

So: **clause 9.5, recommended not required, and the committee itself flags a possible
future promotion to required.** That is the entire load-bearing claim about the standard,
and it comes from the committee's site rather than from the standard. Chapter 10's
"Rounding Once Instead of Three Times" already states the recommended-not-required status
via the Wikipedia IEEE 754 article; that article was re-fetched here (HTTP 200) and its
reference list confirms the clause numbering (`IEEE 754 2019, §9.5`) and cites the same
Riedy & Demmel paper used below. Chapter 14 should upgrade the citation from Wikipedia to
`754r.ucbtest.org`, which is the committee's own page.

### 3.2 Why they were added — the proposers' own account

**Riedy, E. J. and Demmel, J., "Augmented Arithmetic Operations Proposed for IEEE-754
2018", 25th IEEE Symposium on Computer Arithmetic (ARITH 2018), pp. 49-56.**
`http://www.acsel-lab.com/arithmetic/arith25/pdf/34.pdf` — HTTP 200, 2026-08-21, PDF
downloaded and text-extracted here. Verbatim from the abstract:

> "These operations were included after three decades of experience because of a
> motivating new use: bitwise reproducible arithmetic. Standardizing the operations
> provides a hardware acceleration target that can provide at least a 33% speed
> improvements in reproducible dot product, placing reproducible dot product almost within
> a factor of two of common dot product."

(The grammatical slip "a 33% speed improvements" is in the source; preserved deliberately —
see §0 rule 3.)

The mechanism, from §I of the same paper, in the terms this guide already uses:

> "The first new operation is a variation of the well-known twoSum operation, which takes
> two floating point summands x and y, and returns both their rounded sum h = round(x + y),
> and the exact error t = x + y − h … The letters h and t are chosen to stand for head
> (the leading bits of the sum) and tail (the trailing bits)."

And the constraint that makes the tail exact — which is a *precision* statement a hardware
reader should notice:

> "For the error t to be exactly representable, the initial rounding must be to-nearest,
> with any tie-breaking rule and with gradual underflow."

**Gradual underflow is load-bearing.** Chapter 12's S2 ("Formats") already commits this
design to gradual underflow with no flush-to-zero, so the guide's adder happens to satisfy
the precondition. Riedy & Demmel make the converse explicit: "Abrupt underflow, for
example, breaks the exact transformation property of augmentedAddition." A flush-to-zero
FPU cannot host these operations correctly.

### 3.3 The rounding direction, and why it is not roundTiesToEven

This is the detail most secondary summaries get wrong, and it matters to a guide whose
whole rounder is roundTiesToEven. The augmented operations use a **new rounding direction
defined only for them**, `roundTiesToZero`. From the paper:

> "The operations rely on a new rounding direction, roundTiesToZero, for reasons explained
> in Section IV-A. The rounding direction is required for these operations and is
> independent of other rounding attributes."

The rationale, from §IV-A: three of the five 754-2008 directions "break the exact
transformation property of augmentedAddition (barring overflow)"; an early draft used
`roundTiesToAway`, but a user survey found cases it could not serve (the paper names
Shewchuk's *Triangle* mesh generator's geometric predicates), so `roundTiesToZero` was
introduced "defined only in the recommended augmented arithmetic operations clause".

**Consequence for this guide, stated plainly:** `fp32_add4` implements roundTiesToEven
(chapter 12, S3). An `augmentedAddition` unit is therefore *not* a mode switch on this
design — it is a different rounder plus a second output port carrying the tail. Chapter 7's
"Rounding: Five Attributes, One Default" enumerates five attributes; augmented operations
add a sixth that exists nowhere else in the standard.

### 3.4 The exceptional cases, which are where a hardware implementer bleeds

Riedy & Demmel §III specifies behaviour the guide's own S4/S5 clauses would have to grow
counterparts for. Verbatim highlights:

- zero result: "If roundTiesToZero(x + y) is zero, then both the head and tail have the
  same sign; h = t = roundTiesToZero(x + y)."
- overflow: "if roundTiesToZero(x + y) overflows, both the head and tail are set to the
  same infinity, and in this case the operation signals inexact and overflow."
- NaN: "If either operand is a NaN, augmentedAddition produces the same quiet NaN for both
  h and t."
- and the flag rule, which is the opposite of what a reader would guess: "This operation
  signals inexact only when roundTiesToZero(x + y) overflows; underflows and zeros are
  exact."

That last line is worth chapter 14's attention because chapter 12's flag specification
(S3's `inexact` = the composition's OR, measured one-directional over-reporting) is a
*different* answer to the same question, arrived at by measurement. Chapter 10's "Flags
Under Composition" is the place to cross-reference.

### 3.5 Does anything implement them? — what I could and could not verify

**What I verified:** nothing implements them in hardware that I could confirm from a
fetched source. What I *can* cite, fetch-verified, is the state of play as the community
described it:

- Chapter 10 already records the Wikipedia IEEE 754 article's no-known-hardware framing
  (re-fetched HTTP 200 here).
- **Boldo, S., Lauter, C. Q. and Muller, J.-M., "Emulating round-to-nearest-ties-to-zero
  'augmented' floating-point operations using round-to-nearest-ties-to-even arithmetic"**,
  HAL preprint hal-02137968v1, submitted 23 May 2019 —
  `https://hal.science/hal-02137968v1/file/Emulation-RN0-HalVersion.pdf`, HTTP 200,
  2026-08-21, text-extracted here. Its motivation is the direct answer to "does anything
  implement them": *"Obtaining very fast reproducible summation with that algorithm will
  certainly require a direct hardware implementation of these operations. However, having
  these operations available on common processors will certainly take time. The purpose of
  this paper is to show that, in the meantime, one can emulate these operations with
  conventional floating-point operations."* The paper assumes an FMA is available.

**What I could not verify, and the chapter must not claim.** I searched for augmented-
operation support in current toolchains and found no source I was willing to cite: the
search results that discussed implementation status were either secondary blog summaries
or paywalled. **IEEE Xplore returned HTTP 418 to this container and ACM DL returned 403**
(§1c), so the obvious venues for a 2020s survey were unreachable. The honest sentence for
chapter 14 is: *as of the sources fetchable here on 2026-08-21, the augmented operations
remain recommended-not-required, the proposers' own follow-up literature is about
emulating them in software, and this research pass found no fetch-verifiable evidence of a
hardware implementation.* That is weaker than "no hardware implements them" and it is what
the evidence supports.

### 3.6 The connection back to the four-input adder

`augmentedAddition` is the standardized form of the thing chapter 10's "Rounding Once
Instead of Three Times" describes: a two-input adder that also hands back its own rounding
error. Given it, a correctly rounded four-input sum is a *software* problem on top of
*this guide's* hardware — accumulate the tails and re-inject them — rather than the
~280-bit datapath of §2.2. That is the honest framing for chapter 14: **there are two
roads out of S10, one of them widens the datapath tenfold and one of them adds a second
output port and a sixth rounding direction.**

## 4. bfloat16, FP16, TF32: range versus precision

**Method note.** Every number in this section's table was computed here this session by a
small `python3` model (`formats.py` in the scratchpad) that enumerates each format's
pattern census from `(ew, mw)` alone and computes minsub / minnorm / maxfinite in exact
`Fraction` arithmetic. It is validated by reproducing **chapter 5's** published E4M3
census ("Verifying Floating Point Specifically": "2 zeros, 14 subnormals, 224 normals, 2
infinities and 14 NaNs") bit-for-bit, and by reproducing the two FP8 maxima NVIDIA's own
documentation states (§5). The table is therefore *arithmetic*, not a citation — but it is
arithmetic the reviewer can re-run.

### 4.1 The census

| format | ew | mw | p | bias | zero | subnormal | normal | inf | NaN | min subnormal | min normal | max finite | ulp(1) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **binary32** (this guide) | 8 | 23 | 24 | 127 | 2 | 16,777,214 | 4,261,412,864 | 2 | 16,777,214 | 1.4013e−45 | 1.17549e−38 | 3.40282e+38 | 2⁻²³ |
| binary16 (FP16) | 5 | 10 | 11 | 15 | 2 | 2,046 | 61,440 | 2 | 2,046 | 5.96046e−08 | 6.10352e−05 | 65,504 | 2⁻¹⁰ |
| **bfloat16** | 8 | 7 | 8 | 127 | 2 | 254 | 65,024 | 2 | 254 | 9.18355e−41 | 1.17549e−38 | 3.38953e+38 | 2⁻⁷ |
| TF32 (19 bits) | 8 | 10 | 11 | 127 | 2 | 2,046 | 520,192 | 2 | 2,046 | 1.14794e−41 | 1.17549e−38 | 3.40116e+38 | 2⁻¹⁰ |

### 4.2 bfloat16: the point of the format, stated precisely

**bfloat16's whole design is one decision — keep binary32's exponent field, spend the
saving on the significand.** Wikipedia's bfloat16 article
(`https://en.wikipedia.org/wiki/Bfloat16_floating-point_format`, HTTP 200, 2026-08-21;
the two strings below were confirmed present by a literal substring test against the
fetched bytes) puts it:

> "This format is a shortened (16-bit) version of the 32-bit IEEE 754 single-precision
> floating-point format (binary32)"

> "It preserves the approximate dynamic range of 32-bit floating-point numbers by
> retaining 8 exponent bits, but supports only an 8-bit precision rather than the 24-bit
> significand of the binary32 format."

Note the word **"approximate"** — the article is careful, and chapter 14 must be too,
because the computed census shows exactly where the approximation lies:

- **Identical:** exponent width 8, bias 127, and therefore the *minimum normal* magnitude
  (1.17549e−38 for both, to every digit — same `emin`).
- **Not identical:** the subnormal floor. binary32 reaches 2⁻¹⁴⁹; bfloat16 only 2⁻¹³³,
  because the ramp is 7 bits deep instead of 23. Roughly **16 binades shallower.**
- **Not identical:** the largest finite value. 3.38953e+38 against 3.40282e+38 — same
  binade, but bfloat16 cannot reach as far into it because its significand tops out at
  2−2⁻⁷ rather than 2−2⁻²³.

So the accurate sentence is *"the same exponent range as binary32"* — which is a statement
about the exponent field, and is exactly true — not *"the same dynamic range"*, which is
true only to within a rounding of the endpoints. This is the same kind of precision
chapter 7's "Bias 127, and What the Missing One Buys" already applies to binary32 itself.

**The empirical case for the trade** is Kalamkar et al., *A Study of BFLOAT16 for Deep
Learning Training* (arXiv:1905.12322 — `https://arxiv.org/abs/1905.12322`, HTTP 200,
2026-08-21). Its stated motivation is the range argument: bfloat16 is attractive because
its representable range matches FP32's and conversion to and from FP32 is trivial, so no
hyper-parameter retuning is needed — where IEEE binary16 does require it. **Flag as the
authors' claim about their experiments, not as a general result**, and note that this is a
machine-learning finding with no bearing on the arithmetic questions this guide measures.

**Google's own Cloud TPU page** on bfloat16 was fetched (requested
`https://cloud.google.com/tpu/docs/bfloat16`, HTTP 200, redirecting to
`https://docs.cloud.google.com/tpu/docs/bfloat16` — **cite the effective URL**). Its
rendered body did not extract cleanly to text from this container (the fetched bytes are
dominated by site navigation), so **no quotation from it appears in these notes**. It is
recorded in the bibliography as fetched-but-not-quoted rather than dropped, because it is
the origin vendor's page.

### 4.3 FP16: the format bfloat16 was invented to avoid

binary16 is the IEEE-standard 16-bit format and the census shows the opposite trade:
11 bits of precision (3 more than bfloat16) bought with a 5-bit exponent, so max finite is
**65,504** and the normal floor is **6.1e−05**. Chapter 5's "Verifying Floating Point
Specifically" already names binary16 as the guide's mid-size exhaustive-verification
target ("run binary16 overnight"), and its 4,294,967,296-pair exhaustive space is a real
overnight job — the census above is where that number comes from.

The consequence for training, and the reason loss scaling exists, is the range: gradients
underflow a 5-bit exponent. §5's NVIDIA source states the mechanism in its own words.

### 4.4 TF32: not a storage format

**NVIDIA, "Accelerating AI Training with NVIDIA TF32 Tensor Cores"**
(`https://developer.nvidia.com/blog/accelerating-ai-training-with-tf32-tensor-cores/`,
HTTP 200, 2026-08-21). All five strings below were confirmed present verbatim in the
fetched bytes by literal substring test:

> "TF32 mode in the Ampere generation of GPUs adopts 8 exponent bits, 10 bits of mantissa,
> and one sign bit."

> "As a result, it covers the same range of values as FP32. TF32 also maintains more
> precision than BF16 and the same amount as FP16."

> "TF32 is only exposed as a Tensor Core operation mode, not a type. All storage in memory
> and other operations remain completely in FP32, only convolutions and
> matrix-multiplications convert their inputs to TF32 right before multiplication."

and the arithmetic pattern that §8 is about:

> "rounds FP32 inputs to TF32, computes the products without loss of precision, then
> accumulates those products into an FP32 output"

**Two honest annotations chapter 14 should attach to that vendor text.**

1. **"the same range of values as FP32" is the vendor's phrasing and is approximate in the
   same way bfloat16's is.** Computed here: TF32's max finite is 3.40116e+38 against
   binary32's 3.40282e+38, and its subnormal floor is 1.148e−41 against 1.401e−45. Same
   exponent field, same `emin`; not the same endpoints. The claim is a claim about the
   exponent, and it is fair as such.
2. **TF32 is 19 bits and has no storage form**, which is why "32" in the name describes
   the interface, not the datum. There is no TF32 memory layout for the guide's adder to
   target.

### 4.5 The one-line summary for the chapter

Read down the `ulp(1)` column of §4.1 against the `bias`/`ew` columns and the whole family
resolves into one sentence: **binary16 keeps IEEE's shape and shrinks the exponent;
bfloat16 and TF32 keep binary32's exponent and shrink the significand.** Everything else —
loss scaling, the hybrid E4M3/E5M2 recipe of §5, the FP32 accumulator of §8 — follows from
which of those two choices a format made.

## 5. FP8: E4M3 and E5M2, and the naming collision this guide already stepped in

### 5.1 The primary source, and its one typo

**Micikevicius, P. et al. (15 authors), "FP8 Formats for Deep Learning", arXiv:2209.05433,
submitted 12 Sep 2022, last revised 29 Sep 2022 (v2).**
`https://arxiv.org/abs/2209.05433` — HTTP 200, 2026-08-21. The abstract was extracted from
the fetched HTML and checked by literal substring test. Verbatim:

> "In this paper we propose an 8-bit floating point (FP8) binary interchange format
> consisting of two encodings - E4M3 (4-bit exponent and 3-bit mantissa) and E5M2 (5-bit
> exponent and 2-bit mantissa). While E5M2 follows IEEE 754 conventions for representatio
> of special values, E4M3's dynamic range is extended by not representing infinities and
> having only one mantissa bit-pattern for NaNs."

**"representatio" is a typo in the arXiv abstract, not a transcription error here.** It is
reproduced deliberately: a citation checker who re-fetches the page will find it, and a
silently corrected quotation would fail the check. Flag it in the chapter with a `[sic]`
rather than fixing it.

The author list, from the same fetch: Paulius Micikevicius, Dusan Stosic, Neil Burgess,
Marius Cornea, Pradeep Dubey, Richard Grisenthwaite, Sangwon Ha, Alexander Heinecke,
Patrick Judd, John Kamalu, Naveen Mellempudi, Stuart Oberman, Mohammad Shoeybi, Michael
Siu, Hao Wu. That the list spans NVIDIA, Arm and Intel is the interesting part: this is a
cross-vendor proposal, not a single company's format.

### 5.2 The standardizing body's document — `[title-only]`, with the reason

The normative FP8 document is **Open Compute Project, "OCP 8-bit Floating Point
Specification (OFP8)", Revision 1.0, 2023-12-01**. It could **not** be fetched here:
`https://www.opencompute.org/documents/ocp-8-bit-floating-point-specification-ofp8-revision-1-0-2023-12-01-pdf-1`
returned **HTTP 403 to `curl` and HTTP 403 to `WebFetch`**, and `https://www.opencompute.org/`
returned 403 too, so the whole host refuses this container. The companion **"OCP
Microscaling Formats (MX) Specification v1.0"** returned 403 likewise. Both are therefore
`[title-only]` in the bibliography, and **no clause of either may be quoted in chapter 14.**

### 5.3 The vendor documentation that *is* fetchable, and what it says

**NVIDIA, "Using FP8 with Transformer Engine", Transformer Engine 2.3.0 documentation** —
`https://docs.nvidia.com/deeplearning/transformer-engine-releases/release-2.3/user-guide/examples/fp8_primer.html`
(HTTP 200, 2026-08-21; text extracted here). Verbatim:

> "The FP8 datatype supported by H100 is actually 2 distinct datatypes, useful in
> different parts of the training of neural networks: E4M3 - it consists of 1 sign bit, 4
> exponent bits and 3 bits of mantissa. It can store values up to +/-448 and nan . E5M2 -
> it consists of 1 sign bit, 5 exponent bits and 2 bits of mantissa. It can store values
> up to +/-57344, +/- inf and nan . The tradeoff of the increased dynamic range is lower
> precision of the stored values."

**Version pinning matters and the chapter must say why.** The *current* Transformer Engine
docs page for the same document (`.../transformer-engine/user-guide/examples/fp8_primer.html`,
HTTP 200, 2026-08-21) **no longer contains that passage** — the text has been reorganized
around MXFP8 and block scaling, and the E4M3/E5M2 description is gone from it. Cite the
**2.3.0** URL and state the version, or the quotation dies at the next docs refresh.

The same page states the hybrid recipe and the reason for it: forward activations and
weights use E4M3 because they need precision; gradients use E5M2 because they need range.
It also gives the FP16 background that explains the whole family, verbatim: *"while the
dynamic range of FP16 is enough to store the distribution of the gradient values, this
distribution may be centered around values too high or too low for FP16 to handle. Scaling
the loss shifts those distributions (without affecting numerics by using only powers of 2)
into the range representable in FP16."* And the FP8-specific complication: *"While the
dynamic range provided by the FP8 types is sufficient to store any particular activation
or gradient, it is not sufficient for all of them at the same time. This makes the single
loss scaling factor strategy, which worked for FP16, infeasible for FP8 training and
instead requires using distinct scaling factors for each FP8 tensor."*

### 5.4 The collision, computed — this guide's E4M3 is not OCP's E4M3

Chapter 5 already flagged this, in "Verifying Floating Point Specifically": its E4M3 is
*"an IEEE-shaped E4M3, with infinities; the OCP FP8 format of the same name has none, so
its population differs."* **Chapter 14 must not re-open that; it should cash it out.** The
`formats.py` census run here makes the difference concrete:

| | ch05's IEEE-shaped E4M3 | OCP OFP8 E4M3 (per the arXiv abstract's rule) |
|---|---|---|
| exponent field all-ones | reserved for inf/NaN | **a normal binade** |
| zeros | 2 | 2 |
| subnormals | 14 | 14 |
| **normals** | **224** | **238** |
| infinities | **2** | **0** |
| NaN patterns | **14** | **2** (one mantissa pattern × two signs) |
| **max finite** | **240** | **448** |
| min subnormal | 0.001953125 | 0.001953125 |
| ulp(1) | 2⁻³ | 2⁻³ |

Two independent confirmations that the right-hand column is the real OFP8 rule, despite
the spec itself being unfetchable:

1. **448 is exactly what NVIDIA's fetched documentation says** ("It can store values up to
   +/-448 and nan"), and 448 = 1.75 × 2⁸ = the all-ones exponent field with mantissa `110`.
2. **The arXiv abstract's "one mantissa bit-pattern for NaNs" reconciles with "two NaN bit
   patterns"** the moment you count the sign: one mantissa pattern (`111`) under the
   all-ones exponent, times two signs, is two encodings. Both statements are true and they
   describe the same format.

**E5M2 has no such collision.** It is IEEE-shaped, so ch05's parameterised model and OCP's
E5M2 agree: 2 zeros, 6 subnormals, 240 normals, 2 infinities, 6 NaNs, max finite **57,344**
— and 57,344 is precisely NVIDIA's fetched figure. That agreement is the check that the
census model is right, which is what licenses the E4M3 column beside it.

**The lesson for the guide, which is a citation lesson and belongs in this chapter:** two
formats with the same name and the same field widths differ by a factor of **1.87×** in
maximum representable value and by **12 NaN encodings**, because one of them spends the
all-ones exponent on numbers. A guide that says "E4M3" without saying *whose* has said
nothing checkable. Chapter 5 got this right in a parenthesis; chapter 14 should promote it
to a rule.

### 5.5 Further fetchable FP8 sources

- **NVIDIA, "Floating-Point 8: An Introduction to Efficient, Lower-Precision AI Training"**
  — `https://developer.nvidia.com/blog/floating-point-8-an-introduction-to-efficient-lower-precision-ai-training/`,
  HTTP 200, 2026-08-21. Vendor overview; fetched, not quoted here.
- **Wikipedia, "Minifloat"** — `https://en.wikipedia.org/wiki/Minifloat`, HTTP 200,
  2026-08-21. Secondary; useful for the wider 8-bit landscape (including formats with no
  subnormals at all), but do not let it stand in for the OCP spec.

## 6. Posits and tapered precision, with the criticisms

### 6.1 The normative source — and it is fetchable, unlike IEEE 754

**Posit Working Group (John Gustafson, Chair), "Standard for Posit™ Arithmetic (2022)",
sponsored by the National Supercomputing Centre (NSCC) Singapore, dated 2 March 2022,
12 pages.** `https://posithub.org/docs/posit_standard-2.pdf` — HTTP 200, 2026-08-21;
downloaded and text-extracted here with `pypdf`. **This is the one arithmetic standard in
this chapter's bibliography that is free to read**, which is itself worth a sentence in
chapter 14 next to IEEE 754-2019's `[title-only]` tag.

> **Quotation caveat, and the reviewer needs it.** This PDF's text layer **drops most
> inter-word spaces in body text** — `pypdf` returns the §2 definition of NaR as
> `NaR Notareal. Umbrellavalueforanythingnotmathematicallydefinableasauniquerealnumber.`
> The rendered page is normal; the extraction is not. Every posit-standard quotation below
> therefore has **word spaces restored** and is matched against the source
> whitespace-insensitively. Nothing else was changed — no words added, none dropped, and
> the definition entries carry **no colon** after the term, which is why none is printed
> here. A reviewer comparing against the rendered PDF will find these strings; a reviewer
> comparing against a raw text extraction should strip spaces on both sides first.

From the standard's own definitions (§2) and formats clause (§3), spaces restored per the
caveat:

- **The exponent field is two bits, fixed.** "exponent bits A two-bit unsigned integer bit
  field that determines the exponent." and "exponent The power-of-two scaling determined by
  the exponent bits, in the set {0, 1, 2, 3}." (The pre-2022 posit literature had a
  variable `es`; the 2022 standard fixed it at 2. Chapter 14 must date this, because older
  papers describe a different format.)
- **The regime is variable-length, signed-unary.** "regime bits A posit bit field following
  the MSB that uses a form of signed unary encoding (as opposed to positional notation) to
  represent the regime." and "regime The power-of-16 scaling determined by the regime bits.
  It is a signed integer."
- **One exception value, not a family.** "NaR Not a real. Umbrella value for anything not
  mathematically definable as a unique real number." — a single encoding, against
  binary32's 2 infinities and 16,777,214 NaNs.
- **The quire is in the standard, and it is 16n bits.** "There is a quire format of
  precision 16n that is used to contain exact sums of products of posits of precision n."
  (the `n` is set in math italic in the source) and — this one survives extraction with its
  spaces intact and matches literally — "Quire format can represent the exact dot product of
  two posit vectors having at most 2^31 (approximately two billion) terms without the
  possibility of rounding or overflow."
- **Its Table 1** gives, for posit32: fraction length **0 to 27 bits**, minPos 2⁻¹²⁰,
  maxPos 2¹²⁰, quire precision **512 bits**, quire sum limit 2¹⁵¹.

### 6.2 A posit decoder, written here, that reproduces the standard's table

`posit.py` in the scratchpad implements the decode from the standard's §3.3 field
description (sign, two's-complement for negatives, signed-unary regime, 2 exponent bits,
remaining fraction bits, truncated fields treated as 0) and enumerates every pattern.
**It reproduces the standard's Table 1 without being told the answers**, which is the
check that licenses the derived numbers below:

| | model output | standard's Table 1 |
|---|---|---|
| posit8 minPos / maxPos | 2⁻²⁴ / 2²⁴ | 2⁻²⁴ / 2²⁴ ✓ |
| posit16 minPos / maxPos | 2⁻⁵⁶ / 2⁵⁶ | 2⁻⁵⁶ / 2⁵⁶ ✓ |
| posit32 max fraction bits | 27 | "0 to 27 bits" ✓ |

**The census, from the same run** (and this is the structural contrast with §4.1's table):
posit8 is 256 patterns = **1 zero + 1 NaR + 254 nonzero reals**. posit16 is 65,536 =
1 + 1 + 65,534. Compare binary16's 65,536 = 2 zeros + 2 infinities + 2,046 NaNs + 61,442
finite. **A posit spends 2 patterns on non-numbers; binary16 spends 2,050.** That is the
"better closure / simpler exception handling" claim of §6.3, in counted encodings.

**The taper, tabulated.** For posit32 the fraction-bit count falls one bit per regime step:

| regime r | magnitude range | regime bits | fraction bits |
|---|---|---|---|
| 0 | [2⁰, 2⁴) | 2 | **27** |
| 1 | [2⁴, 2⁸) | 3 | 26 |
| 2 | [2⁸, 2¹²) | 4 | 25 |
| 3 | [2¹², 2¹⁶) | 5 | 24 |
| **4** | **[2¹⁶, 2²⁰)** | 6 | **23** ← binary32's precision |
| 5 | [2²⁰, 2²⁴) | 7 | 22 |
| 7 | [2²⁸, 2³²) | 9 | 20 |

So posit32 carries **four more fraction bits than binary32 near 1.0** and falls below
binary32 above 2²⁰. That crossover is not a coincidence — §6.4 shows an independent source
naming the same threshold.

### 6.3 The claim, from the paper that made it

**Gustafson, J. L. and Yonemoto, I. T., "Beating Floating Point at its Own Game: Posit
Arithmetic", *Supercomputing Frontiers and Innovations* 4(2):71-86, 2017.**
`https://superfri.org/index.php/superfri/article/view/137` — HTTP 200, 2026-08-21;
abstract extracted from the fetched page. The DOI `https://doi.org/10.14529/jsfi170206`
**was resolved in this session** and redirects to that same page (HTTP 200), so it is safe
to cite; the ACM DL mirror at `https://dl.acm.org/doi/10.14529/jsfi170206` returned
**HTTP 403** and must not be cited. Verbatim from the abstract:

> "they provide compelling advantages over floats, including larger dynamic range, higher
> accuracy, better closure, bitwise identical results across systems, simpler hardware, and
> simpler exception handling. Posits never overflow to infinity or underflow to zero, and
> "Not-a-Number" (NaN) indicates an action instead of a bit pattern. A posit processing
> unit takes less circuitry than an IEEE float FPU."

> "High precision posits provide more correct decimals than floats of the same size; in
> some cases, a 32-bit posit may safely replace a 64-bit float. In other words, posits beat
> floats at their own game."

**These are the authors' claims and chapter 14 must attribute them as such.** The next
section is the counterweight, and it is by people who built the hardware and measured it.

### 6.4 The honest criticisms, from a source that measured

**de Dinechin, F., Forget, L., Muller, J.-M. and Uguen, Y., "Posits: the good, the bad and
the ugly", Conference for Next Generation Arithmetic (CoNGA 2019), March 2019, Singapore,
ACM, 10 pages.** Fetched as
`https://people.eecs.berkeley.edu/~demmel/ma221_Fall20/Dinechin_etal_2019.pdf` (HTTP 200,
2026-08-21, text-extracted here); the HAL record `https://inria.hal.science/hal-01959581`
(HTTP 200) and the CoNGA 2019 programme `https://posithub.org/conga/2019/programme`
(HTTP 200) corroborate venue and authorship. Note the author list includes **Jean-Michel
Muller**, whose *Handbook of Floating-Point Arithmetic* this guide has cited by title since
chapter 1 — the criticism is not from outside the field.

Verbatim, in the order chapter 14 should use them:

1. **The golden zone — where the taper actually helps, and where it stops.**
   > "for Posit32, the same bound 2−24 is guaranteed for operations whose absolute result
   > lies within[2−20,(2− 2−23)· 219)≈[ 10−6, 106]. This is the "golden zone" (in yellow on
   > Fig. 1) where posits are at least as accurate as floats."

   **This independently confirms §6.2's computed crossover at 2²⁰.** Two derivations, one
   from the standard's field layout run here and one from a published error analysis, land
   on the same threshold. That is the strongest single fact in this section.

   And the caution the same paragraph attaches:
   > "It is very different to have a property that holds everywhere except in the corners,
   > and to have a property that holds only in a small range."

2. **Hardware cost of the arithmetic itself: comparable, not cheaper.**
   > "Altogether, a quantitative comparison of posits and floats with similar effort [4,
   > Table IV] shows that posit and floats have comparable area and latency."

   (In the PDF "quantitative" is hyphen-split across a line break as `quantita-tive`;
   rejoined here, nothing else changed.)

   with the mechanism named:
   > "Compared to IEEE floats, it trades the overhead of subnormal and other special cases
   > for the overhead of the LDCs (Leading Digit Counters) and shifts in the conversion
   > units."

   **This directly contradicts** the Gustafson & Yonemoto abstract's "A posit processing
   unit takes less circuitry than an IEEE float FPU". Chapter 14 must present both, attributed,
   and not adjudicate: one is a design claim, the other is a synthesis comparison, and this
   project has no synthesis tool (chapter 11, "Timing, Fmax, and the Epistemic Wall").

3. **Hardware cost of the quire: large, and quantified.**
   > "In our current implementation targeting FPGAs, summing two products of Posit32 in the
   > hardware quire has more than 4x the area and 8x the latency of summing them using a
   > posit adder and a posit multiplier. Although we do hope to improve these results, such
   > factors should not come as a surprise: the 512 bits of the Posit32 quire are indeed 18x
   > the 27 bits of the Posit32 significand."

   **This is the posit-world price tag for exactly what §2 priced for binary32**, and the
   two agree in shape: ~18× the significand width, 4× area, 8× latency. The paper's own
   verdict on when that is worth paying:
   > "For large dot products, we strongly support Kulisch's claim that the exactness of the
   > result justifies the hardware overhead."
   and when it is not:
   > "However, this does not extend to the claim that the availability of a hardware quire
   > magically brings in a FMA or a sum of a few products with latencies comparable to those
   > of non-quire operations."

   **A four-input sum is "a sum of a few products".** That sentence is the most directly
   relevant criticism in the whole chapter to this guide's own design decision.

4. **The quire's specification is incomplete** (as of 2019): "The quire is not yet
   completely specified in the posit standard." — the 2022 standard fetched in §6.1 does
   specify the interchange format and the quire sum limit, so chapter 14 should date this
   criticism to the pre-2022 standard rather than present it as current.

5. **The pragmatic alternative the paper actually recommends**, which is worth quoting
   because it is not "posits lose":
   > "One viable alternative to posit implementation is therefore to use them only as a
   > memory storage format, and to compute internally on the extended standard format."

   with a caveat that will be familiar to anyone who read chapter 8's "Why the Shortcuts
   Fail": "attempting to use this approach to implement standard posit operations may incur
   wrong results due to double rounding."

6. **Numerical analysis has to be rebuilt.** The paper's recurring point: constant-relative-
   error bounds — the foundation of the classical analysis — are a *floating-point* property.
   Posits have variable accuracy, so "Numerical analysis has to be rebuilt from scratch out
   of these formula." Chapter 6's "Where Fixed Point Runs Out" is where this guide's reader
   met constant relative error; that is the cross-reference.

### 6.5 A secondary source, and a hazard

`https://en.wikipedia.org/wiki/Unum_(number_format)` (HTTP 200, 2026-08-21) covers the
unum I / II / III lineage that posits emerged from. Useful for framing, but the standard
(§6.1) and the two papers above are the citations of record. **Hazard:** much of the posit
literature predates the 2022 standard and uses a variable `es`; a chapter that quotes a
2017 paper's field layout next to the 2022 standard's fixed 2-bit exponent will contradict
itself. Date every posit claim.

## 7. What the guide's own adder would have to change, format by format

**First, a measured fact about the shipped design that the writer needs and that nobody
has written down yet.** Chapter 5's "Verifying Floating Point Specifically" ends with a
plan: *"So chapter 12's plan: parameterise the adder on `EXP_W` and `MANT_W`, verify
exhaustively at E4M3 in a second, run binary16 overnight, and only then instantiate at
E8M23…"*. **That plan was not carried out.** Measured here this session with `grep` over
`guide/src/ch09/*.v` and `guide/src/ch12/fp32_add4.v`:

- **Zero `parameter` declarations** in any of the eight RTL modules or in `fp32_add4.v`.
- The width literals are hardcoded throughout: 48 occurrences of `24'…`, 29 of `[23:0]`,
  14 of `27'…`, 12 of `[22:0]`, 9 each of `[26:0]` and `23'…`, plus `8'd255` five times
  and `8'd254` once.

So the honest answer to "what would the guide's adder have to change" is, for *every*
format in this chapter: **a rewrite, not a parameter override.** That is not a defect —
chapter 12 shipped a proven binary32 adder and never promised a generic one, and S10 is
explicit about scope — but it is the true starting point, and chapter 14 should say it
plainly rather than implying a `#(.EXP_W(8))` away from bfloat16. It also names a concrete
exercise for the reader that the guide has actually earned: parameterise it, and use the
E4M3 census in §5.4 as the exhaustive oracle.

### 7.1 The change list, per format

Read the columns as: what the *format* changes, and what the *design* would have to change
to follow it.

| | bfloat16 | binary16 | TF32 | OCP E4M3 | OCP E5M2 | posit32 |
|---|---|---|---|---|---|---|
| exponent field | 8 (unchanged) | **5** | 8 (unchanged) | **4** | **5** | **none — regime + 2** |
| bias | 127 (unchanged) | **15** | 127 (unchanged) | **7** | **15** | n/a |
| stored significand | **7** | **10** | **10** | **3** | **2** | **variable, 0-27** |
| datapath width (ch08's 28 = p+3+carry) | **12** | **15** | **15** | **8** | **7** | see §2.2 / §6.4 |
| `8'd255` / `8'd254` literals | unchanged | → `5'd31` / `5'd30` | unchanged | **no all-ones reservation at all** | → `5'd31` / `5'd30` | n/a |
| infinities | 2 | 2 | 2 | **0 — the screen module loses a case** | 2 | **0** |
| NaN encodings | 254 | 2,046 | 2,046 | **2** | 6 | **1 (NaR)** |
| subnormals | yes, 7-deep ramp | yes, 10-deep | yes, 10-deep | yes, 3-deep | yes, 2-deep | **none — no subnormals exist** |
| what breaks hardest | nothing structural | every exponent constant | nothing structural (but no storage form) | **`fp32_screen.v`'s inf logic and the overflow test** | every exponent constant | **the whole unpack/align/normalize decomposition** |

### 7.2 The four modules that carry the format, named

Chapter 9 built the datapath as seven modules ("Building a 2-input FP adder in Verilog,
module by module"). Format retargeting is not spread evenly across them:

1. **`fp32_unpack.v`** — the hidden-bit and subnormal rule. Its own comment states the
   invariant, "every finite operand is now (−1)^s · sig · 2^(e−127−23)", with the 127 and
   the 23 written in. Every format above changes both numbers; **posit32 deletes the whole
   invariant**, because a posit has no fixed exponent field to unpack — the regime must be
   counted (a leading-digit count *before* alignment, which is a new pipeline stage, not a
   changed constant).
2. **`fp32_screen.v`** — infinities and NaN. This is the module **OCP E4M3 breaks hardest**:
   with no infinities and exactly two NaN encodings, the "they share E = 255" comment in the
   source is false, `inf + (−inf) → 7FC00000` has no counterpart, and chapter 12's S5 NaN
   payload priority (a > b > c > d, measured) has almost nothing left to prioritise. Posits
   collapse it further: one NaR, no signed zeros, no invalid/inf distinction.
3. **`fp32_align.v`** and chapter 2's `align_sticky.v` — the shift width. Narrower formats
   shrink it (E4M3's whole significand is 4 bits, so alignment saturates almost immediately);
   §2's single-rounding architectures blow it up to ~280 bits. **The guard/round/sticky
   discipline itself is unchanged in every case**, which is the transferable part of chapters
   2 and 8.
4. **`fp32_round_pack.v`** — the overflow test `e_rnd > 254` and the `{sign, 8'd255, 23'd0}`
   infinity constant. Both are format constants; **for OCP E4M3 the overflow test has no
   infinity to produce**, so the format's own saturation rule must be substituted, and that
   rule lives in a spec this container could not fetch (§5.2).

### 7.3 The subnormal question, which is where the formats really differ

Chapter 12's **S2** commits to exact subnormal handling with no flush-to-zero, and chapter
7's measured result — a binary32 adder can never raise the underflow flag — is what let
S4 omit the flag *with a proof*. That proof is **format-specific**, and chapter 14 should
say so rather than let a reader carry it across:

- The argument is a Sterbenz-style one about a sum of two values in the format being exact
  when it is tiny. Its premise is the relationship between the format's precision and its
  subnormal ramp depth. **It has to be re-derived per format**, and this research pass did
  not re-derive it. Do not let chapter 14 assert that the underflow-flag omission carries
  to bfloat16 or E4M3.
- **Posits have no subnormals at all** and never underflow to zero (§6.3's abstract:
  "Posits never overflow to infinity or underflow to zero"), so the question does not arise
  — but de Dinechin et al. note the consequence for interoperation, verbatim: "a posit will
  never be converted to a subnormal, and that subnormals will all be converted to the
  smallest posit."
- **The FP8 formats' ramps are 3 and 2 bits deep.** Chapter 5's own measurement is the
  reason to care: at E4M3, "10.6 % involve at least one subnormal" against 0.78 % for
  random binary32. Subnormal handling stops being a corner case and becomes the common
  path.

### 7.4 What does *not* change, which is the pedagogically important half

Everything chapters 8 through 12 established about *structure* survives every format in
this chapter unchanged:

- align → add → normalize → round → pack, and the ten-step decomposition (chapter 8, "The
  Algorithm: Ten Steps, Stated Once");
- guard, round and sticky, and the rule that sticky excludes guard and round (chapter 2's
  sticky-bit callout) — this is what §2's Tenca quotation is *also* about, at three operands;
- the reference-follows-the-wiring discipline and the `!==`-plus-X-guard equivalence sweep
  (chapters 9, 10);
- the composition price itself: **rounding four operands in three steps costs the same kind
  of thing in every format**, and in a *narrower* format it costs more of it, because each
  rounding discards a larger relative slice. This research pass did **not** measure that
  claim at reduced width. It is a plausible expectation, not a result, and chapter 14 must
  mark it as such — or the writer can make it a measurement, since chapter 5's E4M3
  exhaustive space is 65,536 pairs and a four-operand E4M3 sweep is 2³² quadruples, which
  is a few hours, not a research programme. **That would be a genuinely new number and the
  only one chapter 14 could produce itself.**

## 8. FP accelerator architecture: systolic arrays, tensor cores, mixed-precision accumulate

**Everything in this section is documentation and other people's measurements. Nothing
here was built or run in this environment**, and the chapter must flag it in place, the
way chapter 11's "Timing, Fmax, and the Epistemic Wall" flags its timing discussion.

### 8.1 The systolic array, and the fact that the famous one is not floating point

**Jouppi, N. P. et al., "In-Datacenter Performance Analysis of a Tensor Processing Unit",
arXiv:1704.04760, submitted 16 April 2017** (ISCA 2017).
`https://arxiv.org/abs/1704.04760` — HTTP 200, 2026-08-21; abstract extracted here.
Verbatim:

> "The heart of the TPU is a 65,536 8-bit MAC matrix multiply unit that offers a peak
> throughput of 92 TeraOps/second (TOPS) and a large (28 MiB) software-managed on-chip
> memory."

> "Despite low utilization for some applications, the TPU is on average about 15X - 30X
> faster than its contemporary GPU or CPU, with TOPS/Watt about 30X - 80X higher."

**Two annotations chapter 14 owes the reader.** First, the canonical systolic-array
accelerator paper is about **8-bit integer** MACs, not floating point — the format question
and the array question are orthogonal, and a chapter that conflates them will mislead.
Second, the 15-30× and 30-80× figures are the authors' comparison against 2015-era
contemporaries and are frequently quoted stripped of that context; quote them with it or
not at all. (`https://en.wikipedia.org/wiki/Systolic_array` and
`https://en.wikipedia.org/wiki/Tensor_Processing_Unit`, both HTTP 200, 2026-08-21, are
adequate secondary sources for the array concept and the generation history; neither is
quoted here.)

### 8.2 The mixed-precision pattern, tabulated from a peer-reviewed source

**Fasi, M., Higham, N. J., Mikaitis, M. and Pranesh, S., "Numerical Behavior of NVIDIA
Tensor Cores"**, MIMS EPrint 2020.10, University of Manchester — published as *PeerJ
Computer Science* 7:e330 (2021). The journal page `https://peerj.com/articles/cs-330/`
returned **HTTP 403** to both `curl` and `WebFetch` from this container, so **cite the
Manchester eprint**, `https://eprints.maths.manchester.ac.uk/2774/1/fhmp20.pdf` (HTTP 200,
2026-08-21; downloaded and text-extracted here), and name the journal in the citation.

Its Table 1 is the cleanest statement of the "multiply low, accumulate high" pattern, and
the whole of §4's format zoo turns up in the input column:

| year | device | matrix dims (m×k×n) | input format | output format |
|---|---|---|---|---|
| 2016 | Google TPU v2 | 128 × 128 × 128 | **bfloat16** | **binary32** |
| 2017 | Google TPU v3 | 128 × 128 × 128 | bfloat16 | binary32 |
| 2017 | NVIDIA V100 | 4 × 4 × 4 | **binary16** | **binary32** |
| 2018 | NVIDIA T4 | 4 × 4 × 4 | binary16 | binary32 |
| 2019 | ARMv8.6-A | 2 × 4 × 2 | bfloat16 | binary32 |
| 2020 | NVIDIA A100 | 8×8×4 / 8×8×4 / 4×2×2 / 4×8×4 | bfloat16 / binary16 / binary64 / **TensorFloat-32** | binary32 / binary32 / binary64 / binary64 |

And the vendor statement the paper quotes from the Volta white paper, which is the pattern
in one sentence:

> "Tensor Cores operate on FP16 input data with FP32 accumulation. The FP16 multiply
> results in a full precision product that is then accumulated using FP32 addition with the
> other intermediate products for a 4× 4× 4 matrix multiply."

NVIDIA's TF32 blog (§4.4) states the same shape for TF32: inputs rounded to TF32, products
exact, "then accumulates those products into an FP32 output".

### 8.3 Why accumulation precision dominates — and why the standard permits the looseness

The reason this pattern works is that the **multiply** is the cheap place to lose bits and
the **accumulate** is the expensive one: an n-term sum accumulates error across n roundings
while each product rounds once. The paper makes the standards point that chapter 14 should
carry, because it is directly about IEEE 754 and directly about this guide's subject
(paraphrasing the fetched text, with the clause number as printed): **IEEE 754-2019 §9.4's
reduction operations deliberately do not prescribe the order of partial sums and allow a
higher-precision internal format.** The paper enumerates what the standard consequently
leaves open — "1) whether this internal format should be normalized … 2) which rounding
mode should be used, and 3) when the rounding should happen" — and states the consequence:

> "These loose requirements can potentially cause the results computed with a given
> multi-operand addition unit to be significantly different from those obtained using other
> hardware implementations or a software implementation based on IEEE 754-compliant
> elementary arithmetic operations."

And NVIDIA's own PTX documentation, quoted in the paper, confirms the gap from the vendor
side: "The accumulation order, rounding and handling of subnormal inputs is unspecified."

**This is the standards-level answer to a question chapter 12 answered by fiat.** S3 defines
the correct answer *as* the three-rounding composition precisely because the standard does
not define it for reductions. The guide reached the right conclusion; §9.4 is the clause
that says why it had to.

### 8.4 What a real accumulator turned out to be, when someone measured it

Fasi et al.'s conclusions for the V100, verbatim from the fetched PDF (their parenthetical
"(new)"/"(confirmed)" markers indicate which findings were previously known):

> "• Subnormal numbers in binary16 and binary32 are supported (new).
> • The binary16 products in (2) are computed exactly, and the results are kept in full
> precision and not rounded to binary16 after the multiplication (confirmed).
> • The five summands in (2) are accumulated starting with the largest in absolute value
> (new).
> • The additions in (2) are performed using binary32 arithmetic (confirmed) with
> round-toward-zero (new).
> • Only the final result of (2) is normalized; the partial sums are not, but the
> accumulator uses two extra bits for carries (new)."

with the internal width given explicitly:

> "the V100 has a format{3.23} (or{4.23} if 3 extra bits for carries are present as
> discussed in Section 3.1.4) and the T4 has a format {3.24} (or{4.24}) for computing the
> significands before the final normalization and rounding to{1.23} (the format of the
> significand for binary32)."

**Read that against this guide's own numbers and the comparison writes itself.** The V100's
five-operand adder is a **fixed-point** accumulator roughly `{3.23}`-`{4.24}` wide — call it
26-28 bits — normalized **once**, rounded **round-toward-zero**, with operands presented
largest-first. Chapter 8's "The Width Budget: 28 Bits" derived 28 bits for a *two*-input
binary32 adder with guard, round, sticky and carry. **The commercial five-operand unit's
internal significand path is the same order of magnitude as this guide's two-operand one**
— which is exactly what §2.2 predicts, because it is a Class IV unit (limited-precision
accumulator), not a Class I one.

### 8.5 The connection back to the four-input problem — the strongest link in the chapter

Fasi et al. close with a result that is, structurally, chapter 10's subject:

> "We can show that the lack of normalization causes the dot product in tensor cores—and
> most likely in any other similar architectures in which partial sums are not normalized
> …—to behave non-monotonically."

with a worked five-term counterexample in binary32 (c₁₁ + four copies of 2⁻²⁴, where
c₁₁ = 1 − 2⁻²⁴ gives 1 + 2⁻²³ and c₁₁ = 1 gives 1 — **increasing an input decreased the
sum**). Mikaitis's later paper (§2.1) generalizes it: non-monotonicity appears for
**n ≥ 4** in units that skip intermediate normalization.

**Chapter 12's `fp32_add4` is n = 4 and it normalizes every intermediate**, because it is
three real binary32 additions. So it is monotonic where a Class IV four-term unit need not
be. That is a property the guide never claimed and can now state — with the important
qualification that **it was not measured here**: it follows from every intermediate being a
correctly rounded binary32 value, which chapters 9 and 10 did prove, plus monotonicity of
correctly rounded addition, which this research pass did not verify. **If chapter 14 wants
to claim it, measure it** — a monotonicity sweep over `fp32_add4` is a cheap testbench and
would be the second genuinely new result this chapter could produce (the first being §7.4's
reduced-width composition sweep).

And the honest symmetry, which is the chapter's closing thought on this topic:

- The **guide's** four-input adder rounds three times, is bit-reproducible against a
  software model, is monotonic — and misses the correctly rounded sum at the rates chapter
  12's S3 records.
- A **tensor core's** five-input adder rounds once, uses a wide fixed-point accumulator,
  round-toward-zero, largest-first ordering — and is *non-monotonic*, and its behaviour was
  undocumented until four numerical analysts reverse-engineered it.

Neither is "the right answer". They are different points on the same trade, and the guide's
contribution is that it **wrote its point down as a specification with measured prices**
(chapter 12, "The Specification, in Full") rather than leaving it, as NVIDIA's PTX manual
does, "unspecified".

### 8.6 One more fetchable source on tensor cores

**Markidis, S., Chien, S. W. D., Laure, E., Peng, I. B. and Vetter, J. S., "NVIDIA Tensor
Core Programmability, Performance & Precision", arXiv:1803.04014, submitted 11 March
2018.** `https://arxiv.org/abs/1803.04014` — HTTP 200, 2026-08-21. Verbatim from the
abstract's opening: *"The NVIDIA Volta GPU microarchitecture introduces a specialized unit,
called "Tensor Core" that performs one matrix-multiply-and-accumulate on 4x4 matrices per
clock cycle."* Earlier and less rigorous on the numerics than Fasi et al.; cite it for the
programmability/performance angle, not for arithmetic claims.

## 9. Annotated bibliography, part A — sources the guide already cites (chapters 1-13)

**Scope.** Every external source named in a `## Sources for This Chapter` section of
chapters 1-13, consolidated, de-duplicated and annotated. **Guide-internal artifacts**
(`src/chNN/*.v`, README mutation records, this session's own `python3` runs) are not
sources and are not listed; chapters cite them inline and correctly.

**Verification tags used throughout §§9-10:**

- **`[verified 2026-08-21, HTTP 200]`** — requested from this container today, status
  recorded in §1, and where a quotation depends on it the bytes were parsed here.
- **`[title-only]`** — no URL is asserted. The reason is always given.
- **`[title-only — blocked here]`** — a URL exists and is public, but this container was
  refused (403/418/202). Distinguished from a genuinely dead or nonexistent link because
  the difference matters to the reviewer.
- **`[verified but not quotable]`** — fetched 200, but the returned bytes were navigation
  chrome, a purchase page, or a redirect target, so no content claim rests on it.

---

### 9.1 Standards

**1. IEEE Std 754-2019, *IEEE Standard for Floating-Point Arithmetic*, IEEE Computer
Society, approved 13 June 2019, published July 2019.**
`https://standards.ieee.org/ieee/754/6210/` — **`[verified but not quotable]`**, HTTP 200,
2026-08-21. The record page resolves; the normative clause text is paywalled and has never
been read by this project. *Good for:* the normative anchor behind essentially every
arithmetic claim in chapters 5-12 — §3.4 (rounding attributes), §4.3 (roundTiesToEven),
Clause 5 (the addition operation, sign of an exact-zero sum), §6.2/6.2.3 (NaN quieting and
payload propagation, both *should* not *shall*), §6.3, Clause 7 (exceptions), §9.4
(reduction operations — see §8.3, the clause that licenses tensor-core looseness), §9.5
(augmented operations — §3). *Cited by:* ch01, ch05, ch07, ch08, ch09, ch10, ch12.
**Chapter 14 addition:** for the *changes* in 754-2019, cite the committee's public page
`https://754r.ucbtest.org/background/` (§10) rather than the standard — it is free and it
lists the clause numbers.

**2. IEEE Std 1364-2005, *IEEE Standard for Verilog Hardware Description Language*.**
`https://standards.ieee.org/ieee/1364/3641/` — **`[verified 2026-08-21, HTTP 200]`** for the
record page; ch02 verified the status field reads "Superseded Standard". Clause text
`[title-only]`. *Good for:* Clause 4 expressions and the two-pass width algorithm (ch02,
ch06); Clause 11 scheduling semantics, §11.3 stratified event queue, §11.4.1/11.4.2
determinism/nondeterminism, §11.5 races (ch03, ch11); §9.7.5 `@*`; §17-18 system tasks and
VCD (ch04). *Cited by:* ch01-ch04, ch06, ch09, ch11.

**3. IEEE Std 1800-2023, *IEEE Standard for SystemVerilog*.** `[title-only]` — paywalled;
no fetch attempted, none would help. *Good for:* `logic`, `shortreal`, `'0`/`'1`, severity
tasks, `$urandom`, Clauses 16/18/19 (assertions, constrained random, coverage). *Cited by:*
ch01, ch02, ch04, ch05, ch07.

**4. IEEE Std 1800-2017, *IEEE Standard for SystemVerilog*.** `[title-only]`. *Good for:*
the clause set chapter 13 measures against — 9.2.2.2 `always_comb` (function-body
sensitivity, time-zero execution), 9.2.2.4 `always_ff`, 12.5 `unique`/`priority`, Clause 16
assertions, Clause 19 covergroups, 18.13.2-3 `$urandom`, 7.10 queues. *Cited by:* ch03,
ch09, ch13. **Note the version split:** the guide cites 1800-2017 where it wants the clause
numbering chapter 13 measured against, and 1800-2023 elsewhere. F1 should make sure a
merged guide does not present these as the same document.

**5. IEEE Std 1800.2-2020, *Universal Verification Methodology (UVM)*.** `[title-only]`.
*Good for:* the generator / driver / monitor / scoreboard decomposition ch05 hand-rolls in
plain Verilog. *Cited by:* ch05.

**6. IEEE Std 1364.1-2002, *Verilog Register Transfer Level Synthesis*.** `[title-only]`;
itself withdrawn. *Good for:* the historical definition of the synthesisable subset.
*Cited by:* ch02.

---

### 9.2 Books and handbooks — all `[title-only]`, none fetchable, none should be

None of these has a free full text; each is cited by author, title, edition and section,
which is the project's rule. Listed roughly in order of how load-bearing they are here.

**7. Muller, J.-M. et al., *Handbook of Floating-Point Arithmetic*, 2nd ed., Birkhäuser,
2018.** The guide's single most-cited book: Ch. 3 (formats, sign of zero sums), Ch. 8-9
(FP addition hardware, width budget, Sterbenz, double rounding), 2Sum/Fast2Sum and
error-free transformations, adder pipeline structure. *Cited by:* ch01, ch08, ch09, ch10,
ch11, ch12. **Corroboration found this session:** Mikaitis (§2.1) cites it as reference [2]
with the same edition and year, and Jean-Michel Muller is a co-author of the posit critique
in §6.4 — the guide's textbook of record and the frontier literature are the same people.

**8. Ercegovac, M. D. and Lang, T., *Digital Arithmetic*, Morgan Kaufmann, 2004.** Ch. 8 is
the unpack/align/add/normalize/round decomposition chapters 8-9 follow, plus the dual-path
organization and multi-operand addition. *Cited by:* ch01, ch08, ch09, ch10, ch11.

**9. Kulisch, U., *Computer Arithmetic and Validity: Theory, Implementation, and
Applications*, De Gruyter (2nd ed. 2013).** The exact long accumulator — the Class I
architecture of §2.1. **`[title-only]`.** The DOI `https://doi.org/10.1515/9783110301793`
was *attempted* here and returned **HTTP 202** at a De Gruyter/Brill landing URL — not a
document, so it is not cited. `https://en.wikipedia.org/wiki/Kulisch_accumulator` returned
**404**; there is no such article, and nobody should invent one. **For a citable, fetchable
substitute use Uguen & de Dinechin (§10), which reproduces Kulisch's accumulator widths in
a table and is HTTP 200.** *Cited by:* ch10.

**10. Sterbenz, P. H., *Floating-Point Computation*, Prentice-Hall, 1974.** The
exact-subtraction lemma. Verified *empirically* by this guide (ch08, exhaustive in a toy
format, 3,151/3,151; 200,000 conforming binary32 pairs), not by reading the book. *Cited
by:* ch07, ch08, ch12.

**11. Goldberg, D., "What Every Computer Scientist Should Know About Floating-Point
Arithmetic", *ACM Computing Surveys* 23(1):5-48, March 1991.** Uniquely among the papers,
**a fetchable full text exists**: the Oracle reprint at
`https://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html` —
**`[verified 2026-08-21, HTTP 200]`**. *Good for:* ulp and machine epsilon, the guard-digit
theorems, the second-guard-digit-plus-sticky sentence ch08 quotes, benign vs catastrophic
cancellation, property (10). *Cited by:* ch01, ch06, ch07, ch08. **This is the model
citation in the whole guide** — a canonical paper with a stable free mirror, quoted from
the mirror, with the venue named.

**12. Harris, D. and Harris, S., *Digital Design and Computer Architecture*, 2nd ed.,
Morgan Kaufmann.** Ch. 1-3, 5; pipelining, latency, setup/hold, Fmax. *Cited by:* ch01,
ch11.

**13. Weste, N. and Harris, D., *CMOS VLSI Design*, 4th ed., Pearson.** Ch. 1-2, 4, 6,
10-11. **Attribution note carried forward from ch01's review:** the datapath material is
**Ch. 11 *Datapath Subsystems***, not Ch. 10 (*Sequential Circuit Design*). That correction
was applied in ch01 and propagated to its research notes; do not let a merged guide
re-introduce the wrong chapter. *Cited by:* ch01.

**14. Hennessy, J. L. and Patterson, D. A., *Computer Architecture: A Quantitative
Approach*, 6th ed. — Appendix J, *Computer Arithmetic* (by D. Goldberg).** *Cited by:* ch01.

**15. Patterson, D. A. and Hennessy, J. L., *Computer Organization and Design*, RISC-V
edition**, Ch. 2-3. *Cited by:* ch01.

**16. Koren, I., *Computer Arithmetic Algorithms*, 2nd ed., A K Peters.** FP addition and
rounding implementation. *Cited by:* ch06, ch08.

**17. Parhami, B., *Computer Arithmetic: Algorithms and Hardware Designs*, 2nd ed.**
*Cited by:* ch06.

**18. Mano, M. M. and Ciletti, M. D., *Digital Design*, 6th ed., Pearson**, Ch. 1-5.
*Cited by:* ch01, ch06.

**19. Wakerly, J. F., *Digital Design: Principles and Practices*, 5th ed., Pearson**, Ch. 4
— ch01 calls it "the most careful standard treatment of hazards". *Cited by:* ch01.

**20. Sutherland, I., Sproull, B. and Harris, D., *Logical Effort: Designing Fast CMOS
Circuits*, Morgan Kaufmann, 1999.** *Cited by:* ch01.

**21. Brayton, R. K. et al., *Logic Minimization Algorithms for VLSI Synthesis*, Kluwer,
1984** — Espresso. *Cited by:* ch01.

**22. Palnitkar, S., *Verilog HDL: A Guide to Digital Design and Synthesis*, 2nd ed.,
Prentice Hall, 2003**, Ch. 3-7, 9-10, 14. *Cited by:* ch02, ch03, ch04.

**23. Thomas, D. E. and Moorby, P. R., *The Verilog Hardware Description Language*, 5th
ed., Springer, 2002**, Ch. 6. Moorby is a co-creator of the language; useful for historical
framing. *Cited by:* ch02, ch03.

**24. Ciletti, M. D., *Advanced Digital Design with the Verilog HDL*, 2nd ed., Pearson,
2010.** *Cited by:* ch02.

**25. Chu, P. P., *FPGA Prototyping by Verilog Examples*, Ch. 6.** *Cited by:* ch03.

**26. Sutherland, S., *Verilog-2001: A Guide to the New Features of the Verilog HDL*,
Kluwer, 2001**; and **Sutherland, S., *Verilog HDL Quick Reference Guide* (IEEE 1364-2005
edition), Sutherland HDL Inc.** — the desk reference for the operator precedence table;
and **Sutherland, S., *RTL Modeling with SystemVerilog for Simulation and Synthesis*.**
*Cited by:* ch02, ch03, ch04.

**27. Bergeron, J., *Writing Testbenches*, 2nd ed., Kluwer, 2003**, Ch. 3-4. *Cited by:*
ch04, ch05.

**28. Spear, C. and Tumbush, G., *SystemVerilog for Verification*, 3rd ed., Springer,
2012.** Ch. 8 (functional coverage) is what ch13's coverage section reads against; Ch. 2
and 5 for queues and two-state types. *Cited by:* ch05, ch13.

**29. Piziali, A., *Functional Verification Coverage Measurement and Analysis*, Kluwer,
2004**; **Foster, H., Krolnik, A. and Lacey, D., *Assertion-Based Design*, 2nd ed., Kluwer,
2004**; **Keating, M. and Bricaud, P., *Reuse Methodology Manual*, 3rd ed., Springer,
2002** (the origin of the verification-effort-share folklore). *Cited by:* ch05.

---

### 9.3 Papers — `[title-only]` unless a fetch is noted

**30. Higham, N. J., "The accuracy of floating point summation", *SIAM J. Sci. Comput.*
14(4):783-799, 1993.** `[title-only]`. The summation error analysis behind the
tree-vs-sequential asymptotic bounds. *Cited by:* ch10. Corroborated indirectly: the
Wikipedia *Pairwise summation* article ch10 fetched cites it for the O(ε log n) vs O(ε n)
result, and Higham is a co-author of the tensor-core paper in §8.4.

**31. Figueroa, S. A., "When is double rounding innocuous?", *ACM SIGNUM Bulletin* 30(3),
1995.** `[title-only]`. The p′ ≥ 2p + 2 condition behind the one-operation `$shortrealtobits`
guarantee; **re-verified empirically here in ch07 (~992,000 pairs) and ch08 (0 wrong in
299,502)**. *Cited by:* ch07, ch08.

**32. Muller, J.-M., "On the definition of ulp(x)", INRIA research report RR-5504, 2005.**
`[title-only]` — no fetch attempted this session. *Cited by:* ch07.

**33. Seidel, P.-M. and Even, G., "Delay-optimized implementation of IEEE floating-point
addition", *IEEE Transactions on Computers* 53(2), 2004.** `[title-only]`. Chapter 8 marks
it "existence confirmed via search results only" — **that caveat still stands; this session
did not improve on it** (IEEE Xplore returns 418 to this container). *Cited by:* ch08.

**34. Schmookler, M. S. and Nowka, K. J., "Leading zero anticipation and detection — a
comparison of methods", Proc. IEEE ARITH-15, 2001.** `[title-only]`, same caveat as 33.
*Cited by:* ch08.

**35. Sohn, J. and Swartzlander, E. E., "A fused floating-point three-term adder", *IEEE
Trans. Circuits and Systems I: Regular Papers* 61(10):2842-2850, 2014.**
**`[title-only — blocked here]`**: the DOI `https://doi.org/10.1109/TCSI.2014.2333680` was
resolved this session and returned **HTTP 202** at `https://ieeexplore.ieee.org/document/6862076`
— a redirect target, not a document, so no URL is asserted. **But the citation itself is now
independently corroborated**, which it was not when ch10 shipped: Mikaitis's reference list
(§2.1, fetched and text-extracted here) gives it as reference [15] with the identical
volume, issue, pages and year. *Cited by:* ch10. **Bonus for chapter 14:** the same
reference list names a companion, **Sohn & Swartzlander, "A fused floating-point four-term
dot product unit", *IEEE Trans. Circuits and Systems I* 63(3):370-378, 2016** — a
*four*-term unit, which is this guide's own operand count.

**36. Tenca, A. F., "Multi-operand floating-point addition", ARITH-19, 2009.**
`[title-only]`. **Now corroborated** the same way: Mikaitis reference [13], "in 2009 19th
IEEE Symposium on Computer Arithmetic, Portland, OR, USA, Jun. 2009, pp. 161-168" —
matching ch10's citation and adding page numbers. *Cited by:* ch10.

**37. Leiserson, C. E. and Saxe, J. B., "Retiming Synchronous Circuitry", *Algorithmica*
6(1), 1991.** `[title-only]`. *Cited by:* ch11.

**38. Kogge, P. M. and Stone, H. S., *IEEE Trans. Computers* C-22(8):786-793, 1973;
Brent, R. P. and Kung, H. T., "A Regular Layout for Parallel Adders", C-31(3):260-264,
1982; Wallace, C. S., *IEEE Trans. Electronic Computers* EC-13(1):14-17, 1964; Dadda, L.,
*Alta Frequenza* 34:349-356, 1965; McCluskey, E. J., "Minimization of Boolean Functions",
BSTJ 35(6):1417-1444, 1956; Quine, W. V., *American Mathematical Monthly* 59(8):521-531,
1952.** All `[title-only]`, all classic, all cited for the algorithm that bears the name.
*Cited by:* ch01.

**39. Cummings, C. E., "Nonblocking Assignments in Verilog Synthesis, Coding Styles That
Kill!", SNUG-2000 San Jose, Rev 1.2.**
`https://csg.csail.mit.edu/6.375/6_375_2009_www/papers/cummings-nonblocking-snug99.pdf` —
**`[verified 2026-08-21, HTTP 200]`** (MIT 6.375 course mirror). *Good for:* the eight
guidelines, the stratified-event-queue treatment, Guideline #7 (`$strobe` for NBA values).
**Citation hazard, re-confirmed today:** the author's own site
`sunburst-design.com` **301s to a login-walled Paradigm Works library** — a request for the
paper's own PDF path returned HTTP 200 *at a paradigm-works.com search page* (§1b). Never
cite a `sunburst-design.com` URL. Also note ch03's correct warning that despite `snug99`
in the mirror's filename, the title page says **SNUG-2000 San Jose**. *Cited by:* ch02,
ch03, ch04, ch11.

**40. Cummings, C. E., ""full_case parallel_case", the Evil Twins of Verilog Synthesis",
SNUG-1999 Boston, Rev 1.1.**
`https://csg.csail.mit.edu/6.375/6_375_2006_www/papers/cummings-case-snug99.pdf` —
**`[verified 2026-08-21, HTTP 200]`**. *Cited by:* ch03.

**41. Mills, D., "Yet Another Latch and Gotchas Paper", SNUG 2012.**
`https://lcdm-eng.com/papers/snug12_Paper_final.pdf` — **`[verified 2026-08-21, HTTP 200]`**.
*Cited by:* ch03.

**42. Cummings, C. E. and Alfke, P., "Asynchronous FIFO Design", SNUG 2002; Cummings,
C. E., "Clock Domain Crossing (CDC) Design & Verification Techniques Using SystemVerilog",
SNUG 2008; Cummings, C. E., "State Machine Coding Styles for Synthesis", SNUG 1998, and
"The Fundamentals of Efficient Synthesizable Finite State Machine Design using NC-Verilog
and BuildGates", ICU Conference, Aix-en-Provence, 2002.** All `[title-only]` — same
`sunburst-design.com` hazard, and ch03 already records that "the historical online home of
these papers no longer serves them". *Cited by:* ch01, ch03.

**43. Mills, D. and Cummings, C. E., "RTL Coding Styles That Yield Simulation and Synthesis
Mismatches", SNUG 1999.** `[title-only]`. The classic source for "never use `casex`" and
for x-optimism/x-pessimism. *Cited by:* ch02.

**44. Sutherland, S. and Mills, D., "Standard Gotchas: Subtleties in the Verilog and
SystemVerilog Standards That Every Engineer Should Know", SNUG Boston 2006 onward.**
`[title-only]` — same hazard. *Good for:* expression width, signedness contamination,
`casex`, the `always_comb`-vs-`@(*)` differences ch13 re-measured. *Cited by:* ch02, ch06,
ch13.

**45. Sutherland, S., "I'm Still In Love With My X! (but, do I want my X to be an optimist,
a pessimist, or eliminated?)", DVCon 2013.** `[title-only]`. *Cited by:* ch13.

---

### 9.4 Tools, vendor documentation and web sources

**46. Icarus Verilog (Stephen Williams et al.).** Four pages, **all
`[verified 2026-08-21, HTTP 200]`**:
`https://steveicarus.github.io/iverilog/` (ch11),
`.../usage/getting_started.html` (ch02),
`.../usage/command_line_flags.html` (ch02, ch13 — ch13 quotes two phrases from it verbatim
and re-checked them at write time),
`.../usage/vvp_flags.html` (ch05).
Plus `https://raw.githubusercontent.com/steveicarus/iverilog/master/README.md` (ch11),
**HTTP 200**. *Caveat ch02 records and F1 must preserve:* the docs site documents the
development branch and lists `-g2017`/`-g2023`, which the installed 13.0 release does not
offer. The local `man iverilog` and `iverilog -ghelp` are the authority for what this
project's binary does.

**47. AMD (Xilinx), *Vivado Design Suite User Guide: Synthesis (UG901)*.**
`https://docs.amd.com/r/en-US/ug901-vivado-synthesis` — **`[verified 2026-08-21, HTTP 200]`**.
*Good for:* HDL Coding Techniques — *Latches*, *Memory Elements*, *Sensitivity List*, and
the recognised flip-flop templates. **Paraphrased, never quoted**, in ch01 and ch03, which
is the right call for a doc site that re-paginates. *Cited by:* ch01, ch03. **Companion,
`[title-only]`:** Intel (Altera), *Quartus Prime Pro Edition User Guide: Design
Recommendations* / *Recommended HDL Coding Styles* (ch02, ch03); AMD/Xilinx **UG479, *7
Series DSP48E1 Slice User Guide*** (ch06) — no URL was asserted for either and none is
added here.

**48. Hauser, J. R., *Berkeley SoftFloat* and *Berkeley TestFloat*, Release 3e (January
2018), U.C. Berkeley.** `http://www.jhauser.us/arithmetic/SoftFloat.html` and
`.../TestFloat.html` — **both `[verified 2026-08-21, HTTP 200]`**. **Note for F1: these are
plain `http://` and do **not** redirect to HTTPS. Rewriting the scheme would break them.**
*Good for:* the differential-testing architecture this guide's oracle discipline mirrors.
*Cited by:* ch05, ch12.

**49. Verilator manual, *Verilator Arguments*.**
`https://verilator.org/guide/latest/exe_verilator.html` — **`[verified 2026-08-21, HTTP
200]`**. *Good for:* `--coverage` and `verilator_coverage`, the coverage facility Icarus
does not have. **Not installed here** — ch03/ch05/ch13 correctly flag every Verilator
statement as documentation. *Cited by:* ch05.

**50. *Covered* (code coverage for Verilog).** `https://covered.sourceforge.net/` —
**`[verified 2026-08-21, HTTP 200]`**; site copyright 2010, not installed here. *Cited by:*
ch05.

**51. GTKWave.** `https://gtkwave.sourceforge.net/` — **`[verified 2026-08-21, HTTP 200]`**;
`https://gtkwave.github.io/gtkwave/install/mac.html` — **HTTP 200**;
`https://github.com/gtkwave/gtkwave` — **403 to `curl`, 200 via `WebFetch`**, repository
**active, GPL-2.0**; `https://github.com/Homebrew/homebrew-cask/blob/HEAD/Casks/g/gtkwave.rb`
— **403 to `curl`, not retried**. See §1a's note: these are proxy artifacts, not dead
links. **Open item for F1:** ch04's specific GitHub API assertions (`archived: false`,
tag `v3.3.116`, last commit 2026-04-18, last push 2026-07-23) are dated 2026-08-09 and
**could not be re-verified field-by-field from this container**. *Cited by:* ch04.

**52. Surfer waveform viewer.** `https://surfer-project.org/` and
`https://gitlab.com/surfer-project/surfer/-/raw/main/README.md` — **both
`[verified 2026-08-21, HTTP 200]`**. *Cited by:* ch04.

**53. VaporView (VS Code waveform extension).**
`https://marketplace.visualstudio.com/items?itemName=lramseyer.vaporview` —
**`[verified 2026-08-21, HTTP 200]`**. *Cited by:* ch04.

**54. Gisselquist, D., "Rounding numbers", ZipCPU blog, 22 July 2017.**
`https://zipcpu.com/dsp/2017/07/22/rounding.html` — **`[verified 2026-08-21, HTTP 200]`**.
*Good for:* the convergent-rounding correction-constant idiom, reproduced and verified
exhaustively in ch06. *Cited by:* ch06.

**55. Yu, J., "SystemVerilog always_comb, always_ff. New and Improved.", verilogpro.com.**
`https://www.verilogpro.com/systemverilog-always_comb-always_ff/` —
**`[verified 2026-08-21, HTTP 200]`**. *Good for:* the function-body sensitivity sentence
ch09 quotes verbatim and then **measures live in Icarus 13.0**. The page cites no LRM
clause; the normative statement is IEEE 1800's (source 4). *Cited by:* ch09.

**56. Wikipedia articles cited by the guide**, all **`[verified 2026-08-21, HTTP 200]`**:
*Verilog* (ch02 — language history), *Q (number format)* (ch06 — the TI-vs-ARM convention
split), *Saturation arithmetic* (ch06 — the 8-bit audio example and the instruction-set
support), *IEEE 754* (ch10 — the augmented-operations framing), *Pairwise summation* (ch10
— the O(ε log n) result and the Higham pointer). **Recommendation for chapter 14:** the
IEEE 754 article's augmented-operations claim should be *re-anchored* to
`754r.ucbtest.org` (§3.1) and Riedy & Demmel (§3.2), both fetched here. Wikipedia is fine
as corroboration and weak as the sole support for a normative claim.

**57. Yates, R., "Fixed-Point Arithmetic: An Introduction", Digital Signal Labs.**
**`[title-only]` — and the reason has *worsened* since ch06.** ch06 records HTTP 503; today
`https://www.digitalsignallabs.com/` and `.../fp.pdf` both fail at the TLS layer,
`curl: (35) Recv failure: Connection reset by peer`, with no HTTP status at all. Nothing in
ch06 depends on it. **F1 should soften ch06's "returned HTTP 503" to a failure-mode-neutral
phrase**, since the recorded status no longer reproduces. *Cited by:* ch06.

**58. Texas Instruments, *TMS320C64x+ DSP Library Programmer's Reference* (SPRUEB8).**
`[title-only]`; no URL asserted by ch06 and none added. *Good for:* the TI Q-notation
convention and `SMPY`-family saturation. *Cited by:* ch06.

**59. Intel (Altera), *Understanding Metastability in FPGAs*, White Paper WP-01082, 2009.**
**`[title-only]`** — ch01's research pass recorded **HTTP 403**; not re-attempted this
session. ch01 correctly uses the textbook MTBF form rather than vendor notation. *Cited by:*
ch01.

**60. Wilson Research Group / Siemens EDA, *Functional Verification Study* (biennial).**
`[title-only]`. ch05 names it as "the source to quote instead of a remembered percentage",
which is the right instinct; **no edition, year or figure should be quoted until an edition
is actually fetched.** *Cited by:* ch05.

**61. WaveDrom; `vcdvcd` (Python VCD parser).** `[title-only]`; ch04 explicitly notes
`vcdvcd` is "not installed here, not verified". *Cited by:* ch04.

---

### 9.5 Audit summary for F1 and F3

- **33 URLs shipped in chapters 1-13. 31 resolve HTTP 200 today. Zero dead links.**
- The 2 failures are `github.com` (ch04) and are **proxy artifacts of this container**, not
  broken citations. `WebFetch` retrieves them.
- **Three follow-ups, none blocking:**
  1. ch04's GitHub *field values* (tag, commit dates, `archived: false`) are a dated
     measurement that could not be re-verified here.
  2. ch06's "returned HTTP 503" for digitalsignallabs.com no longer reproduces; the site now
     resets the connection.
  3. The two `jhauser.us` URLs are `http://` by necessity — do not normalize them.
- **One systemic strength worth stating in F3:** every chapter's source list already
  separates *verified web* from *by title (no link asserted)*, and every `[title-only]`
  entry this pass checked was title-only for a real reason. The guide's citation discipline
  survives an adversarial audit.

## 10. Annotated bibliography, part B — frontier sources for chapter 14

Same tag scheme as §9. Every URL below was requested from this container on **2026-08-21**
and its status is in §1.

---

### 10.1 Multi-operand addition and exact accumulation

**F1. Mikaitis, M., "Monotonicity of Multi-Term Floating-Point Adders", arXiv:2304.01407,
submitted 3 April 2023, revised 4 December 2023 (v2).**
`https://arxiv.org/abs/2304.01407` and `https://arxiv.org/pdf/2304.01407` — **both
`[verified 2026-08-21, HTTP 200]`**, PDF text-extracted here.
*Good for:* **the best single reference in this whole chapter.** It supplies (a) the
four-class taxonomy of multi-term adder architectures (§2.1) — the vocabulary chapter 14
needs and that chapter 10 lacked; (b) the result that units skipping intermediate
normalization go **non-monotonic at n ≥ 4**, which is exactly this guide's operand count;
(c) a reference list that independently corroborates three of chapter 10's `[title-only]`
citations (Tenca, Sohn & Swartzlander, Kulisch) with volume and page numbers.
*Strength:* peer-reviewable preprint, MATLAB/CPFloat simulations, explicit about what is
demonstrated versus inferred.

**F2. Alexandridis, K. and Dimitrakopoulos, G., "Online Alignment and Addition in
Multi-Term Floating-Point Adders", arXiv:2410.21959, submitted 29 October 2024.**
`https://arxiv.org/abs/2410.21959`, PDF `https://arxiv.org/pdf/2410.21959` — **both
`[verified 2026-08-21, HTTP 200]`**, text-extracted here.
*Good for:* the statement that **alignment is the serial bottleneck** in multi-term
addition, and synthesis results (3-23 % area, 4-26 % power savings over their baseline) for
a fused, associative align-and-add operator at 16/32/64 inputs in FP32 and BFloat16.
*Strength:* the authors' own synthesis flow — **vendor-style evidence, flag as such**.
Nothing here was reproduced.

**F3. Uguen, Y. and de Dinechin, F., "Design-space exploration for the Kulisch
accumulator", HAL preprint hal-01488916v2, 20 March 2017.**
`https://hal.science/hal-01488916` — **HTTP 200 to `curl`, 403 to `WebFetch`**;
PDF `https://hal.science/hal-01488916/document` — **`[verified 2026-08-21, HTTP 200]`**,
text-extracted here.
*Good for:* **the citable substitute for Kulisch's paywalled book.** Its Table 1 gives the
minimum exact-accumulator widths — binary16 **80 bits**, binary32 **554 bits**, binary64
**4196 bits** — which §2.2's independent `python3` derivation reproduces exactly; it states
the provenance of the folklore 4288 figure; and it gives real FPGA numbers ("5x the
resources, but … a 30x latency improvement" against binary64 accumulation).
*Strength:* preprint, authors' own FPGA synthesis; the width table is arithmetic and is
independently confirmed here.

**F4. Kulisch, U., *Computer Arithmetic and Validity*, De Gruyter.** **`[title-only]`** —
see §9.2 entry 9 for why (DOI returns 202; no Wikipedia article exists). Use F3 for any
number.

**F5. Sohn, J. and Swartzlander, E. E., "A fused floating-point four-term dot product
unit", *IEEE Trans. Circuits and Systems I: Regular Papers* 63(3):370-378, 2016.**
**`[title-only — blocked here]`**; IEEE Xplore refuses this container (418/202). Citation
details taken from F1's reference list [16], which was fetched. *Good for:* the closest
published analogue to this guide's own artifact — a **four-term** fused unit. Chapter 14
may name it; it may not characterise its contents.

**F6. Tenca, A. F., "Multi-operand floating-point addition", ARITH-19, Portland, OR,
June 2009, pp. 161-168.** **`[title-only]`**, corroborated by F1's reference [13]. *Good
for:* the Class II design — fl(a+b+c) with one rounding, and the shifted-out-bit tracking
problem that is this guide's sticky bit generalized.

**F7. Riedy, E. J. and Demmel, J., "Augmented Arithmetic Operations Proposed for IEEE-754
2018", 25th IEEE Symposium on Computer Arithmetic (ARITH 2018), pp. 49-56.**
`http://www.acsel-lab.com/arithmetic/arith25/pdf/34.pdf` — **`[verified 2026-08-21, HTTP
200]`**, PDF text-extracted here; open mirror also at
`https://par.nsf.gov/biblio/10089378-augmented-arithmetic-operations-proposed-ieee`
(HTTP 200). See §3.2-3.4 for the quotations.
*Good for:* the definitive account of *why* clause 9.5 exists, the `roundTiesToZero`
rationale, and the full exceptional-case specification. **This is the source chapter 14
should lead with on augmented operations**, not Wikipedia.

**F8. Boldo, S., Lauter, C. Q. and Muller, J.-M., "Emulating round-to-nearest-ties-to-zero
'augmented' floating-point operations using round-to-nearest-ties-to-even arithmetic", HAL
preprint hal-02137968v1, 23 May 2019.**
`https://hal.science/hal-02137968v1/file/Emulation-RN0-HalVersion.pdf` —
**`[verified 2026-08-21, HTTP 200]`**, text-extracted here. *Good for:* the honest answer to
"is there hardware?" — the paper exists *because* there is not, and it says so (§3.5).

**F9. ANSI/IEEE Std 754-2019 revision committee, "ANSI/IEEE Std 754-2019 — Background".**
`https://754r.ucbtest.org/background/` — **`[verified 2026-08-21, HTTP 200]`**; companion
index `https://grouper.ieee.org/groups/msc/ANSI_IEEE-Std-754-2019/background/` — HTTP 200.
*Good for:* the free, citable statement of what changed in 754-2019 and the clause numbers
(§3.1). **This is the single most useful free source about a standard the project cannot
read.**

**F10. de Dinechin, F., Forget, L., Muller, J.-M. and Uguen, Y., "Posits: the good, the bad
and the ugly", CoNGA 2019.** Listed under posits (F14) but belongs here too: §6.4's quire
cost figures are multi-operand-accumulator numbers.

---

### 10.2 Reduced-precision formats

**F11. Micikevicius, P. et al., "FP8 Formats for Deep Learning", arXiv:2209.05433, v2 of
29 September 2022.** `https://arxiv.org/abs/2209.05433` — **`[verified 2026-08-21, HTTP
200]`**; PDF `https://arxiv.org/pdf/2209.05433` — HTTP 200.
*Good for:* the E4M3/E5M2 definition and the design rationale for E4M3's missing
infinities. **Quotation hazard recorded in §5.1: the abstract contains the typo
"representatio".** *Strength:* cross-vendor proposal (NVIDIA/Arm/Intel authors); the ML
results are the authors' experiments.

**F12. Open Compute Project, "OCP 8-bit Floating Point Specification (OFP8)", Revision 1.0,
2023-12-01**; and **"OCP Microscaling Formats (MX) Specification", v1.0.**
**Both `[title-only — blocked here]`: HTTP 403 to `curl` and to `WebFetch`, and
`opencompute.org` refuses this container entirely.** *Good for:* the normative FP8
definition — which chapter 14 therefore **must not quote**. Use F11 and F13 for format
facts, and say plainly that the standardizing document could not be read.

**F13. NVIDIA, "Using FP8 with Transformer Engine", Transformer Engine **2.3.0**
documentation.**
`https://docs.nvidia.com/deeplearning/transformer-engine-releases/release-2.3/user-guide/examples/fp8_primer.html`
— **`[verified 2026-08-21, HTTP 200]`**, text-extracted here.
*Good for:* the fetchable statement of E4M3 max = **448** and E5M2 max = **57,344** with
inf/NaN handling, plus the loss-scaling and per-tensor-scaling rationale (§5.3).
**Pin the version in the citation** — the current-docs URL
(`.../transformer-engine/user-guide/examples/fp8_primer.html`, HTTP 200) no longer contains
that text. *Strength:* vendor documentation. Flag as such.

**F14. NVIDIA, "Accelerating AI Training with NVIDIA TF32 Tensor Cores", NVIDIA Technical
Blog.** `https://developer.nvidia.com/blog/accelerating-ai-training-with-tf32-tensor-cores/`
— **`[verified 2026-08-21, HTTP 200]`**; five sentences confirmed verbatim by literal
substring test (§4.4). *Good for:* TF32's 8/10/1 layout, its status as an operation mode
rather than a type, and the round-to-TF32 / multiply-exact / accumulate-in-FP32 pattern.
*Strength:* vendor claim; §4.4 records where "the same range of values as FP32" is
approximate.

**F15. NVIDIA, "Floating-Point 8: An Introduction to Efficient, Lower-Precision AI
Training", NVIDIA Technical Blog.**
`https://developer.nvidia.com/blog/floating-point-8-an-introduction-to-efficient-lower-precision-ai-training/`
— **`[verified 2026-08-21, HTTP 200]`**; fetched, not quoted.

**F16. Kalamkar, D. et al., "A Study of BFLOAT16 for Deep Learning Training",
arXiv:1905.12322, 2019.** `https://arxiv.org/abs/1905.12322` — **`[verified 2026-08-21,
HTTP 200]`**. *Good for:* the empirical case that bfloat16 trains to FP32 quality without
hyper-parameter changes, and the range argument for why. *Strength:* the authors'
experiments; an ML result, not an arithmetic one.

**F17. Google Cloud, "Improve your model's performance with bfloat16" (Cloud TPU
documentation).** Requested `https://cloud.google.com/tpu/docs/bfloat16`, **HTTP 200,
redirecting to `https://docs.cloud.google.com/tpu/docs/bfloat16` — cite the effective
URL.** **`[verified but not quotable]`**: the fetched bytes were dominated by site
navigation and no body text was extracted here, so nothing in these notes rests on it.

**F18. Wikipedia: *Bfloat16 floating-point format*, *Half-precision floating-point format*,
*Minifloat*, *Unum (number format)*, *Systolic array*, *Tensor Processing Unit*.** All
**`[verified 2026-08-21, HTTP 200]`**. Two strings from the bfloat16 article are quoted in
§4.2 and were confirmed by literal substring test. *Strength:* secondary. Adequate for
field widths and framing, never for a normative or vendor claim.

---

### 10.3 Posits

**F19. Posit Working Group, "Standard for Posit™ Arithmetic (2022)", 2 March 2022, 12 pp.,
sponsored by NSCC Singapore; John Gustafson, Chair.**
`https://posithub.org/docs/posit_standard-2.pdf` — **`[verified 2026-08-21, HTTP 200]`**,
downloaded and text-extracted with `pypdf`. Host `https://posithub.org/` — HTTP 200.
*Good for:* **everything normative about posits, free.** Two fixed exponent bits, the
signed-unary regime, NaR, the quire at 16n bits, and Table 1's per-precision parameters —
reproduced independently by the decoder in §6.2. *Strength:* the normative document itself,
and the one standard in this bibliography that is not paywalled.

**F20. Gustafson, J. L. and Yonemoto, I. T., "Beating Floating Point at its Own Game: Posit
Arithmetic", *Supercomputing Frontiers and Innovations* 4(2):71-86, 2017.**
`https://superfri.org/index.php/superfri/article/view/137` — **`[verified 2026-08-21, HTTP
200]`**, abstract extracted here. **DOI `https://doi.org/10.14529/jsfi170206` was resolved
in this session** (HTTP 200, redirecting to the superfri page), so it is safe to print.
**Do not cite `https://dl.acm.org/doi/10.14529/jsfi170206` — HTTP 403 here.**
*Good for:* the posit claims, in the proposers' own words (§6.3). *Strength:* advocacy by
the format's designers; pair it with F21 or do not use it.

**F21. de Dinechin, F., Forget, L., Muller, J.-M. and Uguen, Y., "Posits: the good, the bad
and the ugly", Conference for Next Generation Arithmetic (CoNGA 2019), March 2019,
Singapore, ACM, 10 pp.**
`https://people.eecs.berkeley.edu/~demmel/ma221_Fall20/Dinechin_etal_2019.pdf` —
**`[verified 2026-08-21, HTTP 200]`**, text-extracted here; HAL record
`https://inria.hal.science/hal-01959581` — HTTP 200; venue corroborated by
`https://posithub.org/conga/2019/programme` — HTTP 200.
*Good for:* the golden zone, the comparable-area-and-latency finding, and the quire's
"more than 4x the area and 8x the latency" FPGA measurement (§6.4). **The single most
important counterweight in this chapter**, and by authors this guide already cites.
*Strength:* peer-reviewed conference paper with the authors' own FPGA implementation.
**Date it to the pre-2022 posit standard** where it says the quire is under-specified.

---

### 10.4 Accelerator architecture

**F22. Fasi, M., Higham, N. J., Mikaitis, M. and Pranesh, S., "Numerical Behavior of NVIDIA
Tensor Cores", MIMS EPrint 2020.10, University of Manchester; published as *PeerJ Computer
Science* 7:e330, 2021.**
`https://eprints.maths.manchester.ac.uk/2774/1/fhmp20.pdf` — **`[verified 2026-08-21, HTTP
200]`**, text-extracted here. Sibling eprint
`https://eprints.maths.manchester.ac.uk/2761/1/fhms20.pdf` — HTTP 200.
**`https://peerj.com/articles/cs-330/` returned HTTP 403 to both fetch paths — cite the
eprint and name the journal.**
*Good for:* **the best measured account of a real mixed-precision accumulator** — Table 1's
device/format matrix, the V100's `{3.23}`-`{4.24}` internal fixed-point path,
round-toward-zero, largest-first accumulation order, single final normalization, and the
demonstrated non-monotonicity (§8.4-8.5). Also the clearest statement of what IEEE 754-2019
§9.4 leaves unspecified for reductions.
*Strength:* peer-reviewed, experimental, and explicit about which findings were new versus
confirmed.

**F23. Jouppi, N. P. et al., "In-Datacenter Performance Analysis of a Tensor Processing
Unit", arXiv:1704.04760, 16 April 2017 (ISCA 2017).**
`https://arxiv.org/abs/1704.04760` — **`[verified 2026-08-21, HTTP 200]`**, abstract
extracted here. *Good for:* the canonical systolic-array accelerator. **Caveat chapter 14
must carry: its matrix unit is 8-bit integer, not floating point** (§8.1).

**F24. Markidis, S., Chien, S. W. D., Laure, E., Peng, I. B. and Vetter, J. S., "NVIDIA
Tensor Core Programmability, Performance & Precision", arXiv:1803.04014, 11 March 2018.**
`https://arxiv.org/abs/1803.04014` — **`[verified 2026-08-21, HTTP 200]`**. *Good for:*
programmability and performance. **Not** the source for numerical behaviour — F22 is.

**F25. NVIDIA, *NVIDIA A100 Tensor Core GPU Architecture*, whitepaper v1.0, 2020.**
`https://www.nvidia.com/content/dam/en-zz/Solutions/Data-Center/nvidia-ampere-architecture-whitepaper.pdf`
— **`[verified 2026-08-21, HTTP 200]`**; fetched, **not quoted here**. Recorded because F1
and F22 both cite it and a reader will want the link. *Strength:* vendor whitepaper.

---

### 10.5 Fetched and deliberately unused

Recorded so the reviewer knows these were considered, not missed:
`https://fprox.substack.com/p/ieee-754-the-floating-point-standard` (HTTP 200, secondary
blog — superseded by F7/F9); `https://en.wikipedia.org/wiki/Minifloat` (HTTP 200, used only
for framing); `https://people.eecs.berkeley.edu/~wkahan/` (HTTP 200 — Kahan's page, already
the home of chapter 7's 754 history source; **no Kahan critique of posits was fetched, so
none may be cited**); `https://inria.hal.science/hal-02982017/document` (HTTP 200, a
correctly-rounded fixed-point dot-product algorithm — relevant to §2's Class II but not
quoted).

## 11. What this guide measured that the literature would want

**Strength discipline for this section, and the writer must not relax it.** Everything
below is *"measured here"*, never *"novel"*. This research pass did **not** conduct a
systematic prior-art search for any of these results, and several of them are almost
certainly known to the arithmetic community in some form — §2.1's taxonomy paper opens by
taking for granted that "single normalization and rounding improves precision", which is the
qualitative version of item 1. What the guide can honestly claim is that it **measured**
these things, **in this format, at this operand count, with reproducible artifacts**, and
that it **could not find them stated with numbers** in the sources fetched here. Both halves
of that sentence are required. Where a source *does* say something adjacent, it is named.

---

**1. The price of Class III composition at n = 4 in binary32, split by exponent regime.**
Chapter 12's S3 and chapter 10's "Accuracy Against the Correctly Rounded Sum" put numbers
on how often three roundings miss the correctly rounded four-input sum, at full range and
under clustered-exponent regimes, against an exact single-rounding oracle — with the honest
warning that the figure moves with how "clustered" is constructed.
*Adjacent literature:* Mikaitis (F1) classifies the architectures and asserts the direction
of the effect; Higham (§9.3 entry 30) bounds summation error asymptotically. **Neither gives
a measured miss-rate for a specific four-input binary32 composition.**
*Strength:* measured, reproducible from `src/ch10` and `src/ch12`, seed recorded.
*Caveat the guide already carries:* which clustered window is worse flips between
constructions, so no monotone law is claimed.

**2. "Both orders agree" is a false oracle.** Chapter 10's "'Both Orders Agree' Is Not an
Oracle": a fifth of clustered quadruples on which the tree and the sequential structure
agree bit-for-bit still miss the correctly rounded sum.
*Why the literature would want it:* it is a **verification** result, not an arithmetic one —
it falsifies a plausible and cheap oracle that a practitioner would reach for. Nothing
fetched here addresses it.
*Strength:* measured. This is, in the researcher's judgement, the guide's most
transferable single finding.

**3. The composed `inexact` flag over-reports one-directionally.** Chapter 10's "Flags Under
Composition": composition can raise `inexact` when the final bits land exact, and provably
never misses a genuinely inexact sum.
*Adjacent:* Riedy & Demmel (F7) specify flag behaviour for the augmented operations and note
"This operation signals inexact only when roundTiesToZero(x + y) overflows" — a different
answer to the same class of question, from the standards side.
*Strength:* measured for the composition; the one-directionality is argued, and chapter 10
states which part is proof and which is measurement.

**4. A binary32 adder can never raise the underflow flag.** Chapter 7's "The Flags an Adder
Can Actually Raise", carried into chapter 12's S4 as an omission *with a proof* rather than
a shrug (0 inexact in 400,000 cancelling pairs, plus the Sterbenz-style argument).
*Adjacent:* the underlying lemma is Sterbenz's, and the guide says so.
*What is the guide's own:* the specific claim about the *flag*, for *this* operation, and
the willingness to write a specification clause that omits it and cite the proof.
**Format-specific — see §7.3. Do not let chapter 14 generalize it.**

**5. Port order is part of the arithmetic specification, not an implementation detail.**
Chapter 10's "One Multiset, Three Answers" and chapter 12's S1: the multiset
{max, max, −max, −max} yields qNaN, +inf or +0 depending on **both** tree shape and
port-to-operand mapping, with all six port orders enumerated and pinned.
*Why the literature would want it:* published multi-operand adder papers specify the
operation; this is a concrete demonstration that at n = 4 with intermediate overflow, the
*wiring* is part of the function. Fasi et al. (F22) found the analogous thing empirically on
real hardware — "The five summands in (2) are accumulated starting with the largest in
absolute value" is an ordering the vendor never documented.
*Strength:* measured and enumerated exhaustively over the six orders.

**6. The rounding-carry renormalize is unreachable by random stimulus.** Chapter 8's
"Round, and the Renormalize Random Never Finds": zero occurrences in 1,000,000 random
pairs, so any random campaign of realistic size never exercises it and the corner library
must carry it explicitly with a coverage bin to prove it ran.
*Why it matters beyond this guide:* it is a quantified statement about a **verification blind
spot** in the most-tested operation in computing.
*Strength:* measured; a null result with a stated sample size, which is the right form.

**7. A coverage model is a testbench and needs the same mutation discipline.** Chapter 12's
"Pinning the Bins: The Last Unpaid Debt" — 105 bins, every definition re-implemented
independently in `python3`, and the guard still let **two** bin mutations survive until the
*library* was fixed.
*Adjacent, and this is the good part:* chapter 12's own seed notes that stock functional
coverage in SystemVerilog provides **no mechanism at all** for verifying bin definitions
against a second implementation, and chapter 13 confirmed it against IEEE 1800-2017 Clause
19 and Spear & Tumbush. So the gap is real and named.
*Strength:* measured, with the mutation record shipped.

**8. `!=` silently passes an undriven design; `!==` plus an X-guard is mandatory.** Chapter
9's finding that the central equivalence sweep is **vacuous** under `!=`.
*Strength:* measured. Almost certainly folklore somewhere, but the guide has the falsifying
run.

**9. Neither tree nor sequential is systematically more accurate at n = 4.** Chapter 10:
per-regime differences are real but their *direction flips between regimes*, so the choice
is a latency/area decision, not an accuracy one — and the chapter kills the folklore that
trees are "more accurate" at this width.
*Caveat already applied by ch10's review:* the win2 gap measured >13σ, so
"statistically indistinguishable" was withdrawn as an overclaim. **Keep that correction
visible in chapter 14** — it is a good example of the guide policing its own strength.

**10. The reduced-width exhaustive method, with its census and its limits.** Chapter 5's
"Verifying Floating Point Specifically": an IEEE-shaped E4M3 gives 65,536 pairs, 10.6 %
involving a subnormal against 0.78 % for random binary32, all 25 class crosses guaranteed —
and the explicit limits (it cannot catch width-dependent bugs). Plus the **E4M3 naming
caveat** that §5.4 cashes out.
*Strength:* measured and arithmetic; §5.4 independently reproduced the census here.

---

### 11.1 Two results chapter 14 could still produce, cheaply

Both were identified during this pass and **neither was run**. If the writer wants chapter
14 to contain a measurement of its own rather than only literature, these are the
candidates, in order of value:

1. **Monotonicity of `fp32_add4`** (§8.5). Fasi et al. demonstrated non-monotonicity in a
   real five-operand accumulator; Mikaitis showed it appears for n ≥ 4 without intermediate
   normalization. This guide's design normalizes every intermediate, so it *should* be
   monotonic — but that is an inference, not a measurement. A directed sweep in the shape of
   Fasi et al.'s counterexample, plus a random sweep, would settle it. **This would be the
   chapter's strongest original contribution**, because it answers a question the fetched
   literature poses and this design is the right shape to answer.
2. **The composition price at reduced width** (§7.4). Chapter 5's E4M3 machinery already
   exists; a four-operand E4M3 sweep is 2³² quadruples. It would test the plausible-but-
   unmeasured expectation that narrower formats pay *more* for per-stage rounding.

If neither is run, chapter 14 must say so — an unmeasured expectation stated as one is
exactly the defect class this project has spent thirteen chapters eliminating.

## 12. Writer's handoff: what chapter 14 may claim, and at what strength

### 12.1 The chapter's shape, suggested

Chapter 14 is the last chapter and its reviewer is a **citation checker**. The structure
that serves both:

1. **The road not taken** — §2. Open with chapter 12's S3/S10 (quoted by clause and by
   section title, numbers *cited* not restated), then the four-class taxonomy, then the
   width arithmetic of §2.2. Ends with: single rounding costs about an order of magnitude
   in datapath width, and here is who has paid it.
2. **The standard's own answer** — §3. Augmented operations: what they are, why
   `roundTiesToZero`, and the honest implementation status.
3. **The formats** — §§4-6, in that order (bfloat16/FP16/TF32 → FP8 → posits), because each
   one gives up more of IEEE 754's shape than the last, ending with posits, which give up
   the fixed exponent field entirely.
4. **What it would cost this design** — §7, including the measured fact that the shipped
   RTL has **no parameters**, so every retarget is a rewrite.
5. **Where the formats actually run** — §8, and the closing symmetry of §8.5.
6. **The annotated bibliography** — §§9-10, the chapter's centerpiece.
7. **What we measured that the literature would want** — §11, at modest strength.

### 12.2 Hard rules for this chapter

1. **No URL that is not in §1.** If the writer wants to cite something new, fetch it and
   record the status and date, or tag it `[title-only]` with the reason. There is no third
   option and the reviewer will check.
2. **Every quotation in these notes was extracted mechanically and substring-tested.** Copy
   them exactly, including the two preserved typos ("representatio" in §5.1, "a 33% speed
   improvements" in §3.2). Mark both `[sic]`.
3. **Three registers, kept visibly apart.** *The standard says* — and for IEEE 754-2019
   that phrase is almost never available, because the standard is `[title-only]`; say "the
   revision committee's own summary says" instead, citing F9. *This vendor claims* — NVIDIA,
   Google, the posit designers; flag every one. *We measured* — the guide's chapters only.
4. **Nothing in §§2-8 was built or run here.** No area, latency, power or Fmax number in
   this chapter is a measurement. Chapter 11's "Timing, Fmax, and the Epistemic Wall" is the
   standing precedent and must be honoured.
5. **Cite the guide's own numbers by chapter and quoted section title, not by restating
   them.** The charter is explicit and it also protects against drift: the ch10/ch12 numbers
   have already been re-derived once and moved slightly.
6. **Date every posit claim** against the 2022 standard (§6.5) and every vendor-doc claim
   against its version (§5.3).

### 12.3 Claims the writer may make, at the strength given

| Claim | Strength | Source |
|---|---|---|
| Multi-operand adders sort into four architectural classes | documentation | F1 |
| `fp32_add4` is a Class III design | inference from F1's definitions + ch09/ch12's structure — **safe, say "belongs to what Mikaitis calls Class III"** | F1 + guide |
| Exact accumulation of binary32 *sums* at n=4 needs ~280 bits | **arithmetic, computed here**, derivation shown | §2.2 |
| Minimum exact accumulator widths are 80 / 554 / 4196 bits | documentation **and** independently reproduced here | F3 + §2.2 |
| Kulisch proposed 4288 bits for binary64 | documentation | F3 |
| The Posit32 quire costs >4× area, 8× latency vs adder+multiplier on FPGA | the authors' measurement — attribute | F21 |
| Posits and floats have comparable area and latency | the authors' measurement — attribute, **and note it contradicts F20** | F21 |
| A posit PPU takes less circuitry than an IEEE FPU | **the designers' claim** — attribute, do not endorse | F20 |
| augmented operations are clause 9.5, recommended not required | documentation, committee's own page | F9 |
| augmented operations use `roundTiesToZero`, a rounding direction defined only for them | documentation | F7 |
| No fetch-verifiable evidence of a hardware implementation was found here | **honest negative, phrased exactly like that** | §3.5 |
| bfloat16 keeps binary32's 8-bit exponent and bias | documentation **and** arithmetic | F18 + §4.1 |
| bfloat16 does **not** have identical dynamic range (shallower subnormals, smaller max) | **arithmetic, computed here** | §4.2 |
| TF32 is 19 bits, an operation mode not a type, accumulating in FP32 | vendor claim, quoted | F14 |
| OCP E4M3 max is 448; ch05's IEEE-shaped E4M3 max is 240 | vendor documentation (448) + arithmetic (both) | F13 + §5.4 |
| The OCP OFP8 spec could not be read from here | **fact about this session** — state it | §5.2 |
| posit32 has 27 fraction bits near 1.0, crossing below binary32's 23 at 2²⁰ | **arithmetic, computed here**, and independently confirmed by F21's golden zone | §6.2 + F21 |
| Tensor cores accumulate binary16 products in binary32, round-toward-zero, normalizing only the final result | **measured by Fasi et al.** — attribute to them | F22 |
| Tensor-core dot products are non-monotonic | measured by Fasi et al.; generalized by Mikaitis to n ≥ 4 | F22, F1 |
| `fp32_add4` is monotonic | **DO NOT CLAIM unless measured.** See §11.1 item 1 | — |
| Narrower formats pay more for per-stage rounding | **DO NOT CLAIM unless measured.** See §7.4 | — |
| The guide's RTL has no `parameter` declarations | **measured here** by `grep` over `src/ch09` and `src/ch12` | §7 |
| Chapters 1-13 contain zero dead links | **measured here**, 33 URLs, 2026-08-21 | §1a, §9.5 |

### 12.4 Does this chapter ship code?

`STATE.md`'s resume block says `src/ch14/` only "if code genuinely earns its place — this
chapter may legitimately ship no code, in which case say so in the chapter and skip the
manifest." **The research view:** the chapter earns code only if the writer runs one of
§11.1's two measurements. If it runs the monotonicity sweep, that is a real testbench over
the *existing* `fp32_add4` and belongs in `src/ch14/` with a `targets.txt` row and the
standing mutation discipline applied to it. If neither measurement is run, ship no code and
say so — a chapter whose subject is other people's work, with a bibliography as its
deliverable, does not need a listing to justify itself, and a decorative one would be the
first unearned artifact in thirteen chapters.

### 12.5 Loose ends handed to F1 and F3

1. **ch04's GitHub field assertions** (`archived: false`, tag `v3.3.116`, last commit
   2026-04-18, last push 2026-07-23) are dated 2026-08-09 and could not be re-verified from
   this container (§1a, §9.4 entry 51). Either re-check them or soften them to
   "as of 2026-08-09".
2. **ch06's "returned HTTP 503"** for digitalsignallabs.com no longer reproduces — the site
   now resets the TLS connection (§1b, §9.4 entry 57). Soften to a failure-mode-neutral
   phrase.
3. **Do not normalize the two `jhauser.us` URLs to HTTPS** (§1a, §9.4 entry 48) — neither
   redirects, and the rewrite would break both links.
4. **ch10's Wikipedia-sourced augmented-operations claim** should be re-anchored to F9 and
   F7 in the merged guide (§9.4 entry 56). Wikipedia is corroboration here, not support.
5. **ch08's two "existence confirmed via search results only" citations** (Seidel & Even;
   Schmookler & Nowka) are still in that state — this pass did not improve them, because
   IEEE Xplore refuses this container (§9.3 entries 33-34). **Two other citations in that
   category *were* improved:** Tenca and Sohn & Swartzlander are now corroborated with page
   numbers from a fetched reference list (§9.3 entries 35-36) — worth propagating back into
   ch10's source list if F1 is editing it anyway.
6. **The version split between IEEE 1800-2017 and 1800-2023** across chapters (§9.1 entries
   3-4) should be made deliberate rather than incidental in a merged guide.

---

## Appendix A. The three `python3` models, in full

Every number in §2.2, §4.1, §5.4 and §6.2 came from one of these three scripts, run under
`python3` 3.11.15 on this machine on 2026-08-21. They are reproduced here because the
scratchpad they were written in does not survive the session, and because a chapter whose
subject is verifiability should not hand the reviewer three tables and a promise. Each is
short, has no dependencies beyond the standard library, and prints its own results.

**Validation, restated:** `formats.py` reproduces chapter 5's published E4M3 census and
NVIDIA's published FP8 maxima; `posit.py` reproduces the posit standard's Table 1;
`widths.py` reproduces Uguen & de Dinechin's Table 1 (80 / 554 / 4196 bits). None was
tuned to match — each computes from the field widths alone.

### A.1 `widths.py` — exact-accumulator widths (§2.2)

```python
from fractions import Fraction as F
import math, struct

def fmt(name, ew, mw):
    bias = 2**(ew-1)-1
    emax = bias                      # unbiased max exponent
    emin = 1-bias                    # min normal exponent
    p    = mw+1
    minsub_exp = emin-mw             # exponent of least significant bit of min subnormal
    maxfinite = (2-2**-mw)*2**emax
    return dict(name=name, ew=ew, mw=mw, p=p, bias=bias, emax=emax, emin=emin,
                minsub_exp=minsub_exp, maxfinite=maxfinite)

for f in [fmt('binary32',8,23), fmt('binary16',5,10), fmt('bfloat16',8,7),
          fmt('E4M3 (IEEE-shaped, this guide ch05)',4,3), fmt('E5M2',5,2),
          fmt('TF32 (19-bit)',8,10), fmt('binary64',11,52)]:
    print(f"{f['name']:38s} p={f['p']:3d} bias={f['bias']:5d} emax={f['emax']:5d} emin={f['emin']:6d} "
          f"minsub=2^{f['minsub_exp']} max~{f['maxfinite']:.6g}")

print()
b32 = fmt('binary32',8,23)
# exact fixed-point accumulator for a SUM of binary32 values
lsb = b32['minsub_exp']           # -149
msb_bound = b32['emax']+1         # values < 2^128
span = msb_bound - lsb            # bits to represent any single value exactly
print("binary32 single-value exact fixed-point span:", span, "bits  (2^%d .. 2^%d)"%(lsb,msb_bound))
for n in (2,3,4,8,16):
    g = math.ceil(math.log2(n))
    print(f"  n={n:2d} addends -> +{g} carry bit(s) + 1 sign = {span+g+1} bits")

# exact dot-product accumulator (Kulisch style) for binary32 products
plsb = 2*lsb
pmsb = 2*msb_bound
pspan = pmsb-plsb
print()
print("binary32 PRODUCT exact span:", pspan, "bits (2^%d .. 2^%d)"%(plsb,pmsb))
for g in (64,86,88):
    print(f"  + {g} guard bits + 1 sign = {pspan+g+1}")
print("  Kulisch-style 'about 640 bits' needs g =", 640-pspan-1, "guard bits (or 640-pspan =", 640-pspan, "without a separate sign bit)")

# binary64 check against the cited 4288
b64=fmt('binary64',11,52)
l64=b64['minsub_exp']; m64=b64['emax']+1
print("binary64 product span:", 2*m64-2*l64, "bits; 4288 -", 2*m64-2*l64, "=", 4288-(2*m64-2*l64), "extra bits")
```

### A.2 `formats.py` — the format census (§4.1, §5.4)

```python
from fractions import Fraction as F
import math

def census(name, ew, mw, has_inf=True, nan_patterns=None, note=""):
    """IEEE-shaped format unless has_inf=False (OCP-FP8-E4M3 style)."""
    bias=2**(ew-1)-1; p=mw+1
    total=2**(1+ew+mw)
    zeros=2
    subs=2*(2**mw-1)
    if has_inf:
        infs=2; nans=2*(2**mw-1)
        emax=bias
        maxf=F(2**(mw+1)-1,2**mw)*F(2)**emax
    else:
        infs=0
        nans=nan_patterns if nan_patterns is not None else 2
        emax=bias+1                      # the all-ones exponent becomes a normal binade
        # largest finite = all-ones exp, all-ones mant minus the NaN patterns
        maxf=F(2**(mw+1)-1-(1 if nans==2 else 0),2**mw)*F(2)**emax
    norms=total-zeros-subs-infs-nans
    minsub=F(1,2**mw)*F(2)**(1-bias)
    minnorm=F(2)**(1-bias)
    print(f"{name:34s} ew={ew} mw={mw} p={p:2d} bias={bias:4d} | patterns {total:6d} = "
          f"{zeros} zero + {subs:5d} sub + {norms:6d} norm + {infs} inf + {nans:5d} NaN")
    print(f"{'':34s} minsub={float(minsub):.6g}  minnorm={float(minnorm):.6g}  max={float(maxf):.6g}  "
          f"ulp(1)=2^-{mw}={2.0**-mw:.6g}  decimal digits~{p*math.log10(2):.2f}")
    return dict(name=name,ew=ew,mw=mw,p=p,bias=bias,total=total,subs=subs,norms=norms,nans=nans,infs=infs,maxf=maxf,minsub=minsub)

print("=== IEEE-shaped formats (the shape this guide's parameterised adder assumes) ===")
census("binary32 (the guide's format)",8,23)
census("binary16 / FP16",5,10)
census("bfloat16",8,7)
census("TF32 (19 bits, not a storage fmt)",8,10)
census("E5M2 (IEEE-shaped == OCP E5M2)",5,2)
census("E4M3 IEEE-shaped (ch05's)",4,3)
print()
print("=== OCP OFP8 E4M3: NOT IEEE-shaped (no infinities) ===")
census("E4M3 OCP-style (no inf, 2 NaN)",4,3,has_inf=False,nan_patterns=2)
```

### A.3 `posit.py` — a posit decoder and the taper table (§6.2)

```python
from fractions import Fraction as F
import math
ES=2  # fixed by the 2022 standard

def decode(bits, n, es=ES):
    """Return (value or None for NaR, fraction_bit_count)."""
    if bits==0: return F(0),0
    if bits==1<<(n-1): return None,0          # NaR
    s = bits>>(n-1)
    x = bits
    if s: x = ((~x)+1) & ((1<<n)-1)           # two's complement
    b = format(x, '0%db'%n)[1:]               # n-1 bits after sign
    r0 = b[0]; k=0
    i=0
    while i<len(b) and b[i]==r0: k+=1; i+=1
    if i<len(b): i+=1                         # skip terminating bit
    regime = -k if r0=='0' else k-1
    ebits = b[i:i+es]; i+=es
    e = int(ebits.ljust(es,'0'),2) if es else 0
    fbits = b[i:]
    nf=len(fbits)
    frac = F(int(fbits,2), 1<<nf) if nf else F(0)
    val = (1+frac) * F(2)**(regime*(2**es) + e)
    if s: val = -val
    return val, nf

for n in (8,16,32):
    vals=[]; nfs=[]
    if n<=16:
        for b in range(1<<n):
            v,nf = decode(b,n)
            if v is None: continue
            vals.append(v); nfs.append(nf)
        pos=[v for v in vals if v>0]
        print(f"posit{n}: {1<<n} patterns = 1 zero + 1 NaR + {len(vals)-1} nonzero reals "
              f"({len(pos)} positive)")
        print(f"   minPos={float(min(pos)):.6g} (2^{math.log2(float(min(pos))):.0f})  "
              f"maxPos={float(max(pos)):.6g} (2^{math.log2(float(max(pos))):.0f})  "
              f"max fraction bits={max(nfs)}")
        from collections import Counter
        c=Counter(nfs)
        print("   fraction-bit histogram (all patterns incl. sign):", dict(sorted(c.items())))
    else:
        print(f"posit{n}: minPos=2^{-4*n+8}  maxPos=2^{4*n-8}  max fraction bits={max(0,n-5)}"
              f"  quire={16*n} bits")
print()
# accuracy comparison in the "golden zone": posit32 vs binary32
print("posit32 has 27 fraction bits (p=28) only for |x| in [1,4); binary32 has 23 everywhere in its normal range.")
for lo in range(0,9):
    # regime k -> exponent scale 4*regime; fraction bits = 32 - 1 - (regime bits) - 2
    k=lo
    rb = k+2 if k>0 else 2      # regime bit count incl terminator for r>=0: k+1 identical +1 terminator
    pass
# tabulate fraction bits vs magnitude for posit32 explicitly
print()
print(" binade of 2^(4r) .. regime r : regime bits (incl terminator) : fraction bits (posit32)")
for r in range(0,8):
    rbits = (r+1)+1            # r+1 ones then a terminating 0
    fb = 32-1-rbits-ES
    print(f"   r={r:2d}  x in [2^{4*r}, 2^{4*r+4})   regimebits={rbits:2d}  fractionbits={max(fb,0):2d}")
```

### A.4 PDF text extraction

Five of the sources are PDFs. `pdftotext` is not installed here and `import pypdf` fails
because its optional `cryptography` import panics in this container's Rust bindings
(`pyo3_runtime.PanicException`). The workaround, used for every PDF quotation in these
notes, is to stub the module out before importing:

```python
import sys, types
for m in ["cryptography","cryptography.hazmat","cryptography.hazmat.bindings",
          "cryptography.hazmat.bindings._rust","cryptography.exceptions",
          "cryptography.hazmat.primitives"]:
    sys.modules.setdefault(m, types.ModuleType(m))
import pypdf                      # 6.16.1, installed with
                                  # python3 -m pip install --break-system-packages pypdf
r = pypdf.PdfReader(path)
text = "\n".join((pg.extract_text() or "") for pg in r.pages)
```

**Two extraction artifacts are recorded in place** and matter to anyone re-checking a
quotation: the posit standard drops inter-word spaces (§6.1's caveat box), and PDFs
generally hyphen-split words across line breaks (§6.4 note). Quotations here are matched
whitespace-insensitively against the extraction and read normally against the rendered
page.
