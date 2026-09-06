`timescale 1ns/1ps
`default_nettype none

// Exhaustive over all 16 combinations of lsb, guard, round and sticky.
//
// The reference is deliberately NOT the same boolean algebra as the module.
// It treats {guard, round, sticky} as a 3-bit magnitude and compares it with
// 3'b100, "exactly half an ULP" — greater means round up, smaller means round
// down, equal is the tie that gets broken towards an even LSB.
module tb_round_ne;

  reg  lsb, guard, round, sticky;
  wire round_up;

  integer errors = 0;
  integer i;

  reg [2:0] rem;
  reg       want;

  round_ne dut (.lsb(lsb), .guard(guard), .round(round), .sticky(sticky),
                .round_up(round_up));

  task check;
    begin
      #1;
      rem = {guard, round, sticky};
      if      (rem > 3'b100) want = 1'b1;          // more than half an ULP
      else if (rem < 3'b100) want = 1'b0;          // less than half an ULP
      else                   want = lsb;           // exactly half: to even
      if (round_up !== want) begin
        errors = errors + 1;
        $display("FAIL lsb=%b g=%b r=%b s=%b : got round_up=%b want %b",
                 lsb, guard, round, sticky, round_up, want);
      end
    end
  endtask

  task show;
    input [40*8:1] note;
    begin
      #1;
      $display("  lsb=%b g=%b r=%b s=%b -> round_up=%b   %0s",
               lsb, guard, round, sticky, round_up, note);
    end
  endtask

  initial begin
    for (i = 0; i < 16; i = i + 1) begin
      {lsb, guard, round, sticky} = i[3:0];
      check;
    end

    $display("-- round to nearest even, decided by guard/round/sticky");
    lsb = 1'b0; guard = 1'b0; round = 1'b1; sticky = 1'b1;
    show("below a tie   -> down");
    lsb = 1'b0; guard = 1'b1; round = 1'b0; sticky = 1'b0;
    show("exact tie, LSB even -> stay");
    lsb = 1'b1; guard = 1'b1; round = 1'b0; sticky = 1'b0;
    show("exact tie, LSB odd  -> up");
    lsb = 1'b0; guard = 1'b1; round = 1'b0; sticky = 1'b1;
    show("above a tie   -> up");

    if (errors == 0)
      $display("PASS tb_round_ne (16 exhaustive cases)");
    else
      $fatal(1, "FAIL tb_round_ne: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
