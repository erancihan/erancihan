`timescale 1ns/1ps
`default_nettype none

// The standard two-flop reset synchroniser. Assertion is asynchronous and
// instant; de-assertion takes two clocks and lands just after a clock edge, so
// recovery and removal downstream become an ordinary timing closure problem
// instead of an unconstrained asynchronous one. One of these per clock domain.
// In a real flow s1 and s2 also carry a synthesis attribute telling the tool
// not to merge, retime or spread them - `(* ASYNC_REG = "TRUE" *)` on AMD
// (Xilinx). Attributes are out of scope for this guide; the omission is
// deliberate, not an oversight.
module reset_sync
  (input  wire clk,
   input  wire arst_n,
   output wire rst_n_sync);

  reg s1, s2;

  always @(posedge clk or negedge arst_n)
    if (!arst_n) {s2, s1} <= 2'b00;
    else         {s2, s1} <= {s1, 1'b1};

  assign rst_n_sync = s2;

endmodule

`default_nettype wire
