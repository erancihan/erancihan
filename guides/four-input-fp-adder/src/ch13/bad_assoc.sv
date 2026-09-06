`timescale 1ns/1ps

// An xfail target: this file MUST NOT compile.
//
// The associative array -- SystemVerilog's sparse map, and the natural
// container for a coverage model keyed by something other than a dense
// integer range (chapter 12's 105 bins are a dense array precisely because
// plain Verilog offers nothing else). Icarus 13.0 does not have it, at any
// language level, and the way it fails is worth seeing:
//
//   bad_assoc.sv:26: error: Type names are not valid expressions here.
//   bad_assoc.sv:26: internal error: I do not know how to elaborate this
//   expression.
//   bad_assoc.sv:26:      : Expression is: <type>
//
// An `internal error` is a different signal from a `sorry`. A "sorry" is the
// compiler telling you it knows what you meant; an internal error is the
// elaborator falling over. Both mean "not here", and the practical rule is
// the same one this whole chapter arrives at: check the construct you plan
// to lean on, in the tool you plan to use, before you design around it.
//
// What DOES work for the same job: queues (tb_q_stream.sv) and dynamic
// arrays, both measured.
module bad_assoc;

  int    tally [string];
  string k;

  initial begin
    tally["norm"] = 1;
    k = "norm";
    $display("%0d", tally[k]);
  end

endmodule
