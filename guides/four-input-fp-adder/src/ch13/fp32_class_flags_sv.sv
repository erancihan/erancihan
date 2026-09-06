`timescale 1ns/1ps
`default_nettype none

// Chapter 13, WARN target: chapter 12's five operand classes, decoded with a
// `unique case` over a typed enum instead of an integer.
//
// Two things are being measured here at once, and they disagree with each
// other. The compile emits
//
//   vvp.tgt sorry: Case unique/unique0 qualities are ignored.
//
// -- and then the runtime implements half the semantics anyway: a value with
// no matching item raises a real warning naming the file, line and time. What
// stays missing is the OTHER half, the one `unique` is famous for: two items
// that match simultaneously are never reported (measured with unique casez;
// first match silently wins). So on this simulator `unique`/`priority case`
// buy the no-match check and nothing else -- which is still more than a plain
// `case` gives you, and the compile-time "ignored" message is inaccurate
// about the runtime in the reader's favour.
//
// The all-zero default assignment before the case is the chapter 3 rule, and
// it is what the no-match run leaves standing -- tb_unique_case.sv checks
// exactly that.
module fp32_class_flags_sv
  import fp32_pkg::*;
  (input  logic [2:0] code,      // chapter 12's fclass() result, 0..4
   output logic       is_zero,
   output logic       is_sub,
   output logic       is_norm,
   output logic       is_inf,
   output logic       is_nan);

  always_comb begin
    is_zero = 1'b0;
    is_sub  = 1'b0;
    is_norm = 1'b0;
    is_inf  = 1'b0;
    is_nan  = 1'b0;
    unique case (fclass_e'(code))
      FC_ZERO: is_zero = 1'b1;
      FC_SUBN: is_sub  = 1'b1;
      FC_NORM: is_norm = 1'b1;
      FC_INF : is_inf  = 1'b1;
      FC_NAN : is_nan  = 1'b1;
    endcase
  end

endmodule

`default_nettype wire
