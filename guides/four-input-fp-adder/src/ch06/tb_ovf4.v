`timescale 1ns/1ps
`default_nettype none

// Chapter 6: carry vs overflow on chapter 2's ripple4, exhaustively.
//
// ripple4 does not export its internal carry chain, but the full adder's own
// equation gives it back: sum[3] = a[3] ^ b[3] ^ c3, so c3 = sum[3]^a[3]^b[3].
// V is then c3 ^ cout (the two-MSB-carries rule). The testbench checks that
// rule, the sign rule, and the widen-by-one method against ground truth for
// all 256 addition pairs, counts the C/V census, and re-checks V on all 256
// subtraction pairs via a + ~b + 1.
module tb_ovf4;

  reg  [3:0] a, b;
  reg        cin;
  wire [3:0] s;
  wire       cout;

  ripple4 dut (.a(a), .b(b), .cin(cin), .sum(s), .cout(cout));

  // Carry into the MSB, recovered from the ports.
  wire c3 = s[3] ^ a[3] ^ b[3];
  wire v  = c3 ^ cout;                       // rule 1: two MSB carries differ
  wire v_sign = (a[3] == b[3]) && (s[3] != a[3]);  // rule 2: sign rule

  // Rule 3: widen by one, V = XOR of the two top result bits.
  wire signed [4:0] wide = $signed(a) + $signed(b);
  wire v_wide = wide[4] ^ wide[3];

  integer ia, ib, errors;
  integer sa, sb, true_sum;
  reg     v_true;
  integer n_neither, n_conly, n_vonly, n_both;

  initial begin : watchdog
    #100000;
    $display("FAIL tb_ovf4: timeout at %0t, the sweep never finished", $time);
    $fatal(1, "timeout");
  end

  task census(input [3:0] va, input [3:0] vb, input [127:0] label);
    begin
      a = va; b = vb; cin = 1'b0; #1;
      $display("  %0s: %b(%0d) + %b(%0d) = %b(signed %0d, unsigned %0d) C=%b V=%b",
               label, a, $signed(a), b, $signed(b),
               s, $signed(s), s, cout, v);
    end
  endtask

  initial begin
    errors    = 0;
    n_neither = 0; n_conly = 0; n_vonly = 0; n_both = 0;
    cin       = 1'b0;

    // Pass 1: addition. V rules vs ground truth, plus the C/V census.
    for (ia = 0; ia < 16; ia = ia + 1) begin
      for (ib = 0; ib < 16; ib = ib + 1) begin
        a = ia[3:0]; b = ib[3:0]; #1;
        sa = (ia > 7) ? ia - 16 : ia;
        sb = (ib > 7) ? ib - 16 : ib;
        true_sum = sa + sb;
        v_true   = (true_sum < -8) || (true_sum > 7);
        if (v !== v_true || v_sign !== v_true || v_wide !== v_true) begin
          errors = errors + 1;
          $display("FAIL tb_ovf4: %0d+%0d v=%b v_sign=%b v_wide=%b truth=%b",
                   sa, sb, v, v_sign, v_wide, v_true);
        end
        case ({cout, v})
          2'b00: n_neither = n_neither + 1;
          2'b01: n_vonly   = n_vonly   + 1;
          2'b10: n_conly   = n_conly   + 1;
          2'b11: n_both    = n_both    + 1;
        endcase
      end
    end

    if (n_neither !== 108 || n_conly !== 84 || n_vonly !== 28 || n_both !== 36)
    begin
      errors = errors + 1;
      $display("FAIL tb_ovf4: census neither=%0d C-only=%0d V-only=%0d both=%0d",
               n_neither, n_conly, n_vonly, n_both);
    end

    // Pass 2: subtraction is a + ~b + 1; the same V detects a - b overflow.
    cin = 1'b1;
    for (ia = 0; ia < 16; ia = ia + 1) begin
      for (ib = 0; ib < 16; ib = ib + 1) begin
        a = ia[3:0]; b = ~ib[3:0]; #1;
        sa = (ia > 7) ? ia - 16 : ia;
        sb = (ib > 7) ? ib - 16 : ib;
        true_sum = sa - sb;
        v_true   = (true_sum < -8) || (true_sum > 7);
        if (v !== v_true) begin
          errors = errors + 1;
          $display("FAIL tb_ovf4: %0d-%0d v=%b truth=%b", sa, sb, v, v_true);
        end
      end
    end

    if (ia !== 16 || errors !== 0)
      $fatal(1, "FAIL tb_ovf4: %0d error(s)", errors);

    $display("V rules 1,2,3 vs ground truth: 0 mismatches in 256 add pairs");
    $display("V and C independence: neither=%0d C-only=%0d V-only=%0d both=%0d",
             n_neither, n_conly, n_vonly, n_both);
    $display("subtraction V via a+~b+1: 0 mismatches in 256 pairs");
    census(4'b0101, 4'b0100, "5+4   (V, no C)");
    census(4'b1001, 4'b1010, "-7+-6 (V and C)");
    census(4'b1111, 4'b0001, "-1+1  (C, no V)");
    census(4'b0011, 4'b0010, "3+2   (neither)");
    $display("PASS tb_ovf4 (V costs one XOR on carries the adder already has)");
    $finish;
  end

endmodule

`default_nettype wire
