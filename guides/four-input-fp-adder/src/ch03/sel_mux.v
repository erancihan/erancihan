`timescale 1ns/1ps
`default_nettype none

// A three-input selector written as a combinational always block. Two habits
// make it combinational rather than latched: the unconditional default
// assignment on the first line, and the `default:` arm on the case. Either one
// alone would be enough here. Both together survive the next edit.
module sel_mux
  (input  wire [1:0] sel,
   input  wire [3:0] a,
   input  wire [3:0] b,
   input  wire [3:0] c,
   output reg  [3:0] y);

  always @(*) begin
    y = 4'b0000;
    case (sel)
      2'b00:   y = a;
      2'b01:   y = b;
      2'b10:   y = c;
      default: y = 4'b0000;
    endcase
  end

endmodule

`default_nettype wire
