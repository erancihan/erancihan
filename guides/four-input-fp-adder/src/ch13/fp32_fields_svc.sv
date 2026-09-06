`timescale 1ns/1ps
`default_nettype none

// Chapter 13, WARN target: the same packed-struct decode written the way a
// SystemVerilog textbook writes it -- one always_comb block instead of six
// continuous assigns. It is semantically identical (tb_fields_comb.sv sweeps
// it against the shipped chapter 7 module and it is bit-identical), and it
// does not compile silently:
//
//   :0: sorry: constant selects in always_* processes are not fully supported
//   (the process will be sensitive to all bits in 'w[31:0]').
//
// -- one per member read, six in all, and five of the six arrive with the
// file position mangled to ":0:" (only the sig line below gets a real
// file:line). The diagnostic is about SENSITIVITY
// INFERENCE, not about the result: Icarus falls back to making the process
// sensitive to the whole struct, which for a decode is what you wanted. But
// this project's harness fails any `run` target whose compile log is
// non-empty, which is why the shipped form is fp32_fields_sv.sv and this one
// is pinned as a `warn` row instead. If a future Icarus stops emitting the
// sorry, this target goes red and the chapter learns its transcript is stale.
module fp32_fields_svc
  import fp32_pkg::*;
  (input  fp32_t       w,
   output logic        sign,
   output logic [7:0]  e_raw,
   output logic [22:0] frac,
   output logic        hidden,
   output logic [23:0] sig,
   output logic [7:0]  e_eff);

  always_comb begin
    sign   = w.sign;
    e_raw  = w.e_raw;
    frac   = w.frac;
    hidden = |w.e_raw;
    sig    = {hidden, w.frac};
    e_eff  = hidden ? w.e_raw : 8'd1;
  end

endmodule

`default_nettype wire
