`timescale 1ns/1ps
`default_nettype none

// Two things about combinational blocks that no textbook diagram shows.
//
// Top half: an always @(*) block does not self-start. A variable initialised
// at its declaration generates no event, so the block never runs; the same
// variable assigned from an initial block does generate one.
//
// Bottom half: a three-deep cascade of combinational blocks settles over
// several delta cycles at one value of $time, and it is completely settled
// before the first #0 returns.
module tb_delta;

  reg a_decl = 1'b0;      // initialised at declaration: no event
  reg b_init;             // assigned from an initial block: an event
  reg ya, yb;

  reg p;
  reg s1, s2, s3;

  integer errors = 0;

  always @(*) ya = ~a_decl;
  always @(*) yb = ~b_init;

  always @(*) s1 = ~p;
  always @(*) s2 = ~s1;
  always @(*) s3 = ~s2;

  initial b_init = 1'b0;

  task check;
    input got;
    input exp;
    input [80*8:1] what;
    begin
      if (got !== exp) begin
        errors = errors + 1;
        $display("FAIL %0s: got %b, expected %b", what, got, exp);
      end
    end
  endtask

  initial begin
    #1;
    $display("  t=%0d  a_decl=%b -> ya=%b        b_init=%b -> yb=%b",
             $time, a_decl, ya, b_init, yb);
    check(ya, 1'bx, "block reading a declaration initialiser never ran");
    check(yb, 1'b1, "block reading an initial-block assignment did run");

    p = 1'b0;
    $display("  same time slot, right after 'p = 0' : s1=%b s2=%b s3=%b", s1, s2, s3);
    check(s1, 1'bx, "cascade before the writing process blocks");

    #0;
    $display("  after one  #0                       : s1=%b s2=%b s3=%b", s1, s2, s3);
    check(s1, 1'b1, "s1 after one #0");
    check(s2, 1'b0, "s2 after one #0");
    check(s3, 1'b1, "s3 after one #0");

    #0;
    $display("  after two  #0                       : s1=%b s2=%b s3=%b", s1, s2, s3);
    check(s3, 1'b1, "s3 after two #0 is no different");

    if (errors == 0) $display("PASS tb_delta");
    else             $fatal(1, "tb_delta: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
