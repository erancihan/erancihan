`timescale 1ns/1ps
`default_nettype none

// Every format specifier you will use, printed once, plus the two that will
// mislead you. The checks use $sformat, which formats into a variable instead
// of onto the terminal, so the claims about padding and about unknown values
// are asserted rather than eyeballed.
module tb_print;

  reg  [7:0] v = 8'b0101_1010;      // 90 decimal, 5a hex
  reg  [3:0] partly_unknown = 4'b10x1;
  real       pi = 3.14159;
  integer    errors = 0;

  reg [8*40-1:0] s;

  task expect_text(input [8*40-1:0] got, input [8*40-1:0] want,
                   input [255:0] what);
    begin
      if (got !== want) begin
        errors = errors + 1;
        $display("FAIL tb_print: %0s -> |%0s|, expected |%0s|", what, got, want);
      end
    end
  endtask

  initial begin
    $display("  %%b   |%b|", v);
    $display("  %%d   |%d|", v);
    $display("  %%0d  |%0d|", v);
    $display("  %%h   |%h|  %%0h  |%0h|", v, v);
    $display("  %%o   |%o|", v);
    $display("  %%c   |%c|", 8'd65);
    $display("  %%5d  |%5d|  %%-5d |%-5d|", v, v);
    $display("  %%e |%e| %%f |%f| %%g |%g|", pi, pi, pi);
    $display("  %%m   |%m|");
    $display("  partly unknown: %%b |%b|  %%d |%d|  %%h |%h|",
             partly_unknown, partly_unknown, partly_unknown);

    // %0 means "no padding" on every numeric specifier.
    $sformat(s, "%d", v);   expect_text(s, " 90", "%d of an 8-bit 90");
    $sformat(s, "%0d", v);  expect_text(s, "90",  "%0d of an 8-bit 90");

    // %d and %h collapse a partially unknown value to a bare X. Only %b shows
    // you which bit is unknown, which is why you print binary when chasing x.
    $sformat(s, "%d", partly_unknown); expect_text(s, " X",   "%d of 4'b10x1");
    $sformat(s, "%h", partly_unknown); expect_text(s, "X",    "%h of 4'b10x1");
    $sformat(s, "%b", partly_unknown); expect_text(s, "10x1", "%b of 4'b10x1");

    // $timeformat rewrites every later %t, in $sformat as well as on screen,
    // so the two lines printed here are asserted rather than admired.
    #1 $display("  %%t before $timeformat |%0t|", $time);
    $sformat(s, "%0t", $time); expect_text(s, "1000", "%0t before $timeformat");
    $timeformat(-9, 2, " ns", 10);
    $display("  %%t after  $timeformat |%0t|", $time);
    $sformat(s, "%0t", $time); expect_text(s, "1.00 ns", "%0t after");

    $write("  $write takes no newline");
    $write(" - so a line can be built in pieces\n");

    if (errors == 0) $display("PASS tb_print");
    else             $fatal(1, "%0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
