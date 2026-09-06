`timescale 1ns/1ps
`default_nettype none

// Sensitivity lists. The first module is wrong, the next two are right, and
// the fourth is wrong in a way that survives every review because the missing
// signal is not visible at the point where the block reads it.

// BUG: b and sel are read by the block but are not in its event list, so the
// block only wakes when a changes.
module mux2_bad_sens
  (input  wire a,
   input  wire b,
   input  wire sel,
   output reg  y);

  always @(a)
    y = sel ? b : a;

endmodule

// The Verilog-1995 spelling, complete. `or` here is a separator, not a
// logical OR. `always @(a, b, sel)` is the Verilog-2001 spelling of the
// identical thing.
module mux2_full_sens
  (input  wire a,
   input  wire b,
   input  wire sel,
   output reg  y);

  always @(a or b or sel)
    y = sel ? b : a;

endmodule

// The form to use everywhere: the tool works the list out for you.
module mux2_star
  (input  wire a,
   input  wire b,
   input  wire sel,
   output reg  y);

  always @(*)
    y = sel ? b : a;

endmodule

// f_hidden reads q, but q never appears at the call site, and @(*) does not
// look inside function bodies. f_clean takes the same value as an argument,
// so it does appear, and the block is sensitive to it.
module func_sens
  (input  wire [3:0] p,
   input  wire [3:0] q,
   output reg  [3:0] y_auto,
   output reg  [3:0] y_manual);

  function [3:0] f_hidden;
    input [3:0] x;
    begin
      f_hidden = x + q;
    end
  endfunction

  function [3:0] f_clean;
    input [3:0] x;
    input [3:0] qq;
    begin
      f_clean = x + qq;
    end
  endfunction

  always @(*) y_auto   = f_hidden(p);
  always @(*) y_manual = f_clean(p, q);

endmodule

`default_nettype wire
