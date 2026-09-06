`timescale 1ns/1ps
`default_nettype none

// Chapter 13: what `unique case` actually does on Icarus 13.0, made
// falsifiable. Three properties are checked:
//
//   1. The five labelled codes decode one-hot, and enum .name() prints the
//      label rather than the number -- the readability half of the trade.
//   2. An UNMATCHED code leaves the pre-case default standing (all flags
//      low), and the simulator prints, at run time,
//
//        WARNING: fp32_class_flags_sv.sv:39: value is unhandled for priority
//        or unique case statement
//                 Time: 11000  Scope: tb_unique_case.dut
//
//      -- a check the compiler said it had ignored.
//   3. `unique` does NOT catch an OVERLAP. The second block below is a
//      unique casez with two simultaneously matching items; the first match
//      wins in silence, and this testbench PASSES on that fact. It is the
//      only kind of test that can pin a missing feature: state what is
//      absent and go red if it ever appears.
//
// The target is a `warn` row because the compile carries the "qualities are
// ignored" sorry. The runtime WARNING above is simulation output, not
// compile output, so it does not affect the classification.
module tb_unique_case;
  import fp32_pkg::*;

  logic [2:0] code = 3'd0;   // initialised so the decoder starts matched
  logic       is_zero, is_sub, is_norm, is_inf, is_nan;
  fclass_e    cls;           // a cast's result cannot take .name() directly:
                             // fclass_e'(code).name() is a syntax error here
  integer     errors, i;

  fp32_class_flags_sv dut (.code(code), .is_zero(is_zero), .is_sub(is_sub),
                           .is_norm(is_norm), .is_inf(is_inf), .is_nan(is_nan));

  // Overlap probe: 3'b1?? and 3'b?1? both match 3'b110.
  logic [2:0] sel;
  logic [1:0] hit;
  always_comb begin
    hit = 2'd0;
    unique casez (sel)
      3'b1??: hit = 2'd1;
      3'b?1?: hit = 2'd2;
      default: hit = 2'd3;
    endcase
  end

  function automatic logic [4:0] onehot(input integer k);
    onehot = 5'b00001 << k;
  endfunction

  initial begin
    errors = 0;

    for (i = 0; i < 5; i = i + 1) begin
      #1;
      code = i[2:0];
      #1;
      cls = fclass_e'(code);
      if ({is_nan, is_inf, is_norm, is_sub, is_zero} !== onehot(i)) begin
        errors = errors + 1;
        $display("FAIL code %0d (%s): flags %b, expected %b", i, cls.name(),
                 {is_nan, is_inf, is_norm, is_sub, is_zero}, onehot(i));
      end
    end

    // Property 2: an unlabelled code. The enum has no name for it, the case
    // has no item for it, and the pre-case default must survive.
    #1;
    code = 3'd5;
    #1;
    if ({is_nan, is_inf, is_norm, is_sub, is_zero} !== 5'b00000) begin
      errors = errors + 1;
      $display("FAIL unmatched code 5 decoded to %b, expected all-zero",
               {is_nan, is_inf, is_norm, is_sub, is_zero});
    end
    cls = fclass_e'(code);
    if (cls.name() != "") begin
      errors = errors + 1;
      $display("FAIL unlabelled enum value named '%s', expected empty", cls.name());
    end

    // Property 3: overlap is NOT detected; first match wins, silently.
    #1;
    sel = 3'b110;
    #1;
    if (hit !== 2'd1) begin
      errors = errors + 1;
      $display("FAIL unique casez overlap: hit=%0d, expected 1 (first match wins)", hit);
    end

    if (errors == 0)
      $display("PASS tb_unique_case (5 labelled codes one-hot, no-match default held, overlap undetected)");
    else
      $display("FAIL tb_unique_case: %0d error(s)", errors);
    $finish;
  end
endmodule

`default_nettype wire
