`timescale 1ns/1ps
`default_nettype none

// Exhaustive over all 256 inputs against an independently computed golden.
module tb_lzc8;

  reg  [7:0] x;
  wire [3:0] count;

  integer errors = 0;
  integer i, j;
  integer want;
  reg     found;

  lzc8 dut (.x(x), .count(count));

  initial begin
    for (i = 0; i < 256; i = i + 1) begin
      x = i[7:0];
      #1;
      want  = 8;
      found = 1'b0;
      for (j = 7; j >= 0; j = j - 1)
        if (!found && x[j]) begin
          want  = 7 - j;
          found = 1'b1;
        end
      if (count !== want[3:0]) begin
        errors = errors + 1;
        $display("FAIL x=%b : got %0d expected %0d", x, count, want);
      end
    end

    x = 8'b0011_0110; #1 $display("lzc8(%b) = %0d", x, count);
    x = 8'b0000_0001; #1 $display("lzc8(%b) = %0d", x, count);
    x = 8'b0000_0000; #1 $display("lzc8(%b) = %0d", x, count);

    if (errors == 0) $display("PASS tb_lzc8 (256 exhaustive)");
    else             $fatal(1, "FAIL tb_lzc8: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
