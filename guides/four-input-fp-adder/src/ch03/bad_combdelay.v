`timescale 1ns/1ps
`default_nettype none

// A `#` delay inside a combinational always block. It compiles clean under
// -Wall, it simulates, it produces plausible numbers, and no synthesis tool
// will ever build it. While the block is waiting out its delay it is not
// sensitive to anything, so input changes arriving in that window are lost.
module bad_combdelay;

  reg a;
  reg y_delay, y_plain;

  integer n_delay = 0;
  integer n_plain = 0;
  integer errors  = 0;

  always @(*) begin
    #3 y_delay = ~a;
  end

  always @(*) y_plain = ~a;

  always @(y_delay) n_delay = n_delay + 1;
  always @(y_plain) n_plain = n_plain + 1;

  task show;
    begin
      $display("  t=%0d a=%b | y_plain=%b y_delay=%b", $time, a, y_plain, y_delay);
    end
  endtask

  initial begin
    a = 1'b0;
    #1 show;                   // y_delay has not been assigned yet
    #3 show;                   // t=4, the delayed block has caught up

    a = 1'b1;                  // t=4
    #2 a = 1'b0;               // t=6, a two-nanosecond pulse
    #4 show;                   // t=10

    $display("  transitions: y_plain=%0d y_delay=%0d", n_plain, n_delay);

    if (y_delay !== 1'b1 || n_delay !== 1) begin
      errors = errors + 1;
      $display("FAIL the delayed block no longer swallows the pulse");
    end
    if (n_plain !== 3) begin
      errors = errors + 1;
      $display("FAIL the plain block should have moved three times, got %0d", n_plain);
    end

    if (errors == 0) $display("PASS bad_combdelay (a pulse invisible to the delayed block)");
    else             $fatal(1, "bad_combdelay: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
