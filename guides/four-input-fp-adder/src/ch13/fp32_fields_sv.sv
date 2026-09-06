`timescale 1ns/1ps
`default_nettype none

// Chapter 13: chapter 7's fp32_fields, rewritten with a packed struct port
// and `logic` outputs. Same six assignments, same bits -- proven identical
// to the shipped module over 1,003,072 vectors by tb_fields_equiv.sv.
//
// What changed: the input is a named record instead of a 32-bit word, so
// w[30:23] becomes w.e_raw and the slice bounds live in fp32_pkg. What did
// NOT change: one line of arithmetic. The rewrite is a pure renaming, which
// is the whole argument for it -- zero risk, all the readability.
//
// This is the CONTINUOUS-ASSIGN form, and that is deliberate. The same
// decode written as one always_comb block compiles and passes the same
// sweep, but emits six "constant selects ... not fully supported"
// diagnostics -- see fp32_fields_svc.sv, this chapter's warn target.
module fp32_fields_sv
  import fp32_pkg::*;
  (input  fp32_t       w,       // packed binary32 pattern, as a record
   output logic        sign,    // w.sign
   output logic [7:0]  e_raw,   // w.e_raw
   output logic [22:0] frac,    // w.frac
   output logic        hidden,  // the implicit bit the format does not store
   output logic [23:0] sig,     // {hidden, frac}
   output logic [7:0]  e_eff);  // max(e_raw, 1)

  assign sign   = w.sign;
  assign e_raw  = w.e_raw;
  assign frac   = w.frac;
  assign hidden = |w.e_raw;
  assign sig    = {hidden, w.frac};
  assign e_eff  = hidden ? w.e_raw : 8'd1;

endmodule

`default_nettype wire
