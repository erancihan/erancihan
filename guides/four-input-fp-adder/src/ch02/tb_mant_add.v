`timescale 1ns/1ps
`default_nettype none

// Runs the correct and the broken mantissa adder side by side on the same
// stimulus. The correct one is checked against a 25-bit golden sum; the
// broken one is checked against the wrong answer it is guaranteed to give,
// so that this file fails if the trap ever stops reproducing.
module tb_mant_add;

  localparam W = 24;

  reg  [W-1:0] a, b;

  wire [W-1:0] good_sum,  bad_sum;
  wire         good_carry, bad_carry;

  integer errors = 0;
  integer n;
  reg [W:0] golden;

  mant_add     #(.W(W)) u_good (.a(a), .b(b), .sum(good_sum), .carry(good_carry));
  bad_mant_add #(.W(W)) u_bad  (.a(a), .b(b), .sum(bad_sum),  .carry(bad_carry));

  initial begin
    // The case that matters: two normalised significands that overflow.
    a = 24'hFF_FFFF; b = 24'h00_0001; #1;
    golden = {1'b0, a} + {1'b0, b};
    $display("a=%h b=%h", a, b);
    $display("  correct : carry=%b sum=%h   (25-bit value %h)", good_carry, good_sum, {good_carry, good_sum});
    $display("  broken  : carry=%b sum=%h   (25-bit value %h)", bad_carry,  bad_sum,  {bad_carry,  bad_sum});
    if ({good_carry, good_sum} !== golden) begin
      errors = errors + 1;
      $display("FAIL mant_add gave %h, golden %h", {good_carry, good_sum}, golden);
    end
    if (bad_carry !== 1'b0) begin
      errors = errors + 1;
      $display("FAIL the trap did not reproduce: bad_mant_add reported a carry");
    end

    // Random soak: the correct adder must always match, the broken one must
    // always report carry=0 no matter how big the true sum is.
    for (n = 0; n < 500; n = n + 1) begin
      a = $urandom;
      b = $urandom;
      #1;
      golden = {1'b0, a} + {1'b0, b};
      if ({good_carry, good_sum} !== golden) begin
        errors = errors + 1;
        $display("FAIL mant_add a=%h b=%h got %h golden %h", a, b, {good_carry, good_sum}, golden);
      end
      if (bad_carry !== 1'b0) begin
        errors = errors + 1;
        $display("FAIL bad_mant_add unexpectedly produced carry=1 at a=%h b=%h", a, b);
      end
    end

    if (errors == 0)
      $display("PASS tb_mant_add (mant_add correct on 501 cases; bad_mant_add carry stuck at 0)");
    else
      $fatal(1, "FAIL tb_mant_add: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
