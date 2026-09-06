`timescale 1ns/1ps
`default_nettype none

// DELIBERATELY FRAGILE. A recursive function without `automatic' has ONE
// static copy of its arguments and of its return variable, shared by every
// invocation. Whether that is fatal depends on the order in which the operands
// of the recursive expression are evaluated, which is exactly the kind of
// thing you must not depend on.
//
// This program asserts the OBSERVED Icarus 13.0 behaviour, so PASS means the
// hazard reproduced as described in the chapter — not that the code is good.
//
// Verified on Icarus Verilog 13.0:
//   static, `n * fact(n-1)'  -> 120   (correct, by luck)
//   static, `fact(n-1) * n'  -> 1     (wrong)
//   automatic, either order  -> 120   (correct, by construction)
module bad_recursion;

  integer errors = 0;

  // The chapter's function, minus `automatic'. The recursive call is the
  // SECOND operand, so Icarus reads `n' before the call clobbers it.
  function integer fact_static_n_first;
    input integer n;
    begin
      if (n <= 1) fact_static_n_first = 1;
      else        fact_static_n_first = n * fact_static_n_first(n - 1);
    end
  endfunction

  // The same function with the operands swapped. Nothing else changes.
  function integer fact_static_call_first;
    input integer n;
    begin
      if (n <= 1) fact_static_call_first = 1;
      else        fact_static_call_first = fact_static_call_first(n - 1) * n;
    end
  endfunction

  function automatic integer fact_auto_n_first;
    input integer n;
    begin
      if (n <= 1) fact_auto_n_first = 1;
      else        fact_auto_n_first = n * fact_auto_n_first(n - 1);
    end
  endfunction

  function automatic integer fact_auto_call_first;
    input integer n;
    begin
      if (n <= 1) fact_auto_call_first = 1;
      else        fact_auto_call_first = fact_auto_call_first(n - 1) * n;
    end
  endfunction

  initial begin
    $display("-- recursion without `automatic' is evaluation-order dependent");
    $display("  static    fact = n * fact(n-1) : fact(5) = %0d",
             fact_static_n_first(5));
    $display("  static    fact = fact(n-1) * n : fact(5) = %0d",
             fact_static_call_first(5));
    $display("  automatic fact = n * fact(n-1) : fact(5) = %0d",
             fact_auto_n_first(5));
    $display("  automatic fact = fact(n-1) * n : fact(5) = %0d",
             fact_auto_call_first(5));

    if (fact_static_n_first(5) !== 120) begin
      errors = errors + 1;
      $display("FAIL expected the static n-first ordering to survive with 120");
    end
    if (fact_static_call_first(5) !== 1) begin
      errors = errors + 1;
      $display("FAIL expected the static call-first ordering to collapse to 1");
    end
    if (fact_auto_n_first(5) !== 120 || fact_auto_call_first(5) !== 120) begin
      errors = errors + 1;
      $display("FAIL expected both automatic orderings to give 120");
    end

    if (errors == 0)
      $display("PASS bad_recursion: hazard reproduced, only `automatic' is order-independent");
    else
      $fatal(1, "FAIL bad_recursion: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
