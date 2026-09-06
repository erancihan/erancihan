`timescale 1ns/1ps
`default_nettype none

// The same AND function written three ways: as a continuous assignment to a
// net, as a combinational always block writing a variable, and as a clocked
// always block writing a variable. Only the third one is a register, and the
// declaration keyword predicted nothing.
module tb_regwire;

  localparam CLK_HALF = 5;

  reg clk = 1'b0;
  always #CLK_HALF clk = ~clk;

  reg  a, b;
  wire y_assign;
  reg  y_always;
  reg  y_flop;

  integer errors = 0;

  assign y_assign = a & b;

  always @(*)           y_always = a & b;

  always @(posedge clk) y_flop  <= a & b;

  task check;
    input e_assign;
    input e_always;
    input e_flop;
    begin
      $display("  t=%0d a=%b b=%b | y_assign=%b y_always=%b y_flop=%b",
               $time, a, b, y_assign, y_always, y_flop);
      if (y_assign !== e_assign || y_always !== e_always || y_flop !== e_flop) begin
        errors = errors + 1;
        $display("FAIL t=%0d: expected %b %b %b", $time, e_assign, e_always, e_flop);
      end
    end
  endtask

  initial begin
    a = 1'b1; b = 1'b1;
    #2 check(1'b1, 1'b1, 1'bx);    // before any clock edge
    #4 check(1'b1, 1'b1, 1'b1);    // t=6, after the edge at t=5
    #2 check(1'b1, 1'b1, 1'b1);

    b = 1'b0;
    #1 check(1'b0, 1'b0, 1'b1);    // t=9: the two combinational forms moved together

    if (errors == 0) $display("PASS tb_regwire");
    else             $fatal(1, "tb_regwire: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
