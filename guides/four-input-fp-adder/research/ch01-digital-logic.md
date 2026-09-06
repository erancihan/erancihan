# Chapter 1 Research Notes — Digital Logic Foundations

<!-- sections complete: 7/7 -->

## 1. From transistor to gate

- **MOSFETs as switches.** NMOS conducts on a HIGH gate; passes a strong 0, degraded 1 -> belongs in the **pull-down net** (to GND). PMOS conducts on a LOW gate; strong 1, degraded 0 -> **pull-up net** (to V_DD). "NMOS pulls low, PMOS pulls high" is the whole rule and dictates everything below.
- **CMOS inverter, 2 transistors.** PMOS above, NMOS below, gates tied to the input. In=0 -> PMOS on, out = V_DD. In=1 -> NMOS on, out = GND. The nets are complementary and mutually exclusive, so no steady-state DC path V_DD->GND: static power ≈ leakage, dynamic power = CV²f. That is why CMOS won.
- **Duality forces inversion.** PDN and PUN are duals — series in one, parallel in the other. The two networks recognise the *same* input condition but act oppositely, and they are **never conducting at the same time**: for any input pattern exactly one network is on, which is why a static CMOS gate draws no steady-state current. Because the network that recognises the condition is the pull-*down* net, every single-stage static CMOS gate built this way is **inverting**. No cheap non-inverting primitive exists. (Corrected 2026-08-09: an earlier draft of this note said "Both conduct on the asserted condition", which is false — simultaneous conduction is a short from V_DD to GND and only happens transiently during a switching event.)
- **NAND/NOR are the primitives.** NAND2 = NMOS in **series**, PMOS in **parallel**, 4T. NOR2 = NMOS in **parallel**, PMOS in **series**, 4T. AND2 = NAND2 + inverter = 4+2 = **6T**; OR2 = **6T**. Counts: INV 2, NAND2 4, NOR2 4, AND2 6, OR2 6, NANDk/NORk 2k.
- **XOR2 is expensive**: ~**12T** static complementary CMOS (complex gate + two input inverters for A', B'); ~6-8T with transmission gates at reduced drive. Flag the style-dependence rather than asserting one number — XOR is the workhorse of adders (section 3).
- Consequence: the "AND gate" in the reader's Verilog is a fiction. Cell libraries are dominated by NAND/NOR/AOI/OAI, and synthesis pushes inversions around (bubble pushing) to delete inverters.
- **Functional completeness.** {NAND} alone: NOT(A)=NAND(A,A); AND(A,B)=NAND(NAND(A,B),NAND(A,B)); OR(A,B)=NAND(A',B'). {NOR} alone, dually: NOT(A)=NOR(A,A); OR=NOT(NOR); AND(A,B)=NOR(A',B'). {AND,OR} alone is **not** complete — monotone, no way to complement. Sheffer stroke = NAND; Peirce arrow = NOR.
- **Why NAND beats NOR in a PMOS-weak process.** Hole mobility is ~2-3x below electron mobility, so a PMOS needs ~2-3x the width for equal drive. Series stacking multiplies resistance and adds internal node capacitance, so stack delay grows worse than linearly. NAND2 puts the series stack in the **strong** NMOS net and the parallel arrangement in the **weak** PMOS net — parallelism exactly where needed. NOR2 does the reverse and needs very wide PMOS to match, costing area and input capacitance. Hence NAND-dominant logic is smaller and faster, and stacks deeper than 3-4 are avoided.
- Seed for later: gate delay is not a constant — it depends on stack depth, input capacitance presented, and load driven. Basis for fan-in/fan-out in section 4.

## 2. Boolean algebra

- **Axioms (Huntington), dual pairs.** Identity A+0=A | A·1=A. Null A+1=1 | A·0=0. Idempotence A+A=A | A·A=A. Complement A+A'=1 | A·A'=0. Involution (A')'=A. Commutative, associative, distributive — **both** distributive laws hold, so A+(B·C) = (A+B)·(A+C). That one surprises programmers.
- **Key identities.** Absorption A + A·B = A | A·(A+B) = A. Redundancy A + A'·B = A + B. **Consensus** A·B + A'·C + B·C = A·B + A'·C — the B·C term is redundant, and is exactly what you *add back* to kill a static hazard (section 4). **Shannon expansion** F = A·F(A=1) + A'·F(A=0) — the identity behind "a mux is universal" (section 3).
- **De Morgan.** (A·B)' = A'+B'; (A+B)' = A'·B'; generalises to n inputs. Circuit reading ("bubble pushing"): NAND *is* an OR with inverted inputs, NOR *is* an AND with inverted inputs; pushing a bubble through a gate flips AND<->OR. Payoff: 2-level AND-OR becomes NAND-NAND with no extra gates, OR-AND becomes NOR-NOR. That is how an SOP expression turns into a real netlist (section 1).
- **Duality.** Swap AND<->OR and 0<->1, leave variables alone; the dual of a theorem is a theorem. Duality is **not** complementation — De Morgan also complements the literals, duality does not. Beginners conflate them.
- **Minterms/maxterms.** n variables -> 2^n minterms. m_i is the AND term true only for combination i (variable uncomplemented if its bit is 1). M_i is the OR term false only for combination i (uncomplemented if its bit is **0** — the inversion trips people up). Canonical SOP = OR of minterms where F=1; canonical POS = AND of maxterms where F=0; m_i' = M_i, so F = Σm(S) = ΠM(S-complement). Canonical forms are unique — a proof device, not an implementation target.

**Worked 4-variable K-map.** F(A,B,C,D) = Σm(0,1,2,5,6,7,8,9,10,14) = ΠM(3,4,11,12,13,15).

Truth table (m: ABCD -> F): 0:0000->1, 1:0001->1, 2:0010->1, 3:0011->0, 4:0100->0, 5:0101->1, 6:0110->1, 7:0111->1, 8:1000->1, 9:1001->1, 10:1010->1, 11:1011->0, 12:1100->0, 13:1101->0, 14:1110->1, 15:1111->0.

```
          CD=00   01    11    10
  AB=00  |  1  |  1  |  0  |  1  |   (m0  m1  m3  m2)
  AB=01  |  0  |  1  |  1  |  1  |   (m4  m5  m7  m6)
  AB=11  |  0  |  0  |  0  |  1  |   (m12 m13 m15 m14)
  AB=10  |  1  |  1  |  0  |  1  |   (m8  m9  m11 m10)
```

- Gray ordering is the point: adjacent cells differ in one variable, so a group of 2^k adjacent cells cancels k variables. Edges wrap (torus), so m0/m2/m8/m10 are mutually adjacent.
- *All prime implicants* (machine-enumerated, checked): B'C'={0,1,8,9}; B'D'={0,2,8,10} (four corners); CD'={2,6,10,14}; A'BC={6,7}; A'BD={5,7}; A'C'D={1,5}.
- *Essential*: **B'C'** (m9 covered by nothing else) and **CD'** (m14 covered by nothing else). **B'D' is prime but not essential** — all four corners are already covered. Cleanest possible PI-vs-EPI illustration; teach it on this map. Only m5 and m7 then remain, and A'BD covers both in one term.
- **Minimised SOP: F = B'C' + CD' + A'BD** — 3 terms, 8 literals, verified equal on all 16 inputs. Canonical SOP would be 10 terms / 40 literals: that ratio is the sales pitch.
- **PI vs EPI generally.** An *implicant* implies F. A *prime* implicant cannot be enlarged (no literal droppable) — a maximal legal rectangle. An *essential* PI uniquely covers some minterm, so every minimum cover contains it. Procedure: take all essentials, then solve a **covering problem** over what remains — where cyclic covers and Petrick's method live.
- **Quine-McCluskey = the algorithm.** Group minterms by popcount, repeatedly combine pairs differing in one bit; terms that never combine are the PIs. Then build the PI chart, extract essentials, solve minimum cover. Exact, and usable past the 4-5 variables where K-maps become unreadable — but PI count grows roughly as 3^n/n and the covering step is set-cover (NP-hard). Real tools run **Espresso**-style heuristic two-level minimisation, and for real designs multi-level optimisation and technology mapping instead. Say this early (section 7).
- **Don't-cares.** Mark combinations that cannot occur or are never observed; treat as 1 or 0, whichever enlarges groups. Concrete shrink here: add d(3,11) and {0,1,2,3,8,9,10,11} becomes legal (verified) = the single literal **B'**, so F = **B' + CD' + A'BD** — B'C' loses a literal free and B'D' vanishes. Real sources: unused BCD codes 1010-1111, unreachable one-hot states, outputs gated off by a valid bit. Warning: in Verilog `x` is a *promise* to the tool; if the "impossible" case occurs, simulation and synthesis diverge.

## 3. Combinational building blocks

- **Mux.** 2:1: Y = S'·D0 + S·D1 (often transmission gates, ~6T). n:1 needs log2(n) selects; built as decoder + AND-OR array, or as a **tree of 2:1 muxes**, log2(n) deep. **Universal element**: a 2^n:1 mux with the variables on the selects and the truth-table column on the data inputs implements *any* n-variable function — Shannon expansion in hardware. FPGA hook: a 6-input LUT is literally a 64:1 mux over 64 stored bits.
- **Decoder.** n-to-2^n, one output asserted; output i *is* minterm m_i. Uses: one-hot state decode, memory word-line select, SOP construction by OR-ing outputs.
- **Encoder / priority encoder.** A plain encoder is defined only for one-hot input — two asserted inputs give garbage, all-zero is indistinguishable from input 0, hence a separate `valid`. A **priority encoder** returns the index of the highest-priority asserted input plus `valid`, well defined for any pattern. 4-to-2, D3 highest: valid = D3+D2+D1+D0; Y1 = D3 + D2; Y0 = D3 + D2'·D1.
  - **Payoff:** a leading-zero detector / CLZ unit *is* a priority encoder over the mantissa. After effective subtraction the result may have many leading zeros; normalisation left-shifts by that count and decrements the exponent by the same. Chain: priority encoder -> shift amount -> barrel shifter -> exponent adjust.
  - Forward pointer only: a naive priority chain is O(n), so real designs use a **leading-zero anticipator** computing the shift in parallel with the subtraction.
- **Magnitude comparator.** Equality = NOR of bitwise XORs, O(log n). Greater-than looks serial (scan from MSB, first difference decides) and that recurrence *is* a carry chain: the ordering of A and B falls out of the carry-out of A - B. **Compare and subtract are the same hardware.** For an n-bit unsigned compare built as `A + ~B + 1`, with `eq` = the zero-detect (NOR of all difference bits):
  - `cout = 1` means `A >= B`
  - `A == B` is `eq`
  - **strict `A > B` is `cout AND NOT eq`** — not `cout AND eq`, which computes `A == B`
  - `A < B` is `NOT cout`; `A <= B` is `NOT cout OR eq`
  (Corrected 2026-08-09: an earlier draft of this note implied greater-than is the raw carry-out. All five relations verified exhaustively at 4, 5 and 8 bits against Python's own operators.)
  Payoff: exponent comparison picks the larger operand and yields the alignment shift |E_a - E_b|.
- **Half adder.** S = A XOR B, Cout = A·B. Only for the LSB or inside carry-save trees.

**Full adder**

| A | B | Cin | Cout | S |
|---|---|-----|------|---|
| 0 | 0 | 0 | 0 | 0 |
| 0 | 0 | 1 | 0 | 1 |
| 0 | 1 | 0 | 0 | 1 |
| 0 | 1 | 1 | 1 | 0 |
| 1 | 0 | 0 | 0 | 1 |
| 1 | 0 | 1 | 1 | 0 |
| 1 | 1 | 0 | 1 | 0 |
| 1 | 1 | 1 | 1 | 1 |

- **S = A XOR B XOR Cin** (parity). **Cout = A·B + A·Cin + B·Cin** (majority). Equivalents: A·B + (A XOR B)·Cin = A·B + (A+B)·Cin; the middle form leads straight to generate/propagate. Cost: the static CMOS **mirror adder is 24 transistors**, arranged so Cin->Cout crosses one inverting stage; gate-composition versions run nearer 28T.

- **Ripple-carry adder.** n full adders chained; area O(n), delay **O(n)** — worst path LSB Cin to MSB Cout, triggered by a full-width propagate (0xFFFF + 0x0001). At ~2 gate delays/stage a 24-bit mantissa RCA is ~48 gate delays. That motivates everything below, and the FP mantissa add sits between alignment and normalisation, exactly where O(n) is unaffordable. Note `assign sum = a + b;` lets the tool pick *any* structure — RCA is what area pressure yields, not what `+` means.
- **Carry-lookahead adder.** Per bit **g_i = a_i AND b_i** (generates a carry regardless of Cin), **p_i = a_i XOR b_i** (propagates one). Recurrence **c_{i+1} = g_i + p_i·c_i**. XOR (not OR) is chosen for p_i so the same signal forms **s_i = p_i XOR c_i**; both choices give identical carries, differing only when a_i = b_i = 1 where g_i already forces it. Unrolled for 4 bits:
  - **c1 = g0 + p0·c0**
  - **c2 = g1 + p1·g0 + p1·p0·c0**
  - **c3 = g2 + p2·g1 + p2·p1·g0 + p2·p1·p0·c0**
  - **c4 = g3 + p3·g2 + p3·p2·g1 + p3·p2·p1·g0 + p3·p2·p1·p0·c0**
  - Block cost: 1 level for g/p, 2 for the AND-OR carry net, 1 XOR for the sum — roughly constant regardless of width. The catch is fan-in: a flat 32-bit CLA would need a 33-input OR. Fix with **block generate/propagate** — G = g3 + p3·g2 + p3·p2·g1 + p3·p2·p1·g0, P = p3·p2·p1·p0, c4 = G + P·c0 — and a second-level unit treats (G,P) exactly like (g,p). Depth O(log n), area O(n log n). Generalises to the **parallel-prefix** family (Kogge-Stone, Brent-Kung, Sklansky, Han-Carlson), the standard answer for a fast 24- or 28-bit mantissa adder.
- **Carry-select adder.** Compute the high half twice, once per assumed carry-in, then mux when the real carry arrives. Delay ~O(sqrt(n)) with increasing block sizes, ~2x area on duplicated blocks. Area and power bought latency.
- **Carry-save adder / 3:2 compressor.** The expensive part is carry *propagation*, so don't propagate. Three n-bit operands -> two, in constant time independent of n: S_i = X_i XOR Y_i XOR Z_i; C_i = majority(X_i,Y_i,Z_i) = X_i·Y_i + X_i·Z_i + Y_i·Z_i, used **shifted left by one**. Invariant **X + Y + Z = S + 2C**. Every bit slice is an independent full adder with **no horizontal connection** — one full-adder delay, forever.
  - **Key trick for multi-operand addition — flag explicitly for chapter 10.** Four mantissas: two CSA levels reduce 4 operands to 2 (or one 4:2 compressor, itself two full adders), then *one* carry-propagate adder finishes. One expensive carry propagation regardless of operand count. Wallace/Dadda trees are the systematic version.
  - Caveat up front: carry-save needs aligned fixed-point values, so a four-input FP adder must align to a common exponent *before* the tree, and rounding can only follow the final carry-propagate add. That shapes the chapter-10 datapath.
- **Barrel shifter.** Arbitrary combinational shift/rotate from **log2(n) stages of 2:1 muxes**; stage k passes through or shifts by 2^k under bit k of the shift amount. n=32 -> 5 stages, 32 muxes each = 160 muxes, depth 5. Versus an iterative shift register (n cycles): area bought a single-cycle result. **Two FP payoffs**: alignment (right-shift the smaller significand by |E_a - E_b|) and normalisation (left-shift by the leading-zero count), both usually on the critical path. Flag now: the alignment shift must not silently drop bits — guard/round/sticky are collected during it, sticky being the OR of everything shifted past.

## 4. Timing and delay

- **t_pd (propagation)** = *maximum* time until **all** outputs have settled. Upper bound; governs setup / f_max. **t_cd (contamination)** = *minimum* time until **any** output starts to change. Lower bound; governs hold. Always t_cd <= t_pd, and between them the output is officially garbage. Both are extremes over all transitions, rise/fall and PVT corners — sign-off uses a slow corner for setup, a fast corner for hold. There is never one number. Mnemonic: t_pd = "how late can it be right", t_cd = "how early can it go wrong".
- **Gate delay** is RC charging: t_pd ≈ R_driver · C_load. Delay depends on *what you drive*, not just the gate.
- **Wire delay.** Distributed R and C make delay grow roughly with the **square of length** (Elmore ≈ 0.5·R·C·L² for a uniform line) — doubling length roughly quadruples delay. Fix: **repeater insertion**, restoring linearity at area/power cost.
- **Why wires dominate.** Scaling shrinks transistors (gates faster) but wires get thinner and closer (resistance and coupling capacitance up), and global wire length does not shrink — a chip-crossing wire is still a chip wide. Since roughly the 250-180 nm nodes, interconnect has dominated global-net delay. FPGA version, the one that matters here: LUT delay is fixed and small, **routing delay is variable and often the majority of a path**. Identical logic can have very different f_max after place-and-route. Never estimate FPGA timing by counting LUT levels.
- **Fan-in** = inputs per gate. High fan-in means deep series stacks (section 1): super-linear delay and more input capacitance. Practical limit ~4; beyond that the tool decomposes into a log-depth tree. Exactly why flat CLA carry equations get blocked into 4-bit groups.
- **Fan-out** = gate inputs driven by one output. Each load adds capacitance, so **delay grows roughly linearly with fan-out**: t_pd = t_parasitic + k·(fan-out), or logical-effort form d = g·h + p with h = C_out/C_in. High-fan-out nets (clocks, resets, enables, broadcast selects) need **buffer trees**; FPGAs supply dedicated global clock networks for this. Logical effort gives an optimal per-stage effective fan-out of ~3-4 — cite as a pointer, do not derive.
- **Critical path** = longest register-to-register combinational path. It alone sets f_max, so improving anything else changes nothing — the single most important optimisation lesson in the book. **Logic depth** (gate levels) is a ranking proxy only; it ignores fan-out, wiring and sizing. Near-critical paths matter too — fixing the top path just promotes the next, hence slack histograms. Forecast: the FP adder's likely critical path is exponent compare -> alignment shifter -> significand add -> leading-zero detect -> normalisation shifter -> round -> possible post-round renormalise. All section-3 blocks, and the reason chapter 11 pipelines it.
- **Hazards vs glitches.** A *hazard* is the possibility of a spurious transition from unequal path delays; a *glitch* is an observed one.
  - **Static-1**: should stay 1, dips to 0. Classic in SOP (AND-OR).
  - **Static-0**: should stay 0, pulses to 1. Dual, classic in POS (OR-AND).
  - **Dynamic**: the intended single transition happens but the output changes three or more times (0->1->0->1). Needs three or more unequal paths; a multi-level-logic phenomenon.
- **Concrete static-1 glitch.** F = A·B + A'·C with B = C = 1, so F = A + A' = 1 always. Build it literally (inverter, two ANDs, one OR), 1 ns per gate, drop A from 1 to 0 at t=0: A·B falls to 0 at t = 1 ns; A' rises at 1 ns so A'·C only rises at 2 ns; between 1 and 2 ns both AND outputs are 0, so the OR dips to 0 for ~1 ns. Map view: the two implicants are adjacent but do not overlap and the transition crosses the boundary. **Fix = add the consensus term B·C**, giving F = A·B + A'·C + B·C, which holds the output high while the other terms swap over. Note the irony — minimisation *creates* hazards, hazard removal deliberately adds redundancy, and an area-driven synthesizer will strip the consensus term back out.
- **Why glitches are usually harmless.** In a **synchronous** design, combinational outputs are only sampled at a clock edge, so a glitch that settles before the setup window is invisible: correctness depends on the value being stable in the setup/hold window, not on how it got there. That is the central reason synchronous design won — a timing problem reduced to one inequality. Not free, though: every spurious transition burns dynamic power, and glitch power is significant in deep arithmetic trees.
- **Where glitches are fatal** (the practical takeaway):
  - **Asynchronous / self-timed logic**, where the signal *is* the event.
  - Anything driving an **asynchronous reset** — a glitch resets real state and violates recovery/removal timing unrecoverably. Never build an async reset from combinational logic; synchronise its deassertion.
  - Anything driving a **clock** (gated clocks, dividers, clocks made of AND gates). A glitch is an extra clock edge and the whole domain advances spuriously. Use a vendor clock-gating cell or a flip-flop clock enable.
  - **Latch enables** — a transparent latch passes the glitch into state.
  - Edge detectors, counter enables, pulse generators, FIFO pointer increments, off-chip asynchronous interfaces.
- Framing: "glitches are harmless" describes a *correctly constructed synchronous design*, not a property of logic. The moment a combinational signal is treated as an event rather than a value, the guarantee is gone.

## 5. Sequential elements and timing constraints

- **D latch** (level-sensitive): **transparent** while enable is asserted (Q follows D), holds when it drops. State changes over an *interval*. **D flip-flop** (edge-triggered): samples D only at a clock edge, holds the rest of the cycle. State changes at an *instant*. A flip-flop is two latches in a **master-slave** pair on opposite clock phases, so no transparent window spans the cycle — the honest answer to "what is a flip-flop made of". Trade: a latch is ~half the area and permits *time borrowing* across its transparent window; a flip-flop is far easier to reason about, so beginners and nearly all FPGA designs use flip-flops.
- **Why beginners accidentally infer latches** (the top Verilog beginner bug — box it): an `always @(*)` block that does not assign an output on **every** path implies "hold the old value", and holding needs memory -> the tool builds a latch. Causes: `if` without `else`; `case` without `default` and not fully enumerated; assignment in only some branches; a stale manual sensitivity list. Fixes: default-assign at the top of the block, always write `else` and `default`, use `always_comb`, and **read the synthesis log** — Vivado (UG901) and every other tool report inferred latches by name and width because they are normally a mistake. Symptom profile: plausible simulation, odd timing failures, simulation/synthesis mismatch. Teach reading the log, not just the waveform.
- **Parameters.** **t_setup**: D stable this long *before* the edge. **t_hold**: stable this long *after*. Together they bound the **aperture window** in which D must not move. **t_cq (clock-to-Q)**: edge to Q settling, with max (t_pcq) and min (t_ccq) versions — setup uses max, hold uses min.

**Setup constraint / maximum frequency: T_clk >= t_cq + t_logic_max + t_setup + t_skew**

- Read: source flop takes t_cq, the cloud up to t_logic_max, data must land t_setup before the capture edge — and the capture clock may arrive early by t_skew. So f_max = 1 / (t_cq + t_logic_max + t_setup + t_skew), and t_logic_max is the section-4 critical path, the only term RTL really controls. Setup slack = T_clk minus that sum; negative = violation.
- **Fixable by slowing the clock**, and also by pipelining, retiming, restructuring (RCA -> CLA) or better placement. This inequality is exactly why pipelining works: splitting one long cloud into k stages lets T_clk approach the longest *stage*, at k cycles of latency and k register banks. Throughput up, latency up, area up.

**Hold constraint: t_cq + t_logic_min >= t_hold + t_skew**

- Read: data launched by an edge must not race through the logic and corrupt the destination before that same edge's hold window closes. Uses **minimum** delays (t_ccq, contamination) at the **fast** corner.
- **T_clk does not appear.** Therefore **hold violations cannot be fixed by slowing the clock** — it is a race between data and clock within one edge, and a slower clock does not slow the data path. A hold violation is broken at every frequency, including 1 Hz. Fixes: *add* delay to the short path, reduce skew, fix the clock tree. FPGAs usually fix hold automatically during routing, which is why beginners rarely meet it and are then blindsided at a clock-domain crossing. Worst offenders: **zero-logic paths** (flop directly feeding flop), where t_logic_min = 0.
- **Metastability.** D transitioning inside the aperture can leave the flop metastable: the internal node sits near the switching threshold and resolves after an *unbounded* time to an *unpredictable* but valid level. It cannot be designed away — no circuit samples a truly asynchronous signal with a bounded decision time. This is a fundamental result, not an engineering shortfall; you can only make failure arbitrarily improbable. Resolution is exponential: the probability of still being unresolved after t falls as e^(-t/τ), with τ the flop's regeneration time constant (picoseconds in a modern process).
- **MTBF = e^(t_r / τ) / (T_w · f_clk · f_data)** — t_r = resolution time available (≈ T_clk - t_setup for a two-flop synchronizer, ≈ (k-1)·T_clk - t_setup for k stages); τ = resolution time constant; T_w = metastability window width; f_clk = sampling rate; f_data = asynchronous transition rate. Vendors write the same relation as e^(t_r/C2) / (C1·f_clk·f_data) with C1, C2 characterised per device family, and report MTBF from the timing tool. **The intuition: t_r is in an exponent, everything else is linear.** A couple of hundred extra picoseconds of settling can move MTBF by orders of magnitude; halving f_data barely helps. The answer is always "give it more time", never "use a faster flop".
- **Two-flop synchronizer**: two flip-flops in series on the destination clock with **no logic between them**, so FF1 gets a full period to resolve before FF2 samples. Rules: single-bit control signals only — a multi-bit bus must **not** be synchronized bit-by-bit, since bits resolve independently and the receiver can observe a value that never existed (use Gray coding, a handshake, or an async FIFO); never insert logic between stages, it eats t_r; add a third stage at high clock rates, each stage multiplying MTBF by roughly e^(T_clk/τ). Costs 1-2 cycles of latency and loses exact arrival-time information — short source pulses can be missed entirely, hence toggle/pulse synchronizers.
- **Skew** is *spatial*: arrival-time difference between two points, from unequal tree paths, loads and across-die PVT. Deterministic and largely static per layout. It hurts setup when the capture clock is **early** and hurts hold when it is **late** — it appears in both inequalities with opposite meaning, and can actually *help* setup on a path (useful skew) while worsening hold on that same path. Mitigation: balanced trees, H-trees, meshes; on FPGAs the dedicated global clock networks. "Use the global clock resources" is a real rule, not tool trivia.
- **Jitter** is *temporal*: cycle-to-cycle edge variation at one point, from PLL/supply/thermal noise. Random, so it is budgeted into the setup inequality; tools fold skew and jitter together as **clock uncertainty**.
- Framing: the clock is not an ideal global instant. It is a physical signal with delay, spread and noise, and every constraint here is an admission of that.

## 6. Number representation preview

- **Unsigned binary.** n bits cover 0 .. 2^n - 1; value = Σ b_i·2^i. Overflow = carry-out of the MSB; in Verilog capture it by widening (`{cout, sum} = a + b;`) since a truncating assignment discards it silently.
- **Two's complement.** Value = -b_{n-1}·2^{n-1} + Σ_{i<n-1} b_i·2^i — the MSB carries **negative weight**; it is a weight, not a flag. Negation = **invert all bits and add 1**. Verified 8-bit: +5 = `00000101`; invert -> `11111010`; +1 -> `11111011` = -5 (check: -128+64+32+16+8+2+1 = -5).
- **Why hardware likes it**: exactly one zero, and **one adder serves add and subtract**. A - B = A + (~B) + 1, so subtraction is the same adder with B inverted by n XOR gates driven by a `sub` line, carry-in tied to that same line. One control bit is the entire cost of subtraction. Verified 4-bit 5 - 3: `0101` + `1100` + `1` = `1 0010`; discard the carry-out -> `0010` = +2. The discarded carry-out is **not** an error — signed overflow is flagged when carry-in to the MSB differs from carry-out of the MSB (equivalently, same-signed operands yielding the opposite sign). The section-3 comparator falls out of the same hardware.
- **Range asymmetry.** -2^(n-1) .. +2^(n-1) - 1, one more negative than positive: 4-bit -8..+7, 8-bit -128..+127. Verified consequence: negating the most negative value overflows to itself — invert(`10000000`) = `01111111`, +1 = `10000000` = -128 again. `abs(INT_MIN)` is negative. Good hook: the reader has probably met this as a software bug.
- **Sign extension.** Widen by **replicating the MSB**. Verified: 4-bit -5 = `1011` -> 8-bit `11111011`. Zero-extension is right for unsigned, wrong for signed — a routine Verilog bug, since `reg [7:0]` is unsigned by default and one unsigned operand makes the whole expression unsigned. Use explicit `$signed()` or explicit replication `{{4{x[3]}}, x}`.
- **Sign-magnitude.** A dedicated sign bit plus an unsigned magnitude. 8-bit +5 = `0_0000101`, -5 = `1_0000101` (0x85) — only the sign bit differs. Properties: **two zeros**, symmetric range (-127..+127), and **no single-adder trick** — addition needs a magnitude comparison, an add-vs-subtract decision, smaller-from-larger subtraction, then sign derivation. Which is why integer hardware abandoned it. (One's complement with end-around carry: a historical dead end, one sentence.)

**CRITICAL CONTRAST: IEEE 754 is sign-magnitude, not two's complement**

- IEEE 754-2019 binary32: **1 sign | 8 biased exponent (bias 127) | 23 stored significand bits**, implicit leading 1 for normals. The significand is a **magnitude** with the sign held separately; the exponent uses a **bias** — a third encoding again, neither two's complement nor sign-magnitude.
- Verified bit-exact:
  - +5.0 = `0 10000001 01000000000000000000000` = 0x40A00000
  - -5.0 = `1 10000001 01000000000000000000000` = 0xC0A00000
  - They differ in **exactly one bit**. Under two's complement, +5 (`00000101`) and -5 (`11111011`) share almost nothing. Put these side by side — clearest possible demonstration. Second pair, same shape: +0.15625 = 0x3E200000, -0.15625 = 0xBE200000.
- Three consequences driving chapters 8 and 9:
  1. **Effective operation != requested operation.** Compute `effective_sub = sign_a XOR sign_b`. Adding opposite signs is a magnitude *subtraction*; subtracting a negative is a magnitude *addition*. Both `a+b` and `a-b` map to either, depending on operand signs.
  2. **Result sign is a separate computation.** Two's complement gives the sign free; sign-magnitude needs to know **which magnitude is larger** to produce a positive result and set the sign — hence the magnitude comparator and the operand swap in the datapath. Equal magnitudes give zero, and IEEE 754 fixes that zero's sign by rounding mode (+0 in every mode except round-toward-negative, where it is -0). That rule exists *only* because the format is sign-magnitude.
  3. **Catastrophic cancellation.** Subtracting nearly equal magnitudes annihilates the leading bits, leaving many leading zeros needing a large left shift — the section-3 leading-zero-detector -> barrel-shifter path, and the reason guard/round/sticky bits and the two-path (close/far) architecture exist. Two's complement hardware never faces this because it never renormalises.
- Also flag: because the exponent is biased and sits above the significand, two *positive* floats compare correctly as unsigned integers; negative floats break that ordering — again a direct consequence of the sign-magnitude layout. Useful for testbenches, and a payoff to promise.
- Bias arithmetic: adding two biased exponents double-counts the bias, subtracting cancels it. So E_a - E_b is bias-free and the alignment shift amount needs no correction.

## 7. Pedagogical hazards

What a competent programmer with zero hardware background reliably gets wrong. Each deserves an explicit callout.

- **Treating Verilog as sequential code.** `always`, `if` and `=` look like a programming language and are not. Everything in an `always @(*)` block exists simultaneously and permanently; nothing "runs". A `for` loop unrolls into replicated hardware at elaboration. Related: blocking `=` vs non-blocking `<=` (use `<=` in clocked blocks, `=` in combinational ones, never mix), and the fact that all `always @(posedge clk)` blocks sample the *old* values, so file order is irrelevant.
- **Confusing description with construction.** Verilog *describes* a circuit the designer already has in mind. Sketch the datapath before typing.
- **Thinking gates evaluate instantly.** Delays exist, are unequal, and outputs are garbage between t_cd and t_pd. Zero-delay simulation teaches the wrong intuition — Icarus shows clean waveforms for circuits that can never meet timing.
- **Believing a K-map minimization is what the synthesizer does.** Two-level SOP minimisation is a teaching device; tools do multi-level optimisation, technology mapping onto a cell library or LUT architecture, and timing-driven restructuring. A minimal-literal expression is frequently neither fastest nor smallest.
- **Assuming the tool implements exactly what was written.** It deletes unused logic, merges duplicate registers, retimes, restructures adders, replicates high-fan-out drivers, and infers block RAM or DSP blocks from recognised patterns. Reading the synthesis report is a core skill.
- **Confusing latch and flip-flop**, and inferring latches via incomplete `if`/`case`. Symptoms are timing weirdness and simulation/synthesis mismatch, not obvious failure. Prescribe default assignments, mandatory `else`/`default`, `always_comb`, and reading latch-inference warnings.
- **Assuming a faster clock is always achievable.** f_max is set by the critical path; the fix is architectural, not a constraint-file edit.
- **Assuming every timing problem yields to a slower clock.** Hold violations do not — T_clk is absent from the hold inequality, so a hold violation is broken at any frequency.
- **Confusing latency and throughput.** Pipelining raises throughput and makes absolute latency *worse*. Beginners call it "faster" then are confused that results take more cycles.
- **Thinking two's complement applies to IEEE 754 mantissas.** It does not — sign-magnitude significand, separate sign bit, biased exponent. Effective subtraction, operand swapping, result-sign derivation, signed zero and cancellation all follow. A reader carrying two's complement intuition into chapter 8 will write a subtly wrong adder that passes easy tests.
- **Assuming FP addition is associative.** Commutative (NaN payload details aside) but **not** associative: (a+b)+c != a+(b+c). Precisely why a four-input FP adder is an interesting problem rather than three chained two-input adders, and why a multi-operand design must define its own rounding and will not bit-match a naive chain. Set this expectation before chapter 10.
- **Deferring rounding.** Guard, round and sticky bits set the width of every upstream datapath element. Retrofitting them is a rewrite.
- **Trusting a friendly testbench.** Zeros and signed zeros, subnormals, infinities, NaNs, maximum-magnitude values and exact rounding ties are where FP designs break. Randomised comparison against a reference model plus directed corner cases.
- **Treating `x` and `z` as debugging noise.** `x` is a real modelling state, and an `x` reaching a comparison silently yields false. Simulation `x` semantics are pessimistic in some places and optimistic in others relative to hardware.
- **Estimating FPGA delay by counting gate levels.** Routing frequently dominates.
- **Building clocks or asynchronous resets from combinational logic.** A glitch on either is fatal (section 4). Use clock enables and synchronised reset deassertion.
- **Synchronizing a multi-bit bus with per-bit two-flop synchronizers.** Bits resolve independently, so the receiver can see a value never sent. Gray code, handshake, or async FIFO.
- **Simulation-only habits**: `#delay`, `initial` blocks for state init, `$display`-driven reasoning, multi-driver nets. Icarus Verilog is a simulator, not a synthesizer, and accepts much unsynthesizable code — say so the first time Icarus appears.

**Misleading simplifications to avoid making**
- "A gate has a fixed delay." Depends on load, drive strength, stack depth, PVT corner.
- "Glitches don't matter." Only inside a correctly built synchronous design; see the section-4 exception list.
- "AND and OR are the basic gates." NAND and NOR are; AND and OR each cost an extra inverter.
- "Minimal Boolean expression = best circuit." Only under a two-level equal-cost-gate model no real technology has.
- "The clock arrives everywhere at once." Skew and jitter are why sections 4 and 5 exist.
- "Metastability can be eliminated." Only made improbable. A synchronizer is a probability trade, not a fix.

## Citations

`[verified]` = URL fetched and checked this pass. `[title-only]` = author/title/edition/section from reference knowledge, **no link asserted**; confirm section numbers against a copy before quoting.

**Verified**

1. **IEEE Std 754-2019, "IEEE Standard for Floating-Point Arithmetic"**, IEEE Computer Society / C-MSC; approved 13 Jun 2019, published 22 Jul 2019, supersedes 754-2008. Section 6. https://standards.ieee.org/ieee/754/6210/ — `[verified]` (title, number, year, scope statement; normative clause text is paywalled and was not read).
2. **MIT 6.004 "Computation Structures", Spring 2017, Ch. 4 Combinational Logic** (MIT OCW). Confirmed topics: Sum of Products, Useful Logic Gates, Inverting Logic, Logic Simplification, Karnaugh Maps, Multiplexers, ROMs, Worked Examples. Sections 1-3. https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/pages/c4/ — `[verified]`
3. **MIT 6.004, Spring 2017, Ch. 5 Sequential Logic** (MIT OCW). Confirmed titles: Digital State, D Latch, D Register, D Register Timing, Sequential Circuit Timing, Timing Example. Section 5. https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/pages/c5/ — `[verified]` (titles only; setup/hold/clock-to-Q detail is inside 5.2.4-5.2.5, not opened).
4. **AMD (Xilinx), "Vivado Design Suite User Guide: Synthesis (UG901)"**, v2026.1 English, 2026-07-08; HDL Coding Techniques sections *Latches*, *Memory Elements*, *Sensitivity List*. Sections 5, 7. https://docs.amd.com/r/en-US/ug901-vivado-synthesis — `[verified]` for title, number, version, section existence. The incomplete-`if`/`case` sentence was **not** read verbatim — paraphrase, do not quote.

**Title-only (no link asserted)**

5. **Harris & Harris, "Digital Design and Computer Architecture", 2nd ed., Morgan Kaufmann** — Ch. 1 (number systems, CMOS transistors, gate construction); Ch. 2 (Boolean algebra, De Morgan, K-maps, implicants, don't-cares, timing, glitches, consensus terms); Ch. 3 (latches, flip-flops, setup/hold/clock-to-Q, max-frequency and hold inequalities, metastability, MTBF, synchronizers, skew); Ch. 5 (ripple-carry, carry-lookahead, prefix adders, shifters, comparators). Primary reference for sections 1-6 and the best match for this audience. — `[title-only]`
6. **Weste & Harris, "CMOS VLSI Design", 4th ed., Pearson** — Ch. 1-2 (MOS switches, complementary networks, NAND/NOR, transistor counts, mobility ratio, PMOS sizing); Ch. 4 (RC delay, logical effort d = g·h + p, stage effort ~3-4); Ch. 6 (interconnect, Elmore delay, repeaters); Ch. 10-11 (24T mirror adder, prefix adders, carry-save / 3:2 compressors, Wallace-Dadda trees, barrel shifters, sequencing, MTBF). Sections 1, 3, 4. — `[title-only]`
7. **Mano & Ciletti, "Digital Design", 6th ed., Pearson** — Ch. 2 (axioms, duality, canonical SOP/POS, minterms/maxterms); Ch. 3 (K-maps, prime and essential prime implicants, don't-cares, Quine-McCluskey); Ch. 4 (decoders, encoders, priority encoders, muxes, adders, comparators, hazards); Ch. 5 (latches, flip-flops). Source of the minterm/maxterm conventions and priority-encoder equations. — `[title-only]`
8. **Wakerly, "Digital Design: Principles and Practices", 5th ed., Pearson** — Ch. 3 (CMOS behaviour, fan-in/fan-out, transmission gates); Ch. 4 (static-0, static-1, dynamic hazards and consensus-term elimination); Ch. 6-8 (sequential elements, timing, adders). The most careful standard treatment of hazards; recommended for section 4. — `[title-only]`
9. **Hennessy & Patterson, "Computer Architecture: A Quantitative Approach", 6th ed., Appendix J "Computer Arithmetic" (D. Goldberg)** — two's complement and sign-magnitude, IEEE 754 encoding, the FP addition algorithm (alignment, effective subtraction, cancellation, normalisation), guard/round/sticky, carry-lookahead / carry-select / carry-save. The most directly relevant single appendix for this book's destination. — `[title-only]`
10. **Patterson & Hennessy, "Computer Organization and Design", RISC-V edition** — Ch. 2 (two's complement, sign extension, overflow detection), Ch. 3 (adders, floating point, IEEE 754). Gentler companion to #9; the Berkeley CS61C text. — `[title-only]`
11. **Ercegovac & Lang, "Digital Arithmetic", Morgan Kaufmann, 2004** — Ch. 2 (two's complement and sign-magnitude systems); Ch. 8 (FP addition, close/far two-path architectures, leading-zero anticipation, rounding). Reference-grade source for the LZA and two-path claims in section 3. — `[title-only]`
12. **Muller et al., "Handbook of Floating-Point Arithmetic", 2nd ed., Birkhäuser, 2018** — Ch. 3 (IEEE 754 semantics, signed zero, rounding rules including the sign of an exact-zero difference); Ch. 8-9 (hardware FP addition). Use for normative claims that #1's paywalled text would otherwise be needed for. — `[title-only]`
13. **Goldberg, D., "What Every Computer Scientist Should Know About Floating-Point Arithmetic", ACM Computing Surveys 23(1):5-48, Mar 1991** — rounding error, guard digits, catastrophic cancellation (section 6). — `[title-only]`
14. **Kogge & Stone, IEEE Trans. Computers C-22(8):786-793, Aug 1973**; **Brent & Kung, "A Regular Layout for Parallel Adders", IEEE Trans. Computers C-31(3):260-264, Mar 1982** — origins of the prefix adders named in section 3. — `[title-only]`
15. **Wallace, C. S., "A Suggestion for a Fast Multiplier", IEEE Trans. Electronic Computers EC-13(1):14-17, Feb 1964**; **Dadda, L., Alta Frequenza 34:349-356, 1965** — origin of the carry-save reduction tree (chapter-10 mechanism). — `[title-only]`
16. **McCluskey, E. J., "Minimization of Boolean Functions", Bell System Technical Journal 35(6):1417-1444, Nov 1956**, building on **Quine, W. V., American Mathematical Monthly 59(8):521-531, 1952** — the tabular method in section 2. — `[title-only]`
17. **Brayton et al., "Logic Minimization Algorithms for VLSI Synthesis", Kluwer, 1984** — Espresso, what tools run instead of Quine-McCluskey. — `[title-only]`
18. **Sutherland, Sproull & Harris, "Logical Effort: Designing Fast CMOS Circuits", Morgan Kaufmann, 1999** — d = g·h + p and the optimal per-stage effort of ~3-4 (section 4). — `[title-only]`
19. **Intel (Altera), "Understanding Metastability in FPGAs", White Paper WP-01082, Jul 2009, v1.2** — vendor MTBF equation with device-characterised C1/C2 constants, Quartus MTBF reporting. Fetch returned HTTP 403, so no URL is asserted and section 5 uses the textbook MTBF form (#5, #6), not Intel notation. — `[title-only]`
20. **Microchip (Microsemi), "RTG4 FPGA Metastability Characterization Report", Application Note AC474, v1** — device-characterised metastability parameters. PDF fetched but returned unextractable binary, so nothing is attributed to it. — `[title-only]`
21. **Cummings, C. E., "Clock Domain Crossing (CDC) Design & Verification Techniques Using SystemVerilog", SNUG 2008**; **Cummings & Alfke, "Simulation and Synthesis Techniques for Asynchronous FIFO Design", SNUG 2002** — two-flop synchronizer rules, the multi-bit-bus prohibition, Gray-coded pointers, async FIFOs (sections 5, 7). — `[title-only]`
22. **IEEE Std 1364-2005 (Verilog)** and **IEEE Std 1800-2023 (SystemVerilog)** — blocking vs non-blocking semantics, `always_comb` latch checking, signedness rules (sections 5-7). — `[title-only]`
23. **Icarus Verilog documentation (Stephen Williams), `iverilog`/`vvp` manual pages and project wiki** — supports the section-7 warning that a simulator accepts unsynthesizable constructs and zero-delay models hide timing. — `[title-only]`
24. **MIT 6.191 course resources page** (current numbering of 6.004), which notes the OCW 6.004 material corresponds to an older version of the subject — caveat for #2 and #3. Surfaced in search, not individually fetched. — `[title-only]`

**Not used:** search-result summaries, aggregators, and lecture slides re-hosted on document-sharing sites.

**Open items:** exact sub-section numbers in #5-#12 (chapter-level attributions are reliable, sub-sections are not asserted); the verbatim UG901 latch sentence (#4); vendor symbol names if Intel/Microchip MTBF notation is preferred (#19, #20); the section-1 XOR2 transistor count, which is circuit-style dependent.

