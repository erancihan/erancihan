`timescale 1ns/1ps
`default_nettype none

// Chapter 13, WARN target: chapter 9's fp32_normalize in full SystemVerilog
// style -- `logic` ports, every intermediate a block-local variable inside
// ONE always_comb, the leading-zero count an `automatic function` with a
// `for (int i ...)` loop, a `5'(i)` size cast and an explicit `return`.
//
// Same algorithm, same widths: e_norm keeps the ninth bit chapter 9's header
// argues for. tb_norm_equiv.sv sweeps it against the shipped module over
// 250,420 vectors and finds it bit-identical.
//
// It is a `warn` target because it compiles with TEN diagnostics of the form
//
//   fp32_normalize_sv.sv:57: sorry: constant selects in always_* processes
//   are not fully supported (the process will be sensitive to all bits in
//   'sum27[26:0]').
//
// -- one per constant bit- or part-select read inside the always_comb body
// (six naming sum27, three naming framel, one naming shl8; the function's
// loop variable contributes none). Measured
// this session: the SAME selects in a plain `always @*` compile silently,
// and in an `always_ff` compile silently. The sorry is an artifact of
// always_comb's own sensitivity-inference engine and nothing else, and its
// text states the fallback -- the process becomes sensitive to the whole
// vector, which for combinational logic costs extra evaluations and changes
// no settled value. That is why this file is proven equivalent rather than
// merely asserted to be.
module fp32_normalize_sv
  (input  logic        eff_sub,
   input  logic [26:0] sum27,
   input  logic        s_in,       // alignment sticky, passing through
   input  logic [7:0]  e_big,
   output logic [23:0] nsig,
   output logic        ng,
   output logic        nr,
   output logic        ns,
   output logic [8:0]  e_norm);

  // Everything the function reads still arrives as an ARGUMENT. Chapter 9
  // made that a rule; chapter 13 measures the second reason for it, since
  // always_comb -- unlike @* -- follows dependencies INTO function bodies.
  function automatic logic [4:0] lzc26(input logic [25:0] v);
    lzc26 = 5'd26;
    for (int i = 0; i <= 25; i++)
      if (v[25 - i] == 1'b1 && lzc26 == 5'd26)
        lzc26 = 5'(i);
    return lzc26;
  endfunction

  always_comb begin
    logic        carry, right1;
    logic [25:0] frame, framel;
    logic [4:0]  lz, shl;
    logic [7:0]  e_lim, shl8;

    carry  = sum27[26];
    right1 = ~eff_sub & carry;
    frame  = sum27[25:0];
    lz     = lzc26(frame);
    e_lim  = e_big - 8'd1;
    shl8   = ({3'b000, lz} > e_lim) ? e_lim : {3'b000, lz};
    shl    = shl8[4:0];
    framel = frame << shl;

    nsig   = right1 ? sum27[26:3]       : framel[25:2];
    ng     = right1 ? sum27[2]          : framel[1];
    nr     = right1 ? sum27[1]          : framel[0];
    ns     = right1 ? (s_in | sum27[0]) : s_in;
    e_norm = right1 ? ({1'b0, e_big} + 9'd1)
                    : ({1'b0, e_big} - {4'b0000, shl});
  end

endmodule

`default_nettype wire
