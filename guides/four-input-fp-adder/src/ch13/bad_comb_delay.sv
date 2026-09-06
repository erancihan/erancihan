`timescale 1ns/1ps

// An xfail target: this file MUST NOT compile.
//
// The ONE always_comb promise Icarus 13.0 enforces, and the chapter ships it
// as a target so the sentence "SystemVerilog's always_comb is unenforced
// here" cannot be read as "wholly unenforced". A timing control inside an
// always_comb, always_ff or always_latch process is a hard error:
//
//   bad_comb_delay.sv:31: error: a blocking delay is not allowed in an
//   always_comb, always_ff or always_latch process.
//   bad_comb_delay.sv:30: error: there must be no event controls or blocking
//   delays in an always_comb process.
//
// Everything else the LRM promises about always_comb is documentation on this
// simulator: the incomplete-if latch is accepted in silence and really
// latches (chapter 3's "The Accidental Latch", re-measured this session and
// unchanged), an always_comb variable written by another process is accepted
// in silence, and always_latch behaves identically to always_comb in every
// respect measured.
//
// The two behaviours that ARE different from `always @(*)` -- and they are
// improvements -- are measured in the chapter: execution at time zero, and
// sensitivity that follows dependencies into function bodies.
module bad_comb_delay
  (input  wire a,
   input  wire b,
   output reg  y);

  always_comb begin
    #1 y = a & b;
  end

endmodule
