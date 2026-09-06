`timescale 1ns/1ps
`default_nettype none

// Checks comb_max on 512 random pairs plus the boundary cases, and confirms
// that the output tracks the inputs with no clock anywhere in the design.
module tb_comb_max;

  reg  [7:0] a, b;
  wire [7:0] y;

  integer errors = 0;
  integer n;
  reg [7:0] want;

  comb_max dut (.a(a), .b(b), .y(y));

  task check;
    begin
      want = (a > b) ? a : b;
      if (y !== want) begin
        errors = errors + 1;
        $display("FAIL a=%0d b=%0d : got %0d want %0d", a, b, y, want);
      end
    end
  endtask

  initial begin
    a = 8'd0;   b = 8'd0;   #1 check;
    a = 8'd255; b = 8'd0;   #1 check;
    a = 8'd0;   b = 8'd255; #1 check;
    a = 8'd42;  b = 8'd42;  #1 check;

    for (n = 0; n < 512; n = n + 1) begin
      a = $urandom;
      b = $urandom;
      #1 check;
    end

    // No clock edge ever happened, and yet the output has been following the
    // inputs the whole time. That is combinational logic.
    a = 8'd100; b = 8'd200; #1;
    $display("a=%0d b=%0d -> y=%0d   (no clock anywhere in the design)", a, b, y);

    if (errors == 0) $display("PASS tb_comb_max (516 cases)");
    else             $fatal(1, "FAIL tb_comb_max: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
