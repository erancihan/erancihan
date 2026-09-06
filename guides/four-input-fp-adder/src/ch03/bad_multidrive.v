`timescale 1ns/1ps
`default_nettype none

// Two always blocks assigning the same variable. This is legal Verilog,
// last-writer-wins, and describes no gate that exists. A PASS here means the
// simulator still resolves it silently, with no diagnostic of any kind.
module bad_multidrive;

  reg [3:0] r;
  reg trig_a = 1'b0;
  reg trig_b = 1'b0;

  integer errors = 0;

  always @(posedge trig_a) r = 4'ha;
  always @(posedge trig_b) r = 4'h5;

  initial begin
    trig_a = 1'b1;
    #1 $display("  after a pulse on trig_a       : r=%h", r);
    if (r !== 4'ha) begin errors = errors + 1; $display("FAIL expected a"); end

    trig_b = 1'b1;
    #1 $display("  after a pulse on trig_b       : r=%h", r);
    if (r !== 4'h5) begin errors = errors + 1; $display("FAIL expected 5"); end

    trig_a = 1'b0; trig_b = 1'b0;
    #1 trig_a = 1'b1;
    #1 $display("  after trig_a again            : r=%h", r);
    if (r !== 4'ha) begin errors = errors + 1; $display("FAIL expected a"); end

    if (errors == 0) $display("PASS bad_multidrive (whichever block ran last wins)");
    else             $fatal(1, "bad_multidrive: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
