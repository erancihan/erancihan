`timescale 1ns/1ps
`default_nettype none

// Exhaustive check of adder_ansi at W=4 (all 512 input combinations),
// plus a spot check of the default W=8 instance and a parameter override.
module tb_adder_ansi;

  reg  [7:0] a8, b8;
  reg        cin;
  wire [7:0] sum8;
  wire       cout8;

  wire [3:0] sum4;
  wire       cout4;

  integer errors = 0;
  integer i, j, k;
  integer expected;

  // Named port connection: the only form the compiler can check.
  adder_ansi          u8 (.a(a8), .b(b8), .cin(cin), .sum(sum8), .cout(cout8));

  // Named parameter override.
  adder_ansi #(.W(4)) u4 (.a(a8[3:0]), .b(b8[3:0]), .cin(cin),
                          .sum(sum4),  .cout(cout4));

  initial begin
    // Exhaustive over the 4-bit instance.
    for (i = 0; i < 16; i = i + 1)
      for (j = 0; j < 16; j = j + 1)
        for (k = 0; k < 2; k = k + 1) begin
          a8  = i[7:0];
          b8  = j[7:0];
          cin = k[0];
          #1;
          expected = i + j + k;
          if ({cout4, sum4} !== expected[4:0]) begin
            errors = errors + 1;
            $display("FAIL W=4 %0d+%0d+%0d : got %0d, expected %0d",
                     i, j, k, {cout4, sum4}, expected);
          end
        end

    // Spot checks on the 8-bit instance, including the carry-out.
    a8 = 8'd200; b8 = 8'd100; cin = 1'b1; #1;
    if ({cout8, sum8} !== 9'd301) begin
      errors = errors + 1;
      $display("FAIL W=8 200+100+1 : got %0d", {cout8, sum8});
    end
    $display("W=8  200+100+1 -> cout=%b sum=%0d", cout8, sum8);

    a8 = 8'd255; b8 = 8'd1; cin = 1'b0; #1;
    if ({cout8, sum8} !== 9'd256) begin
      errors = errors + 1;
      $display("FAIL W=8 255+1 : got %0d", {cout8, sum8});
    end
    $display("W=8  255+1+0   -> cout=%b sum=%0d", cout8, sum8);

    if (errors == 0) $display("PASS tb_adder_ansi (512 exhaustive + 2 directed)");
    else             $fatal(1, "FAIL tb_adder_ansi: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
