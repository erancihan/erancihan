`timescale 1ns/1ps
`default_nettype none

// `posedge` and `negedge` on a multi-bit signal are evaluated on the LEAST
// SIGNIFICANT BIT only. A vector in an edge expression compiles clean,
// simulates, and does something almost nobody intends. A PASS here means it
// still behaves that way.
//
// The scalar half of the file is the other half of the surprise: on a
// one-bit signal, 0 -> x and x -> 1 both count as rising edges, which is how
// an uninitialised reset fires clocked blocks nobody expected.
module bad_edge;

  reg [3:0] bus = 4'b0000;
  reg       s   = 1'b0;

  integer n_bus  = 0;
  integer n_s    = 0;
  integer errors = 0;

  always @(posedge bus) n_bus = n_bus + 1;
  always @(posedge s)   n_s   = n_s   + 1;

  initial begin
    #1 bus = 4'b1110;         // a large increase: the LSB stays 0
    #1 $display("  bus=%b : rising edges on bus so far = %0d", bus, n_bus);
    if (n_bus !== 0) begin
      errors = errors + 1;
      $display("FAIL expected no edge from 0000 -> 1110");
    end

    #1 bus = 4'b0001;         // a decrease: the LSB goes 0 -> 1
    #1 $display("  bus=%b : rising edges on bus so far = %0d", bus, n_bus);
    if (n_bus !== 1) begin
      errors = errors + 1;
      $display("FAIL expected one edge from 1110 -> 0001");
    end

    #1 s = 1'bx;
    #1 $display("  s=%b    : rising edges on s   so far = %0d", s, n_s);
    #1 s = 1'b1;
    #1 $display("  s=%b    : rising edges on s   so far = %0d", s, n_s);
    if (n_s !== 2) begin
      errors = errors + 1;
      $display("FAIL expected 0->x and x->1 both to count, got %0d", n_s);
    end

    if (errors == 0) $display("PASS bad_edge (edges use the LSB; x transitions count)");
    else             $fatal(1, "bad_edge: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
