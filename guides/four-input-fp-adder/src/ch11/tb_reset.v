`timescale 1ns/1ps
`default_nettype none

// Chapter 11: the three reset strategies, measured from cold start on
// three instances of the SAME pipeline in one simulation.
//
//   row A (dut_a) -- the shipped design used as shipped: valid-pipe-only
//     reset. out_valid is a hard 0 for the whole fill, data outputs are
//     X-contaminated garbage during fill (asserted), and the FIRST
//     valid-flagged output is already bit-correct.
//   row B (dut_b) -- no reset at all: rst_n tied high, nothing ever
//     initialized. out_valid is x on the first observed cycle -- a
//     consumer's `if (out_valid)` skips the fill window only because
//     Verilog treats x as false. Luck, not design.
//   row C (dut_c) -- "reset everything": every datapath register held at
//     zero through reset (hierarchical deposit -- same observable state
//     as a full reset net, no second design needed). The all-zeros state
//     is an ILLEGAL datapath state (e_big = 0 cannot occur in live
//     traffic), and stage logic faithfully decodes it: the fill window
//     emits a fully DEFINED +inf with overflow and inexact raised --
//     manufactured, confident-looking nonsense that no operand pair
//     produced. Full reset does not make the fill window safe; gating by
//     out_valid does.
//
// Same `DUT/`LAT macros as tb_stream.v: compile stream_cfg_p4.v ahead of
// this file to run the identical demonstration on the 4-stage pipeline.
`ifndef DUT
 `define DUT fp32_add2_p2
 `define LAT 2
 `define P2BANKS
`endif

module tb_reset;
  localparam integer LAT = `LAT;

  reg         clk, rst_n, in_valid;
  reg  [31:0] a, b;
  reg         in_valid_b;
  reg  [31:0] ab, bb;
  integer     errors, obs;

  wire [31:0] r_a, r_b, r_c;
  wire        ov_a, ov_b, ov_c;
  wire        inv_a, ovf_a, inx_a, inv_b, ovf_b, inx_b, inv_c, ovf_c, inx_c;

  `DUT dut_a (.clk(clk), .rst_n(rst_n), .in_valid(in_valid), .a(a), .b(b),
              .result(r_a), .invalid(inv_a), .overflow(ovf_a),
              .inexact(inx_a), .out_valid(ov_a));
  `DUT dut_b (.clk(clk), .rst_n(1'b1), .in_valid(in_valid_b), .a(ab), .b(bb),
              .result(r_b), .invalid(inv_b), .overflow(ovf_b),
              .inexact(inx_b), .out_valid(ov_b));
  `DUT dut_c (.clk(clk), .rst_n(rst_n), .in_valid(in_valid), .a(a), .b(b),
              .result(r_c), .invalid(inv_c), .overflow(ovf_c),
              .inexact(inx_c), .out_valid(ov_c));

  always #5 clk = ~clk;

  initial begin : watchdog
    #100000;
    $display("FAIL tb_reset: timeout");
    $fatal(1, "timeout");
  end

  // Row C's "full reset": hold every datapath register of dut_c at zero
  // until the release edge. A hierarchical deposit leaves the DUT source
  // untouched and produces the same post-release state a reset fanout to
  // every flop would.
  task zero_dutc;
    begin
`ifdef P2BANKS
      dut_c.p1_sign_big = 1'b0;  dut_c.p1_eff_sub    = 1'b0;
      dut_c.p1_s_al     = 1'b0;  dut_c.p1_exact_zero = 1'b0;
      dut_c.p1_e_big    = 8'd0;  dut_c.p1_sum27      = 27'd0;
      dut_c.p1_screen   = 1'b0;  dut_c.p1_invalid    = 1'b0;
      dut_c.p1_screen_res = 32'd0;
      dut_c.p2_result   = 32'd0; dut_c.p2_invalid    = 1'b0;
      dut_c.p2_overflow = 1'b0;  dut_c.p2_inexact    = 1'b0;
`else
      dut_c.a_sign_big  = 1'b0;  dut_c.a_eff_sub     = 1'b0;
      dut_c.a_e_big     = 8'd0;  dut_c.a_e_sml       = 8'd0;
      dut_c.a_sig_big   = 24'd0; dut_c.a_sig_sml     = 24'd0;
      dut_c.a_screen    = 1'b0;  dut_c.a_invalid     = 1'b0;
      dut_c.a_screen_res = 32'd0;
      dut_c.b_sign_big  = 1'b0;  dut_c.b_eff_sub     = 1'b0;
      dut_c.b_s_al      = 1'b0;  dut_c.b_exact_zero  = 1'b0;
      dut_c.b_e_big     = 8'd0;  dut_c.b_sum27       = 27'd0;
      dut_c.b_screen    = 1'b0;  dut_c.b_invalid     = 1'b0;
      dut_c.b_screen_res = 32'd0;
      dut_c.c_sign      = 1'b0;  dut_c.c_exact_zero  = 1'b0;
      dut_c.c_nsig      = 24'd0; dut_c.c_ng          = 1'b0;
      dut_c.c_nr        = 1'b0;  dut_c.c_ns          = 1'b0;
      dut_c.c_e_norm    = 9'd0;  dut_c.c_screen      = 1'b0;
      dut_c.c_invalid   = 1'b0;  dut_c.c_screen_res  = 32'd0;
      dut_c.d_result    = 32'd0; dut_c.d_invalid     = 1'b0;
      dut_c.d_overflow  = 1'b0;  dut_c.d_inexact     = 1'b0;
`endif
    end
  endtask

  task err(input [511:0] what);
    begin
      errors = errors + 1;
      $display("FAIL tb_reset: %0s", what);
    end
  endtask

  // Row B runs on its own bus from time zero -- its whole point is what
  // happens BEFORE anyone asserts a reset.
  initial begin : row_b
    in_valid_b = 1'b0; ab = 32'hx; bb = 32'hx;
    #1;             // sit out t=0: clk's x->0 init would read as a negedge
    @(negedge clk);                       // first observable cycle
    $display("tb_reset row B obs 0: out_valid=%b (never-reset valid pipe)", ov_b);
    if (ov_b !== 1'bx) err("row B: out_valid should start x with no reset");
    repeat (LAT-1) @(negedge clk);        // x has drained through by now
    if (ov_b !== 1'b0) err("row B: out_valid not 0 after the x window");
    in_valid_b = 1'b1; ab = 32'h3F800000; bb = 32'h40000000;
    repeat (LAT) @(negedge clk);
    if (ov_b !== 1'b1 || r_b !== 32'h40400000)
      err("row B: first valid-flagged result wrong");
  end

  initial begin
    clk = 1'b0; rst_n = 1'b0; in_valid = 1'b0;
    a = 32'hx; b = 32'hx; errors = 0;
    repeat (2) @(posedge clk);
    @(negedge clk);
    zero_dutc;                            // row C: banks all zero at release
    rst_n = 1'b1;                         // release; stream from this edge
    in_valid = 1'b1; a = 32'h3F800000; b = 32'h40000000;

    for (obs = 0; obs < LAT + 4; obs = obs + 1) begin
      @(negedge clk);
      $display("tb_reset obs %0d: A ov=%b r=%h f=%b%b%b | C ov=%b r=%h f=%b%b%b",
               obs, ov_a, r_a, inv_a, ovf_a, inx_a,
               ov_c, r_c, inv_c, ovf_c, inx_c);
      if (obs < LAT-1) begin
        // fill window: out_valid must be a HARD 0 on both reset rows
        if (ov_a !== 1'b0) err("row A: out_valid not hard 0 during fill");
        if (ov_c !== 1'b0) err("row C: out_valid not hard 0 during fill");
        // row A: fill data is X-contaminated -- honest garbage
        if ((^r_a) !== 1'bx) err("row A: expected X in fill-window data");
        // row C: fill data is fully DEFINED -- dishonest garbage
        if ((^{r_c, inv_c, ovf_c, inx_c}) === 1'bx)
          err("row C: fill-window data should be fully defined");
      end else begin
        // from observation LAT-1 on: correct results, valid flagged
        if (ov_a !== 1'b1 || {r_a, inv_a, ovf_a, inx_a} !== {32'h40400000, 3'b000})
          err("row A: steady-state result wrong");
        if (ov_c !== 1'b1 || {r_c, inv_c, ovf_c, inx_c} !== {32'h40400000, 3'b000})
          err("row C: steady-state result wrong");
      end
`ifdef P2BANKS
      // 2-stage: the zeroed addsub-cut bank decodes to +inf/ovf/inx at
      // the first post-release capture (e_big=0 -> e_norm wraps to 486)
      if (obs == 0 && {r_c, inv_c, ovf_c, inx_c} !== {32'h7F800000, 3'b011})
        err("row C: expected manufactured 7F800000/011 at obs 0");
`else
      // 4-stage: zeroed bank C first decodes to +0 (defined, clean
      // flags), then the wrapped e_norm=486 state reaches bank D twice
      if (obs == 0 && {r_c, inv_c, ovf_c, inx_c} !== {32'h00000000, 3'b000})
        err("row C: expected defined +0 garbage at obs 0");
      if ((obs == 1 || obs == 2) &&
          {r_c, inv_c, ovf_c, inx_c} !== {32'h7F800000, 3'b011})
        err("row C: expected manufactured 7F800000/011 at obs 1 and 2");
`endif
    end

    if (errors !== 0)
      $fatal(1, "FAIL tb_reset: %0d errors", errors);
    $display("PASS tb_reset LAT=%0d (valid-only reset: hard-0 fill, X data; no reset: out_valid starts x; full zero reset: DEFINED +inf/overflow manufactured in the fill window)",
             LAT);
    $finish;
  end
endmodule

`default_nettype wire
