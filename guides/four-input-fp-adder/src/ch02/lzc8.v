`timescale 1ns/1ps
`default_nettype none

// Leading-zero count over 8 bits: chapter 1's priority encoder, spelled as a
// loop. In hardware the loop becomes eight parallel comparisons, so it costs
// eight copies of the logic; in simulation it iterates in zero elapsed time.
// An all-zero input returns 8, which is why the result needs 4 bits.
module lzc8
  (input  wire [7:0] x,
   output wire [3:0] count);

  function [3:0] lzc;
    input [7:0] v;
    integer j;
    begin
      lzc = 4'd8;
      for (j = 7; j >= 0; j = j - 1)
        if (v[j] && lzc == 4'd8)
          lzc = 4'd7 - j[3:0];
    end
  endfunction

  assign count = lzc(x);

endmodule

`default_nettype wire
