`timescale 1ns/1ps
`default_nettype none

// Chapter 13: a self-checking test that this build's IMMEDIATE assertions
// are alive.
//
// Chapter 5's "Assertions, and What You Can Actually Run Here" measured that
// -gno-assertions silently DISCARDS a concurrent assertion it can parse.
// This session measured something worse and simpler: -gno-assertions also
// deletes immediate assertions -- the ones Icarus fully supports. A failing
// `assert ... else $error` then compiles clean, runs to the end, and reports
// nothing at all.
//
// A claim like that should not be a remembered fact, so this file turns it
// into a target. Two assertions run: one that must hold and one that must
// FAIL, each counting into `fired` from its else branch. At the end the
// testbench checks that exactly one fired and that the passing one's pass
// statement executed. Under the default flags (and under -gassertions and
// -gsupported-assertions) that is a green run whose transcript carries the
// ERROR block chapter 5 argues for -- file, line, simulation time and scope,
// none of which the author wrote. Under -gno-assertions the same file
// compiles with the same zero output and prints
//
//   FAIL tb_assert_live: pass statement ran 0 times, expected 4 -- assertions
//   were compiled out
//
// -- the flag deletes the whole statement, pass branch and else branch
// alike, in a file whose compile output is still zero bytes.
//
// The reproduction commands are in README.md; the manifest cannot express a
// second -g flag, so only the default build is a harness target.
module tb_assert_live;

  reg  [3:0] q;
  integer    fired, passes, i;

  initial begin
    fired = 0; passes = 0;

    for (i = 0; i < 4; i = i + 1) begin
      #1;
      q = i[3:0];

      // Holds for every q driven here. The PASS statement executes -- which
      // is the measured difference between immediate `assert` and immediate
      // `cover`, whose pass statement never runs at all.
      assert (q <= 4'd3) passes = passes + 1;
        else begin fired = fired + 1; $error("q=%0d exceeds 3", q); end
    end

    // Deliberately false: the check that proves assertions are still here.
    #1;
    q = 4'd9;
    assert (q <= 4'd3)
      else begin fired = fired + 1; $error("deliberate: q=%0d exceeds 3", q); end

    if (passes !== 4)
      $display("FAIL tb_assert_live: pass statement ran %0d times, expected 4 -- assertions were compiled out",
               passes);
    else if (fired !== 1)
      $display("FAIL tb_assert_live: the deliberate failure never reported (fired=%0d)", fired);
    else
      $display("PASS tb_assert_live (4 pass statements, 1 deliberate failure reported)");
    $finish;
  end
endmodule

`default_nettype wire
