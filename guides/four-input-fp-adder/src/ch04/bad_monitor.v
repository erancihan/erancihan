`timescale 1ns/1ps
`default_nettype none

// There is exactly one $monitor slot in a simulation. Calling $monitor a
// second time silently discards the first format string, with no diagnostic of
// any kind. Only the "B:" lines appear below.
//
// The PASS line here checks the stimulus, not the monitor - a testbench cannot
// observe how many monitor slots are in use. The evidence for the trap is the
// transcript.
module bad_monitor;

  reg [3:0] a = 4'd0;
  integer   changes = 0;
  integer   errors  = 0;

  always @(a) changes = changes + 1;

  initial begin
    $monitor("A: a=%0d", a);      // registered...
    $monitor("B: a=%0d", a);      // ...and silently replaced. No warning.

    repeat (3) begin #1 a = a + 4'd1; end

    $monitoroff;                  // suspend
    #1 a = a + 4'd1;              // this change is not reported
    $monitoron;                   // resume - and print current values at once
    #1 a = a + 4'd1;
    #1;

    if (changes !== 5) begin
      errors = errors + 1;
      $display("FAIL bad_monitor: saw %0d changes of a, expected 5", changes);
    end
    if (errors == 0) $display("PASS bad_monitor (only the second $monitor ever printed)");
    else             $fatal(1, "%0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
