`timescale 1ns/1ps
`default_nettype none

// Exhaustive: all 4-bit a, all 4-bit b, both carry-ins = 512 cases.
// The structural ripple adder must agree bit for bit with the dataflow one.
module tb_ripple4;

  reg  [3:0] a, b;
  reg        cin;

  wire [3:0] sum_str, sum_flow;
  wire       cout_str, cout_flow;

  integer errors = 0;
  integer i, j, k;
  integer expected;

  ripple4             u_str  (.a(a), .b(b), .cin(cin), .sum(sum_str),  .cout(cout_str));
  adder_ansi #(.W(4)) u_flow (.a(a), .b(b), .cin(cin), .sum(sum_flow), .cout(cout_flow));

  initial begin
    for (i = 0; i < 16; i = i + 1)
      for (j = 0; j < 16; j = j + 1)
        for (k = 0; k < 2; k = k + 1) begin
          a = i[3:0]; b = j[3:0]; cin = k[0];
          #1;
          expected = i + j + k;
          if ({cout_str, sum_str} !== expected[4:0]) begin
            errors = errors + 1;
            $display("FAIL structural %0d+%0d+%0d : got %0d expected %0d",
                     i, j, k, {cout_str, sum_str}, expected);
          end
          if ({cout_str, sum_str} !== {cout_flow, sum_flow}) begin
            errors = errors + 1;
            $display("FAIL structural vs dataflow at %0d+%0d+%0d", i, j, k);
          end
        end

    if (errors == 0)
      $display("PASS tb_ripple4 (512 exhaustive cases, structural == dataflow)");
    else
      $fatal(1, "FAIL tb_ripple4: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
