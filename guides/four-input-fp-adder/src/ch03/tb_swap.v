`timescale 1ns/1ps
`default_nettype none

// Two lines, two operators, two completely different circuits.
module tb_swap;

  localparam CLK_HALF = 5;

  reg clk = 1'b0;
  always #CLK_HALF clk = ~clk;

  reg [7:0] a_nb, b_nb, a_bl, b_bl;

  integer errors = 0;

  // Non-blocking: both right-hand sides are sampled before either left-hand
  // side is updated, so the values exchange.
  always @(posedge clk) begin
    a_nb <= b_nb;
    b_nb <= a_nb;
  end

  // Blocking: line 1 overwrites a_bl, line 2 reads the new value. This is a
  // copy, and the old a_bl is gone for good.
  always @(posedge clk) begin
    a_bl = b_bl;
    b_bl = a_bl;
  end

  task check;
    input [7:0] e_anb;
    input [7:0] e_bnb;
    input [7:0] e_abl;
    input [7:0] e_bbl;
    begin
      $display("  t=%0d   a_nb=%h b_nb=%h  |  a_bl=%h b_bl=%h",
               $time, a_nb, b_nb, a_bl, b_bl);
      if (a_nb !== e_anb || b_nb !== e_bnb || a_bl !== e_abl || b_bl !== e_bbl) begin
        errors = errors + 1;
        $display("FAIL t=%0d: expected %h %h | %h %h", $time, e_anb, e_bnb, e_abl, e_bbl);
      end
    end
  endtask

  initial begin
    a_nb = 8'h11; b_nb = 8'h22;
    a_bl = 8'h11; b_bl = 8'h22;

    #1  check(8'h11, 8'h22, 8'h11, 8'h22);   // before any edge
    #10 check(8'h22, 8'h11, 8'h22, 8'h22);   // after the first edge
    #10 check(8'h11, 8'h22, 8'h22, 8'h22);   // after the second

    if (errors == 0) $display("PASS tb_swap (nba swaps, blocking destroys a value)");
    else             $fatal(1, "tb_swap: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
