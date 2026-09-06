`timescale 1ns/1ps
`default_nettype none

// All three FSM styles on one clock, driven by one `go` pulse, plus the
// combinational-versus-registered output demonstration.
module tb_fsm;

  localparam CLK_HALF = 5;

  reg clk = 1'b0;
  always #CLK_HALF clk = ~clk;

  reg rst_n, go, x;

  wire       busy1, done1, busy2, done2, busy3, done3;
  wire [1:0] st1, st2, st3;
  wire       mealy_y;
  wire       reg_y;

  integer errors = 0;

  fsm_one_block   u1 (.clk(clk), .rst_n(rst_n), .go(go),
                      .busy(busy1), .done(done1), .state(st1));
  fsm_two_block   u2 (.clk(clk), .rst_n(rst_n), .go(go),
                      .busy(busy2), .done(done2), .state(st2));
  fsm_three_block u3 (.clk(clk), .rst_n(rst_n), .go(go),
                      .busy(busy3), .done(done3), .state(st3));

  mealy_registered u4 (.clk(clk), .rst_n(rst_n), .x(x),
                      .mealy_y(mealy_y), .reg_y(reg_y));

  task sample;
    input [1:0] e_state;
    input       e_busy;
    input       e_done;
    begin
      $display("  t=%0d go=%b | one-block %0d %b %b | two-block %0d %b %b | three-block %0d %b %b",
               $time, go, st1, busy1, done1, st2, busy2, done2, st3, busy3, done3);
      if (st1 !== e_state || st2 !== e_state || st3 !== e_state ||
          busy1 !== e_busy || busy2 !== e_busy || busy3 !== e_busy ||
          done1 !== e_done || done2 !== e_done || done3 !== e_done) begin
        errors = errors + 1;
        $display("FAIL t=%0d: expected state %0d busy %b done %b", $time, e_state, e_busy, e_done);
      end
    end
  endtask

  initial begin
    rst_n = 1'b0;
    go    = 1'b0;
    x     = 1'b0;

    @(negedge clk);
    rst_n = 1'b1;
    sample(2'd0, 1'b0, 1'b0);

    go = 1'b1;
    @(negedge clk) go = 1'b0;
    sample(2'd1, 1'b1, 1'b0);
    @(negedge clk) sample(2'd2, 1'b1, 1'b0);
    @(negedge clk) sample(2'd3, 1'b0, 1'b1);
    @(negedge clk) sample(2'd0, 1'b0, 1'b0);
    @(negedge clk) sample(2'd0, 1'b0, 1'b0);

    $display("-- Mealy responds a cycle earlier than the same term registered");
    x = 1'b1;
    @(negedge clk) $display("  t=%0d x=%b mealy_y=%b reg_y=%b", $time, x, mealy_y, reg_y);
    if (mealy_y !== 1'b1 || reg_y !== 1'b0) begin
      errors = errors + 1;
      $display("FAIL expected mealy_y=1 and reg_y=0 one cycle after x rose");
    end
    @(negedge clk) $display("  t=%0d x=%b mealy_y=%b reg_y=%b", $time, x, mealy_y, reg_y);
    @(negedge clk) $display("  t=%0d x=%b mealy_y=%b reg_y=%b", $time, x, mealy_y, reg_y);

    $display("-- and it moves with no clock edge at all");
    #1 $display("  t=%0d x=%b mealy_y=%b reg_y=%b", $time, x, mealy_y, reg_y);
    x = 1'b0;
    #1 $display("  t=%0d x=%b mealy_y=%b reg_y=%b", $time, x, mealy_y, reg_y);
    if (mealy_y !== 1'b0 || reg_y !== 1'b1) begin
      errors = errors + 1;
      $display("FAIL the Mealy output should have followed x with no edge");
    end

    if (errors == 0) $display("PASS tb_fsm (three styles agree; Mealy is combinational)");
    else             $fatal(1, "tb_fsm: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
