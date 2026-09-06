`timescale 1ns/1ps
`default_nettype none

// What a net actually is: a value resolved from every driver attached to it.
// Two ordinary wires that disagree resolve to x -- with no warning from
// Icarus. wand and wor resolve differently. supply0/supply1 are constants.
module tb_drivers;

  reg a, b;

  wire conflict;
  wand wired_and;
  wor  wired_or;

  wire [3:0] rails;
  supply1 vdd;
  supply0 gnd;

  // Net declaration assignment: declaration and driver in one line.
  wire nda = a & b;

  integer errors = 0;

  // Two drivers on one net. In silicon this is a short circuit.
  assign conflict = a;
  assign conflict = b;

  assign wired_and = a;
  assign wired_and = b;

  assign wired_or = a;
  assign wired_or = b;

  assign rails = {vdd, gnd, vdd, gnd};

  task probe;
    input exp_conflict;
    input exp_and;
    input exp_or;
    begin
      $display("  a=%b b=%b -> wire=%b  wand=%b  wor=%b  (nda = a&b = %b)",
               a, b, conflict, wired_and, wired_or, nda);
      if (conflict !== exp_conflict || wired_and !== exp_and || wired_or !== exp_or) begin
        errors = errors + 1;
        $display("FAIL a=%b b=%b : wanted wire=%b wand=%b wor=%b",
                 a, b, exp_conflict, exp_and, exp_or);
      end
    end
  endtask

  initial begin
    $display("-- two drivers on one net");
    a = 1'b1; b = 1'b0; #1 probe(1'bx, 1'b0, 1'b1);
    a = 1'b1; b = 1'b1; #1 probe(1'b1, 1'b1, 1'b1);
    a = 1'b0; b = 1'b0; #1 probe(1'b0, 1'b0, 1'b0);

    $display("-- supply nets are constants");
    $display("  {vdd,gnd,vdd,gnd} = %b", rails);
    if (rails !== 4'b1010) begin
      errors = errors + 1; $display("FAIL supply rails");
    end

    if (errors == 0) $display("PASS tb_drivers");
    else             $fatal(1, "FAIL tb_drivers: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
