`timescale 1ns/1ps

// An xfail target: this file MUST NOT compile.
//
// This is SystemVerilog Assertions - a concurrent assertion with an implication
// operator, the single most useful idea in modern hardware verification and the
// one you cannot practise on this simulator. Measured on Icarus Verilog 13.0 at
// -g2005-sv, -g2009 and -g2012, all three identical:
//
//   syntax error
//   error: Error in property_spec of concurrent assertion item.
//
// At -g2005 the first line is the same and the second reads "Syntax error in
// instance port expression(s)", because without SystemVerilog the parser is
// still trying to read `assert` as a module instantiation.
//
// The advertised -gno-assertions / -gsupported-assertions flags do not help.
// They silence the "sorry, not supported" diagnostic where the parser can read
// the syntax - and then DISCARD the property, so the file compiles, runs, and
// checks nothing. Where the parser cannot read the syntax, as here, they change
// nothing at all: the syntax error survives -gno-assertions.
//
// The runnable equivalent is in tb_assert.v: an immediate assertion inside
// always @(posedge clk), with a counter when the property spans cycles.
module bad_sva;

  reg clk = 1'b0, req = 1'b0, ack = 1'b0;

  assert property (@(posedge clk) req |-> ##[1:3] ack);

endmodule
