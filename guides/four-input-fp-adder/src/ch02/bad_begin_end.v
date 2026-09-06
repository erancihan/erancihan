`timescale 1ns/1ps
`default_nettype none

// DELIBERATELY WRONG. Verilog has no significant whitespace. `if' takes
// exactly ONE statement, so only `b = 1;' is guarded; `c = 1;' runs
// unconditionally no matter how it is indented. This is the Verilog
// equivalent of the goto-fail bug.
// PASS here means the trap reproduced.
module bad_begin_end;

  reg a, b, c;
  integer errors = 0;

  initial begin
    a = 1'b0;

    if (a)
      b = 1'b1;
      c = 1'b1;    // NOT part of the if

    #1;
    $display("a=%b b=%b c=%b", a, b, c);

    if (b !== 1'bx) begin
      errors = errors + 1;
      $display("FAIL expected b to be untouched (x)");
    end
    if (c !== 1'b1) begin
      errors = errors + 1;
      $display("FAIL expected c to have been assigned despite a=0");
    end

    if (errors == 0)
      $display("PASS bad_begin_end: trap reproduced, c was assigned with a=0");
    else
      $fatal(1, "FAIL bad_begin_end: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
