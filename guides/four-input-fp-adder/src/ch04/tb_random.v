`timescale 1ns/1ps
`default_nettype none

// $random in Icarus is a fixed pseudo-random sequence. This testbench asserts
// the exact values, which is only possible because they are the same on every
// run, on every recompile, and on every machine running this simulator.
//
// If this file ever starts failing, the stream changed - and every "random"
// regression written against it changed with it.
module tb_random;

  integer i;
  integer errors = 0;
  integer seed;

  reg [31:0] got   [0:3];
  reg [31:0] want  [0:3];
  reg [31:0] gotu  [0:3];
  reg [31:0] wantu [0:3];
  reg  [7:0] byte_from_random;
  integer    signed_sample;
  integer    negatives;

  task expect32(input [31:0] g, input [31:0] w, input [255:0] what);
    begin
      if (g !== w) begin
        errors = errors + 1;
        $display("FAIL tb_random: %0s got %08h want %08h", what, g, w);
      end
    end
  endtask

  initial begin
    want[0] = 32'h12153524; want[1] = 32'hc0895e81;
    want[2] = 32'h8484d609; want[3] = 32'hb1f05663;

    for (i = 0; i < 4; i = i + 1) got[i] = $random;
    $display("  $random           : %08h %08h %08h %08h",
             got[0], got[1], got[2], got[3]);
    for (i = 0; i < 4; i = i + 1) expect32(got[i], want[i], "$random");

    wantu[0] = 32'h92153524; wantu[1] = 32'h40895e81;
    wantu[2] = 32'h0484d609; wantu[3] = 32'h31f05663;

    for (i = 0; i < 4; i = i + 1) gotu[i] = $urandom;
    $display("  $urandom          : %08h %08h %08h %08h",
             gotu[0], gotu[1], gotu[2], gotu[3]);
    for (i = 0; i < 4; i = i + 1) expect32(gotu[i], wantu[i], "$urandom");

    // The seed argument is an inout: it must be a variable, and it is updated
    // in place. A literal is accepted by iverilog and rejected by vvp at load
    // time.
    seed = 7;
    for (i = 0; i < 4; i = i + 1) got[i] = $random(seed);
    $display("  $random(seed=7)   : %08h %08h %08h %08h  seed is now %0d",
             got[0], got[1], got[2], got[3], seed);
    expect32(got[0], 32'h80076200, "$random(7)[0]");
    if (seed !== -1368524349) begin
      errors = errors + 1;
      $display("FAIL tb_random: seed variable is %0d, expected -1368524349", seed);
    end

    // $random is SIGNED. Chapter 2 measured the same thing on the modulo form.
    negatives = 0;
    $write("  six signed draws  :");
    for (i = 0; i < 6; i = i + 1) begin
      signed_sample = $random;
      $write(" %0d", signed_sample);
      if (signed_sample < 0) negatives = negatives + 1;
    end
    $display("");
    byte_from_random = $urandom_range(0, 255);
    $display("  $urandom_range    : %0d %0d %0d %0d",
             $urandom_range(0, 99), $urandom_range(0, 99),
             $urandom_range(0, 99), $urandom_range(0, 99));
    if (negatives == 0) begin
      errors = errors + 1;
      $display("FAIL tb_random: six draws and none of them negative");
    end
    if (byte_from_random > 255) begin
      errors = errors + 1;
      $display("FAIL tb_random: $urandom_range went out of range");
    end

    if (errors == 0) $display("PASS tb_random (the stream is fixed)");
    else             $fatal(1, "%0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
