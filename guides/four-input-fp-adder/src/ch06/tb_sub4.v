`timescale 1ns/1ps
`default_nettype none

// Chapter 6: subtraction by complement, run on chapter 2's actual ripple4.
// The claim: a - b = a + ~b + 1 (mod 16), so the SAME four-full-adder chain
// subtracts when b is inverted and the carry-in is tied high. Checked for
// all 256 (a, b) pairs, together with the carry-out-is-not-borrow property
// cout == (a >= b).
module tb_sub4;

  reg  [3:0] a, b;
  wire [3:0] diff;
  wire       cout;

  integer ia, ib, errors;

  // b through inverters, carry-in tied to 1: the adder is now a subtractor.
  ripple4 dut (.a(a), .b(~b), .cin(1'b1), .sum(diff), .cout(cout));

  initial begin : watchdog
    #100000;
    $display("FAIL tb_sub4: timeout at %0t, the sweep never finished", $time);
    $fatal(1, "timeout");
  end

  initial begin
    errors = 0;
    for (ia = 0; ia < 16; ia = ia + 1) begin
      for (ib = 0; ib < 16; ib = ib + 1) begin
        a = ia[3:0];
        b = ib[3:0];
        #1;
        if (diff !== ((ia - ib) & 15)) begin
          errors = errors + 1;
          $display("FAIL tb_sub4: %0d-%0d diff=%b expected %b",
                   ia, ib, diff, (ia - ib) & 15);
        end
        if (cout !== (ia >= ib)) begin
          errors = errors + 1;
          $display("FAIL tb_sub4: %0d-%0d cout=%b expected %b (a>=b)",
                   ia, ib, cout, ia >= ib);
        end
      end
    end

    // Guard: a sweep that ran zero iterations must not pass.
    if (ia !== 16 || errors !== 0) begin
      $display("FAIL tb_sub4: %0d errors", errors);
      $fatal(1, "%0d error(s)", errors);
    end

    $display("subtract-via-complement on ripple4: %0d errors in 256 cases",
             errors);
    a = 4'd13; b = 4'd6; #1;
    $display("example: 13-6: a=%b b=%b ~b=%b diff=%b (%0d) cout=%b",
             a, b, ~b, diff, diff, cout);
    $display("PASS tb_sub4 (one adder, one inverter row, cin=1)");
    $finish;
  end

endmodule

`default_nettype wire
