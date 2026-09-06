`timescale 1ns/1ps
`default_nettype none

// Chapter 13: equivalence sweep, packed-struct decode vs the SHIPPED
// chapter 7 module. Both are instantiated side by side from the same
// stimulus and compared with !== on the concatenation of all six outputs
// (chapter 9's "Composition, and the Golden-Equivalence Sweep" discipline:
// != would pass an undriven design).
//
// Stimulus: every stored exponent 0..255 x six boundary fractions x both
// signs (3,072 directed) + 1,000,000 random patterns, seeded ONCE with the
// first draw discarded (chapter 5's seed rule; chapter 13 measured that one
// discard does not decorrelate nearby seeds, so the rule that carries the
// weight is "seed once per simulation").
//
// What makes it able to fail: the X-drive guard, the !== compare on every
// output bit, and the vector count check -- a sweep that ran zero iterations
// must go red, not green.
module tb_fields_equiv;
  import fp32_pkg::*;

  reg [31:0] w;
  wire        s_a, h_a;  wire [7:0] e_a, ee_a;  wire [22:0] f_a;  wire [23:0] g_a;
  wire        s_b, h_b;  wire [7:0] e_b, ee_b;  wire [22:0] f_b;  wire [23:0] g_b;

  // the shipped chapter 7 module, compiled unmodified from ../ch07
  fp32_fields    u_ref (.w(w), .sign(s_a), .e_raw(e_a), .frac(f_a),
                        .hidden(h_a), .sig(g_a), .e_eff(ee_a));
  // the packed-struct rewrite: a 32-bit vector drives an fp32_t port
  fp32_fields_sv u_sv  (.w(w), .sign(s_b), .e_raw(e_b), .frac(f_b),
                        .hidden(h_b), .sig(g_b), .e_eff(ee_b));

  integer errors, n, i, j, k, seed, dummy;
  reg [22:0] fr [0:5];

  task chk;
    begin
      #1;
      if (w === 32'hx) begin
        errors = errors + 1; $display("FAIL: stimulus never driven");
      end
      if ({s_a, e_a, f_a, h_a, g_a, ee_a} !== {s_b, e_b, f_b, h_b, g_b, ee_b}) begin
        errors = errors + 1;
        if (errors <= 5)
          $display("FAIL w=%h ref={%b %h %h %b %h %h} sv={%b %h %h %b %h %h}",
                   w, s_a, e_a, f_a, h_a, g_a, ee_a, s_b, e_b, f_b, h_b, g_b, ee_b);
      end
      n = n + 1;
    end
  endtask

  initial begin
    errors = 0; n = 0;
    fr[0] = 23'h000000; fr[1] = 23'h000001; fr[2] = 23'h400000;
    fr[3] = 23'h7fffff; fr[4] = 23'h2aaaaa; fr[5] = 23'h555555;

    for (i = 0; i < 256; i = i + 1)
      for (j = 0; j < 6; j = j + 1)
        for (k = 0; k < 2; k = k + 1) begin
          w = {k[0], i[7:0], fr[j]};
          chk;
        end

    seed = 1313; dummy = $urandom(seed);   // seed once, discard the first draw
    for (i = 0; i < 1000000; i = i + 1) begin
      w = $urandom;
      chk;
    end

    if (n !== 256*6*2 + 1000000) begin
      errors = errors + 1;
      $display("FAIL tb_fields_equiv: swept %0d vectors, expected %0d",
               n, 256*6*2 + 1000000);
    end
    if (errors == 0)
      $display("PASS tb_fields_equiv (%0d vectors, bit-identical)", n);
    else
      $display("FAIL tb_fields_equiv: %0d error(s)", errors);
    $finish;
  end
endmodule

`default_nettype wire
