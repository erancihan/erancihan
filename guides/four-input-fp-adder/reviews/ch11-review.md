# Chapter 11 review — round 1 (persona: RTL veteran who recompiles every listing)

<!-- sections complete: 11/11 -->

## Verdict

**Score: 8/10. Real defects, none blocking; every load-bearing measurement reproduced under my own recompiles, my own probes, and my own seed.**

I recompiled every target (8/8 ch11, 103/103 full repo, cold), reproduced all 26 mutation-record rows to the unit (kill counts 5,310 / 407 / 61,486 / 16,162 / 7,973; survivor PASSes; false passes; guard firings; the 9/11/14-vs-12 coverage ladder; T3's literal "only 1114"), re-derived the +inf reset trap from the shipped normalize/round source in python (e_lim wrap 255, e_norm = 486, flags 011), reproduced the 2,1,2,1 blocking alternation and the clean posedge-drive latency-3 with independently written probes, ran the chapter's VCD parser verbatim on a fresh dump (byte-identical output), and streamed my own adversarial sweep (seed 271828, NaN-adjacent corners, back-to-back renormalize reachers, mid-stream X bubbles) through both depths — PASS, with the stage-qualified renorm bin landing exactly on my predicted count of 19. The equivalence claim, the five-bug-class asymmetry, and the epistemic wall all held.

What keeps this at 8 rather than 9: a shipped source comment in `tb_stream.v` asserts a measured coverage count ("10 on the 2-stage pipe") that is wrong for the shipped stimulus — the true count is 9, as the chapter and README correctly state and my runs confirm twice; the research notes carry the stale 10 with no correction note, so two shipped documents contradict each other about a "measured" number. Plus: a README reproduction command that cannot run as written (`parse_vcd.py` does not ship), a "verbatim" transcript that is silently truncated, two positional cross-references, a path-dependent VCD byte count presented as a stable figure, and a "D9" label collision between the bridge's debt and the README's own mutation row. All are one-line fixes; the list for a 9 is below, blocking-none first-among-equals.

## RTL audit

All three design files recompiled with zero output under `iverilog -g2012 -Wall` against the untouched ch02/ch07/ch09 (and ch10) dependencies, exactly as the manifest lists them.

**Stage banks.** Non-blocking throughout: every bank in `fp32_add2_p2.v` (bank 1: 9 assignments, bank 2: 4) and `fp32_add2_p4.v` (banks A/B/C/D) uses `<=` exclusively, and every declared bank register is assigned on every clock — no partial-assignment hole. The tree's flag delay line (`f1_d1`/`f1_d2`) is also non-blocking.

**Reset discipline matches the taught strategy.** The only reset domain in all three designs is the valid pipe (`vpipe` in each `fp32_add2_p2`/`p4`; the tree resets nothing of its own — its three subunit vpipes carry the domain). The tree's 6-flop flag delay line is deliberately un-reset; that is consistent with the chapter's own rule, because the chapter defines flags as "data with a latency," and fill-window flag X is gated by `out_valid` (my runs confirm no X escapes a valid retirement).

**Cut widths, counted from the declarations myself.** Bank 1 / B: 1+1+1+1+8+27 = 39 datapath + (1+1+32) = 34 screen = **73** ✓. Bank A: 1+1+8+8+24+24 = 66 + 34 = **100** ✓. Bank C: 1+1+24+3+9 = 38 + 34 = **72** ✓. Banks 2/D: 32+3 = **35** ✓. Totals: 73+35+2 = **110**, 100+73+72+35+4 = **284** (284/110 = 2.58 → "2.6×" ✓), tree 3×110+6 = **336** ✓. The un-registered align seam would cost 1+1+8+24+24+3 = 61 + 34 = **95** — ch09's price, confirming the chapter's "most expensive interior seam" arithmetic. These are exactly ch09's published cut prices (ch09.md lines 9/410/427 carry 100/95/73/72 with the 34-bit screen channel), so the "register cost menu" claim is faithful in both directions.

**Composition is genuine reuse.** `fp32_add4_tree_p.v` instantiates `fp32_add2_p2` three times in ch10's exact `(a+b)+(c+d)` shape with the valid chained (`u_add_r.in_valid = v_ab`); no re-derived datapath logic anywhere. The pipelined units instantiate ch09's seven modules with the same instance names and port maps as ch09's `fp32_add2` — the only differences are the bank-register names on stage-2+ ports. The manifest compiles ch09's actual files next to these, so "not one line of datapath logic is new" is regression-guarded, not narrated. (`v_cd` is computed and unused — silent under `-Wall`, harmless, consistent with the zero-output compile claim.)

**Valid-bit pattern.** One flop per stage, shift-register form, reset to zero, `out_valid = vpipe[LAT-1]` — as taught. My lead/lag/polarity mutants (below) confirm the streaming harness pins it to the specification.

**One naming nit.** The bridge's "**D9** — the latent `exact_zero` gate" is ch10's README mutation row D9 (correctly described), but chapter 11's own README also has a row named D9 (the direct-flag-read blocking mutation). A reader who jumps from the bridge to this chapter's mutation record lands on the wrong D9. Say "chapter 10's D9" in the bridge.

## Streaming equivalence

**Cold runs, my compiles.** `tb_stream` LAT=2: `PASS ... 101111 valid pairs incl 92 corners + 10 adjacency, 998 bubbles, 1 result/cycle, renorm corner=12 random=0` in 10.2 s; LAT=4 identical PASS line with 1000 bubbles in 10.6 s; `tb_stream4`: `PASS ... 101019 valid quads incl 16 directed, 1000 bubbles, 1 result/cycle, latency 4`. All three PASS lines match the chapter verbatim, including `renorm corner=12 random=0` (the ch08 unreachability finding reproduced in the pipe). The bubble counts even reconcile arithmetically: mix_valid = 1009, so LAT=2 drives 4+991+5 = 1000 bubbles and checks 998; LAT=4 drives 1004 and checks 1000.

**Scoreboard discipline, instrumented.** I added DRV/MON tracing to a scratch copy: the FIRST streamed transaction (driven cyc 0) is scored at cyc LAT; the LAST (driven cyc 117 in my shrunk run) is scored at cyc 119 during the drain; DRV count == MON count == n_valid_driven; every MON at cyc N pairs with the DRV at cyc N−LAT exactly. The expectation queue depth equals the latency exactly — and both off-by-one depth mutations (`LAT+1`, `LAT−1`) fail the **correct** pipeline loudly at cycles 1–4 (101,500 / 101,501 mismatches; the −1 variant additionally draws a compile warning from the rr counter's `vpipe[-1]`). Ch05's off-by-one history is genuinely closed by the shared-index shape: my T1a rerun (shifted shared index) is a full-length no-op PASS, and T1b (split read index) kills the correct DUT at cyc 3 with `80000000+80000000` blamed for its neighbor — both exactly as recorded.

**My own sweep.** Seed 271828, plus a reviewer-designed adjacency block: X-bubbles injected mid-corner-traffic, qNaN/sNaN immediately adjacent to an exact-cancellation tie, renormalize reachers back-to-back (r1 r1 r2 r2 ... r4 r4), an inf+(−inf) in swapped order, and a NaN adjacent to a reacher. Both depths: PASS, zero mismatches, and the stage-qualified renorm bin read exactly **19** — the shipped 12 plus my 7 added reacher firings, predicted before the run. The DUTs and the bin survive stimulus the author never chose.

**Fill/drain/count guards, exercised.** Drain deleted (T5): both the after-drain `===` check and the truncated-drain equality fire (`101111 driven but 101110 checked`). `-DNPR=0` (T3): drive floor fires with the literal `only 1114 valid pairs driven`. `-DLAT=3` (T4): dies at cyc 2 during fill. Throughput equality: my inverted-reset mutant was caught by the `throughput count` `$fatal` as a second line of defense. The `!=`-vacuity reproduction (T2) is real: with `!==`→`!=` and the X-guard deleted, the harness prints a full-size PASS against D4's permanently-X sticky register — the same DUT the shipped harness kills 61,486 times from cyc 12.

Verdict: the streaming-equivalence claim is as strong as the chapter says. Bit-identity to the combinational parents held over my ~1.2M streamed checks this session (shipped runs + my seed + my adjacency), and every scoreboard discipline is mutation-load-bearing in the direction claimed.

## Measured stories

Every headline story reproduced, several through probes I wrote from scratch rather than the writer's.

**Wire-indirection blocking nuance.** My own latency-classification probe on the blk1 mutant: screened reg-to-reg traffic gives `lat2=999 lat1=999 other=0 runs=1998` with the strict `2121…` string — numerically identical to the chapter's transcript — and unscreened reg-to-comb-to-reg traffic gives `lat2=1998 lat1=0`, the broken bank invisible. Correct design: clean 2s on both paths. The composition matrix: D3 (blk2 standalone) PASSes 101,111 with the shipped seed **and** 101,087 with mine; D8 (blk2 composed into the tree, shipped flag wiring) PASSes 101,019 shipped-seed **and** 101,048 my-seed; D9 (one wire indirection removed) kills 7,973 (7,693 flag-only, 280 X, 0 result-changed) from cyc 4; D7 (direct read over correct adders) PASSes. So the "202,130 streamed transactions of measured luck" claim holds — and my seed adds another ~202k of the same luck, which is precisely the chapter's point that volume cannot close a legal race.

**Datapath-reset trap.** `tb_reset` transcripts at both depths match the chapter's quoted lines byte-for-byte (row C: `7f800000 f=011` at obs 0 on p2; `00000000 f=000` then the +inf **twice** on p4). I re-derived the decode from the shipped `fp32_normalize`/`fp32_round_pack` sources in python: `e_lim = (0−1) & 0xFF = 255`, lzc26(0) = 26, `e_norm = (0−26) mod 512 = 486 > 254` → +inf with ovf, `inexact_dp = ovf | …` → flags 011. Chapter's narrative is exactly right. The witness is live: mutating the shipped design to a full datapath reset (D5) still PASSes the valid-gated stream — as recorded — and `tb_reset` immediately fails it (`row A: expected X in fill-window data`), so the reset lesson is regression-guarded against the strategy change, not just narrated. T6 (bent constant) and T6b (deposit deleted) both fire as recorded.

**X absorption.** `tb_xinj` cold: `injected=1250 absorbed_correct=767 absorbed_WRONG=0 visible_x=483 clean_mismatch=0` — 61.36%, the chapter's 61.4%. The chapter's hedge is proper: it names the research pass's 59/41 split, calls the split seed- and regime-dependent, and claims only the majority-absorbed structure, which the shipped degenerate-split guard enforces. T7 (deposit `1'b0` instead of `x`): `DEFINED WRONG output ed7e62ed/000` on the first injection, verbatim as recorded — the defined-wrong counterfactual is real. Note STATE.md's toolchain bullet still says "59 %" flatly (research-pass number); the chapter's hedged 61.4 supersedes it — fine, but F1 should reconcile.

**Same-edge driving.** My one-pulse posedge-drive probe reproduces the tear exactly: `out_valid=1 result=xxxxxxxx flags=xxx` one cycle, real result the next — two out_valid cycles for one transaction; negedge drive gives exactly one, at cycle LAT, `40400000`. My continuous posedge-drive probe on the harness's negedge slot grid: **lat3 = 1997/1997, clean, identical for blocking and NBA drive styles** — the chapter's claim to the digit. (My first probe version appeared to show a 2/3 alternation; the NBA control exposed it as my own artifact — consecutive expectations collided because 1.0+eps sums round to duplicates. With distinct exact sums the alternation vanishes. The chapter's claim survived an adversarial reviewer error, which is worth something.)

**$display/$strobe.** My probe at bank 1 with counting operands prints `posedge t=55000: $display sees bank1=1  (inputs hold txn 2)` / `$strobe sees bank1=2` — byte-identical to the chapter's transcript.

**VCD parse.** Extracted the chapter's python listing verbatim, ran it on a fresh dump: `a->pi at #130000  r_p2->2pi at #145000  delta = 15 ns, capturing posedges = 2` and `#165000 / 35 ns / 4` — identical. The LAT·T − T/2 trap and the "count capturing posedges, `t_pi < p <= te`" definition are correct as printed. Partial aliasing confirmed in the dump (`clk` shares an id across scopes; `r_p2` vs `dut2.result` differ), `MARK`/`NSLOT` parameters and the `lzc26` `$scope function` present. Nothing was written into guide/src during any run (`git status` clean after the full battery; no-plusarg run creates no file). **One overclaim:** the "32,223 bytes" VCD cost is path-dependent — the `dumpctl` block's 2048-bit `dumpfile` reg is itself dumped, embedding the plusarg path in the file; my two dumps measured 32,247 and 32,215 bytes for different path lengths, and the README's `/tmp/wave_ch11.vcd` path would give yet another number. Quote "~32 KB" or note the mechanism (which is itself a nice ch04-flavored finding).

## Mutation record

I designed my own mutations before opening the README, then reconciled. **All 26 recorded rows reproduced**, kill counts to the unit.

**My mutations first (none previously recorded):**

| Mine | Result |
|---|---|
| Bank C blocking on `fp32_add2_p4` (a bank the README never touched) | KILLED, 1,899 mismatches (178 result, 1,493 flag-only, 227 X) + renorm bin read 13 — kills via the *direct* reads `c_screen`/`c_screen_res`/`c_invalid` inside bank D's always block, confirming the chapter's reader-wiring rule on a fresh instance |
| Valid bit leads data by one (`out_valid = vpipe[0]`) | KILLED at cyc 1 (fill check) |
| Valid bit lags data by one (3-deep vpipe) | KILLED at cyc 2 (`retired out_valid=0`) plus bubble checks |
| Reset polarity inverted on the valid pipe | KILLED, plus the throughput-equality `$fatal` |
| Scoreboard depth LAT+1 / LAT−1 | Both fail the CORRECT DUT at cyc 1–4 — the harness cannot silently absorb a depth error in either direction |
| Held-quad foil rebuilt from scratch (`tb_single4` does not ship) | My independently written foil PASSes the correct tree AND the NOFD mutant over 5,016 held quads — D6b's false pass is real, not an artifact of the writer's foil |

**README reconciliation (design rows):** D1 5,310 (1,152/3,909/249) with the chapter's three FAIL lines verbatim as the first three; D1b false-PASS 20,092; D2 407 (178/1/227 + renorm 13) with first kills at cyc 3,5,7,9; D2b false-PASS; D3 PASS (both seeds); D4 61,486 all-X from cyc 12, zero compile output; D4b 12,299; D5 PASS + tb_reset witness fires; D6 16,162 (0 result-changed / 15,662 / 500), first kill cyc 7 `/100` for `/111`; D6b false-PASS on my foil; D7 PASS; D8 PASS (both seeds); D9 7,973 (7,693/280/0) from cyc 4. **Harness rows:** T1a no-op PASS; T1b kills correct DUT at cyc 3; T2 full-length false PASS vs D4 (deliberate, honestly labeled); T3 `only 1114`; T4 = my depth+1 run, 101,500 from cyc 2; T5 both guards; C1 = 14; C2 = **9**/11 (see below); T6, T6b, T7 (`ed7e62ed/000` first injection), T8 (slots 12/13) — all verbatim.

**The three structural survivors are honest.** D3's reason (no same-edge reader anywhere in the system) is empirically true and survives my seed; D5's reason (valid-gated equivalence masks an ungated-fill bug) is demonstrated by the witness firing when I changed the shipped strategy; D8's reason (every reader behind a continuous-assign hop) is completed by the D7/D9 controlled contrast, which I reproduced. These are not excuses — each survivor comes with the exact witness that DOES catch its bug class, and I verified each witness fires. The four recorded false passes are all deliberate, labeled foil demonstrations, and all four reproduce.

**Totals audit:** 13 design runs + 13 harness runs = 26; 6+11 = 17 killed/guard-fired; 4 false passes; 3 survivors; 1 no-op; 1 control — the README's arithmetic checks out row by row.

**The one defect in this area:** `tb_stream.v`'s comment block (lines ~99–102) says the input-side screen qualifier "measured: 10 on the 2-stage pipe, 11 on the 4-stage." Measured twice by me on the shipped stimulus: **9** on the 2-stage (11 on the 4-stage). The chapter and the README's C2 row correctly say 9; the source comment carries the research pass's stale 10 (the notes' stimulus differed). One shipped document contradicts the other two about a measured number — exactly the defect class this project polices. One-token fix.

## Timing honesty

Audited line by line against the "no synthesis tool exists" wall. **No violation found.** Every ns figure in the chapter is simulated time on the testbench's declared 10 ns clock (VCD timestamps, `delta = 15 ns`), never a physical-timing claim. The flop counts (110/284/336/540) are declared-register counts and the chapter says so explicitly ("counts of registers the RTL declares", "No physical area or frequency figure is claimed"). The entire Fmax/critical-path/setup-hold/retiming discussion lives in one section that opens with the wall, labels its stage-depth ranking "reasoning, NOT measurement," attributes the FP-adder path structure to Muller and Ercegovac–Lang by name, closes with the "what a tool would report that cannot be known here" list, and even flags the reset-fanout cost aside in the reset section as documentation. The opening section and the closing checklist both restate the wall. This is the chapter most at risk of crossing it, and it does not.

Two wording-level nits, not violations:

1. "Cutting at the Priced Seams" states bank 1 sits "immediately after **the deepest front-half logic**" as flat fact; the identical claim in the timing section is properly hedged ("plausibly the longer"). No number is attached, and ch09 used the same phrasing, but for consistency the cut section should borrow the timing section's hedge or point at it.
2. The chapter's honest sentence — "we can prove this pipeline computes the right answer at some clock; we cannot name the clock" — is exactly right and worth keeping verbatim in ch12's sign-off.

## Transcripts, listings, craft

**Listings reconciled: the writer's "six" and the orchestrator's "five verilog fences" are both right.** The chapter has 16 fences: 5 `verilog`, 1 `python`, 10 plain transcript blocks. All five verilog fences are byte-identical contiguous slices of the shipped files (bank 1 and bank 2+valid from `fp32_add2_p2.v`, the slot task and the rr counter from `tb_stream.v`, the flag delay from `fp32_add4_tree_p.v` — verified by substring match on raw bytes). The sixth listing is the python VCD parser, which is shown in full and which I extracted and ran verbatim: output byte-identical to the chapter's.

**Transcripts.** Re-captured this session by me: both tb_stream PASS lines, tb_stream4's PASS line, tb_reset's quoted rows at both depths, tb_xinj's verdict, the VCD parse output, the blkprobe numbers and the 2121… string, the D1 FAIL triple (which is genuinely the first three FAIL lines, contiguous), `$display`/`$strobe` at t=55000, and the one-pulse/tear transcripts — all match verbatim. The scratch-probe transcripts are properly declared as scratch-side experiments in Sources item 1. **One undeclared abridgement:** "The 2-stage transcript, verbatim:" quotes 3 of the 9 lines tb_reset prints (the omitted six are repetitive steady-state rows plus the PASS line). The lines shown are verbatim, but "the transcript" implies completeness — add "(first three lines; the rest repeat the steady state)".

**Cross-references.** All quoted titles resolve: ch03 "Blocking and Non-Blocking, Derived From the Queue"/"Reset Strategy"/"What the Simulator Will and Will Not Tell You"; ch04 "Clock and Reset Without Racing Your Own Design"/"Checking, and Making Failure Impossible to Miss"/"Viewing Waveforms in 2026"; ch05 "The Green Run That Means Nothing"/"Coverage, and Building One by Hand"; ch08 "Round, and the Renormalize Random Never Finds"; ch09 "Cutting Along the Seams"/"Composition, and the Golden-Equivalence Sweep"/"X-Propagation…"/"What Cannot Be Known Without a Synthesizer"; ch10 "Flags Under Composition"/"Depth, Registers, and the Third Option". Ch10's bridge promises (2S stages, no balancing registers, 3S×32 delay matching, `#1`-and-check dies, bins re-timed) are all cashed. **Two positional cross-references survive:** "built two sections from here" (Stage Bank section) and "The next section measures why…" (Streaming-Equivalence section). The battery requires zero; replace with quoted titles. Minor: the sentence citing "Round, and the Renormalize Random Never Finds" is anchored on "Chapter 9's regression," inviting the reader to look for that section in ch09 when it lives in ch08.

**Craft numbers.** `wc -w` = 9,780, exactly as reported. 16/16 sections, marker correct. Eight manifest targets ✓, 8/8 in 61.8 s (README says 62.5 — noise), full repo 103/103 cold, exit 0. Sim-economy: my 10.2 s / 2.11 s reproduce the chapter's 10.0–10.2 s / 2.1 s; the "9.7k checks/s" for tb_single computes to 9.5–9.6k from my run — rounding drift, and the "same price per check" conclusion stands. Total-cycles claim (~102,1xx) matches my `$finish` at 102,116 cycles. Sources section: the two fetched URLs are the same two the research pass records, everything else is by-title per the project's citation rule; nothing invented.

**Closing checklist ("What You Should Be Able to Do Now"), item by item:** all ten bullets check against measurements I reproduced — including the 9/11/14-vs-12 quote (bullet 6, correct), 61.4 % (bullet 7), 110/284/2.6× (bullet 1), 336 vs 540 and latency 4 vs 6 (bullet 9 — my arithmetic: 3×110=330, +6 = 336; 330+192+18 = 540 ✓), and the three latency measurements (bullet 8). No bullet claims anything unverified.

**Ch12 seed accurate:** depth choice (three p2 units, latency 4, 336 bits, with the p4 alternative honestly gated on a synthesis target), valid-pipe-only reset with the legal-don't-care caveat, streaming regression with pinned stage-qualified bins and count guards, the foil kept as a foil, the vq[] enable/stall prototype note, and the D9 disposition (accurate to ch10's record; label collision noted above).

**README defect:** the reproduction block says `python3 parse_vcd.py /tmp/wave_ch11.vcd` "from this directory" — no `parse_vcd.py` ships anywhere in the repo; the command fails as written. Either ship the script in `src/ch11/` (it is 40 lines and already fully listed in the chapter) or say "save the chapter's listing as parse_vcd.py first."

## Research-note audit

Spot-checked eight note claims against the chapter and my runs; the notes and chapter tell one story with the differences properly owned — with one exception.

1. **C2 coverage count — the exception.** Notes §4: input-side qualifier gives "**10** on the 2-stage pipe and **11** on the 4-stage." Chapter and README: **9**/11. My measurement on the shipped stimulus, twice: **9**/11. The chapter silently corrected the research number (the stimulus evolved between passes) without any note, the research file carries no correction, and `tb_stream.v`'s comment still quotes the stale 10. Three documents, two numbers, all claiming measurement. Fix all three ends (comment → 9; a one-line correction note in the research file or the chapter).
2. **Skew kill counts.** Notes: 5,312 (3,926/1,169/217-X) over 101,139; chapter: 5,310 (3,909/1,152/249-X) over 101,111. Consistent re-measurement under the shipped stimulus; chapter quotes only shipped numbers, which my run confirms exactly. Clean.
3. **blk1.** Notes: 427/255-X over 101,139; chapter: 407/227-X over 101,111 — same pattern, chapter's numbers verified. The 2,1,2,1 probe numbers (999/999/1998) are identical in notes, chapter, and my independent probe. Clean.
4. **X injection.** Notes: 59.3 % (741/509); chapter: 61.4 % (767/483) with an explicit hedge naming the research split. Honest evolution. The hedge attributes the difference to "a different generator" — the notes describe the same within-30 regime, so the difference is more plausibly seed/probe internals; unverifiable now (scratch died), consider "a different seed and probe."
5. **Posedge-count definition.** Notes: "capturing posedges strictly *between* the two edges" — which would exclude the capture edge and read 1 and 3. Chapter: "strictly after the input edge, up to and including the result edge" (`t_pi < p <= te`), which is what the listed parser computes and what reproduces. The chapter silently fixed the notes' sloppy phrasing in the correct direction — worth a correction line in the notes so F1 doesn't quote the wrong form.
6. **blk2-in-tree luck.** Notes: "~400k streamed transactions across these runs"; chapter: the precise, shipped-run-only "202,130." Chapter is the more defensible number; not a contradiction.
7. **T3 message.** Notes: "only 1110 valid pairs driven"; shipped harness prints 1114 (stimulus grew by the adjacency block, minus overlap); chapter/README quote 1114, which I reproduced. Clean.
8. **Tree/sequential pricing and D6 details.** Notes' 336/540, latency 4/6, 192+18 delay bill match the chapter and my arithmetic; the notes' D6 first-kill example differs from the shipped run's (directed quads were reordered) and the chapter correctly uses only the shipped-run evidence. Clean.

No contradiction runs the dangerous direction (notes claiming more than the chapter). The chapter never quotes a research-pass number as a this-session measurement.

## Required changes for a 9+

Nothing blocking. In priority order:

1. **Fix the stale measured number in `src/ch11/tb_stream.v`** (comment, ~line 100): "measured: 10 on the 2-stage pipe" → **9**. The chapter and README say 9; the shipped stimulus measures 9 (verified twice). A shipped file asserting a wrong measured value is this project's cardinal defect class, even in a comment.
2. **Reconcile the C2 record across documents:** add one correction line to `research/ch11-pipelining.md` §4 (or a parenthetical in the chapter's coverage section) noting the research pass's 10 was under the pre-adjacency stimulus and the shipped stimulus measures 9. Two "measured" values for one experiment must not coexist uncommented.
3. **Fix the README reproduction command:** `python3 parse_vcd.py` references a file that does not ship. Either add `parse_vcd.py` to `src/ch11/` (the chapter already lists it in full — shipping it also future-proofs the byte-identity claim) or reword to "save the chapter's listing as parse_vcd.py".
4. **Declare the tb_reset abridgement:** "The 2-stage transcript, verbatim:" shows 3 of 9 lines. Add "(first three lines; the remaining rows repeat the steady state)" or an ellipsis line.
5. **Remove the two positional cross-references:** "built two sections from here" → name "The Streaming-Equivalence Harness"; "The next section measures why the streaming is not optional" → name "Skew, and the Other Four".
6. **Disambiguate D9 in the bridge:** "D9 — the latent `exact_zero` gate" → "chapter 10's D9", since this chapter's own README assigns D9 to a different mutation.
7. **Hedge or generalize the VCD byte count:** "costs 32,223 bytes" is path-dependent (the `dumpfile` plusarg reg is dumped, embedding the path; I measured 32,247 and 32,215 for two path lengths). Say "~32 KB" — or spend one sentence on the mechanism, which is a genuinely instructive ch04-style artifact.
8. *(Nit)* Align the cut section's "the deepest front-half logic" with the timing section's hedged phrasing ("plausibly the deepest").
9. *(Nit)* "9.7k checks per wall-clock second" for tb_single reads 9.5–9.6k from the shipped 2.1 s figure; either adjust or drop the second decimal of precision. The "same price per check" conclusion is unaffected.
10. *(Nit)* X-injection hedge: "a different generator" → "a different seed and probe" (the notes describe the same regime; the generator difference is unverifiable).

## Tree restoration proof

All mutation and probe work was done exclusively on copies in the session scratchpad (`…/scratchpad/ch11rev/mut/`); no file under `guide/src` was ever edited. Proof, run at the end of the battery:

- `sha256sum` over all 175 files under `guide/src`, diffed against the baseline captured before any run: **zero differences** ("SHA256: ALL 175 FILES IDENTICAL TO BASELINE").
- `git status --short` shows only ` M reviews/ch11-review.md` — this review, the round's deliverable (its skeleton was checkpoint-committed by the coordinator; my section fills are the modification). `git diff --stat HEAD -- src/` is empty.
- Harness cleanliness double-checked mid-battery: after the full 103-target regression, both streaming sweeps, and the plusarg VCD dump, `git status` remained clean and `src/ch11/` contained exactly its 12 committed files — nothing is written into the source tree by any run, confirming the chapter's claim.

Environment for the record: Icarus Verilog 13.0 (`iverilog -g2012 -Wall` + `vvp`) at /usr/local/bin, python3 3.11, Linux x86-64. Full regression: 103/103, exit 0. `run_all.sh ch11`: 8/8 in 61.8 s (tb_stream 10.2/10.6 s, tb_stream4 ~36 s, tb_single 2.11 s).

## Post-fix verification — 2026-08-21 (round 1 fixes, commit af5bb7f)

All ten required changes verified at their sites, each mechanically:

1. **tb_stream.v comment** now reads "measured: 9 on the 2-stage pipe under the shipped stimulus" — and I re-ran the C2 mutation against the *updated* file: `renorm fired 9`, so the shipped comment now matches measurement. The commit diff for `tb_stream.v` is comment-only (3 lines), and I re-extracted all five chapter verilog fences against the updated sources: **all five still byte-identical contiguous slices**, with the edited comment region outside every fence (asserted programmatically). The python fence is untouched.
2. **Research notes §4** carry the dated 2026-08-21 correction naming the pre-adjacency stimulus for the 10 and the shipped value 9; the 4-stage 11 correctly stands.
3. **README repro block** now states parse_vcd.py does not ship and to save the chapter's listing under that name first.
4. **tb_reset lead-in** reads "first three lines (the remaining rows repeat the steady state)" — abridgement declared.
5. **Both positional refs are quoted titles**, the second using the full section title "Skew, and the Other Four: Bugs That Pass a Weaker Harness"; a fresh grep finds zero remaining positional cross-references.
6. **Bridge** reads "chapter 10's D9 … (not this chapter's README row of the same name)".
7. **VCD cost** reads "~32 KB … (the exact byte count varies with the `+dump=` path, which is itself stored in the file)" — the mechanism sentence included, better than my minimum ask.
8. "plausibly the deepest front-half logic". 9. "about 10k versus 9.5k checks per wall-clock second". 10. "a different seed and probe".

I diffed every changed line of the fix commit (16 chapter lines, 5 research, 5 README, 6 tb_stream.v): each is exactly the requested fix, no collateral content changes; the only `src` files that differ from my review baseline are `src/ch11/tb_stream.v` and `src/ch11/README.md` (SHA-256 diff), so no design RTL moved. Post-fix, my own cold full-repo regression: **103/103, exit 0**, including both tb_stream targets built from the edited file.

**Word count of record: `wc -w chapters/ch11.md` = 9,829** (up from 9,780 pre-fix; the coordinator's reported 10,020 does not reproduce with plain `wc -w` on the chapter file — 9,829 is my measured number, stated here as the number of record per request).

**Final score: 9/10.** All defects from round 1 are fixed and verified at their sites; every load-bearing measurement in the chapter reproduced under my own recompiles, probes, and seed; nothing remains but matters of taste.
