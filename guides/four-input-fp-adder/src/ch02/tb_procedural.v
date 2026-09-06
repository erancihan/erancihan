`timescale 1ns/1ps
`default_nettype none

// Procedural blocks, read-only depth: initial vs always, functions vs tasks,
// and the one point that matters most -- a for loop in a function is unrolled
// hardware and consumes no simulation time, while a loop with a delay in its
// body consumes time because of the delay, not because of the loop.
module tb_procedural;

  reg [7:0] data;
  reg [3:0] pc;
  integer   errors = 0;
  integer   i;
  real      t_before, t_after;

  function [3:0] popcount8;
    input [7:0] v;
    integer j;
    begin
      popcount8 = 4'd0;
      for (j = 0; j < 8; j = j + 1)
        popcount8 = popcount8 + {3'b0, v[j]};
    end
  endfunction

  function automatic integer fact;
    input integer n;
    begin
      if (n <= 1) fact = 1;
      else        fact = n * fact(n - 1);
    end
  endfunction

  task print_it;
    input [7:0] v;
    begin
      $display("  task saw %b", v);
    end
  endtask

  initial begin
    data = 8'b0011_0110;

    $display("-- a for loop inside a function is unrolled, not iterated");
    t_before = $realtime;
    pc       = popcount8(data);
    t_after  = $realtime;
    $display("  popcount8(%b) = %0d, computed between t=%0.3f and t=%0.3f",
             data, pc, t_before, t_after);
    if (pc !== 4'd4) begin
      errors = errors + 1; $display("FAIL popcount8");
    end
    if (t_after != t_before) begin
      errors = errors + 1; $display("FAIL the unrolled loop consumed simulation time");
    end

    $display("-- a loop whose body has a delay does consume time");
    for (i = 0; i < 3; i = i + 1)
      #1 $display("  loop iteration %0d at t=%0.3f", i, $realtime);
    if ($realtime != t_before + 3.0) begin
      errors = errors + 1; $display("FAIL delayed loop advanced time by the wrong amount");
    end

    $display("-- recursion needs `automatic'");
    $display("  fact(5) = %0d", fact(5));
    if (fact(5) !== 120) begin
      errors = errors + 1; $display("FAIL fact(5)");
    end

    $display("-- a task is a statement, not an expression");
    print_it(data);

    if (errors == 0) $display("PASS tb_procedural");
    else             $fatal(1, "FAIL tb_procedural: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
