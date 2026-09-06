`timescale 1ns/1ps

// An xfail target: this file MUST NOT compile.
//
// SystemVerilog functional coverage - covergroup, coverpoint, bins, cross. It
// is a syntax error on Icarus Verilog 13.0 at every language level tested
// (-g2005, -g2005-sv, -g2009, -g2012):
//
//   syntax error
//   error: Invalid module item.
//
// followed by three more of the same and "I give up." At -g2005 the second
// line reads "Invalid module instantiation" instead.
//
// There is no coverage backend either: iverilog -t accepts blif, null, pcb,
// sizer, stub, vhdl, vlog95 and vvp, and none of them is a coverage target.
//
// tb_covfp.v is what you write instead - the same coverage model as plain
// integer counters, about sixty lines, and it fails the run when a bin is
// empty, which a covergroup would not do without extra work.
module bad_covergroup;

  reg [2:0] q;
  reg       clk = 1'b0;

  covergroup cg @(posedge clk);
    coverpoint q { bins low = {0,1,2}; bins high = {3,4,5}; }
  endgroup

endmodule
