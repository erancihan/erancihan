`timescale 1ns/1ps
`default_nettype none

// Indexed part-select with a variable base. The WIDTH is constant (8), only
// the BASE varies, which is exactly why this is legal and why it maps to a
// multiplexer. `word[idx*8 : idx*8+7]' would be illegal: both bounds vary.
module byte_select
  (input  wire [31:0] word,
   input  wire [1:0]  idx,
   output wire [7:0]  lo_up,     // 8 bits starting at idx*8, counting up
   output wire [7:0]  hi_down);  // 8 bits ending at 31-idx*8, counting down

  assign lo_up   = word[idx*8      +: 8];
  assign hi_down = word[31 - idx*8 -: 8];

endmodule

`default_nettype wire
