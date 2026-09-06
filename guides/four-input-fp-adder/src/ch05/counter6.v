`timescale 1ns/1ps
`default_nettype none

// A modulo-6 counter, so the assertion examples have an invariant worth
// stating: q is never greater than 5, q is never unknown after reset, and q
// only moves when en is high.
//
// Compile with -DBREAK_WRAP to wrap at 8 instead of 6 - the mutant tb_assert.v
// exists to catch.
module counter6
  (input  wire       clk,
   input  wire       rst,
   input  wire       en,
   output reg  [2:0] q);

  always @(posedge clk)
    if (rst)      q <= 3'd0;
`ifdef BREAK_WRAP
    else if (en)  q <= q + 3'd1;
`else
    else if (en)  q <= (q == 3'd5) ? 3'd0 : q + 3'd1;
`endif

endmodule

`default_nettype wire
