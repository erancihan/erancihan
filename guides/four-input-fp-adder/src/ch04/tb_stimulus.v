`timescale 1ns/1ps
`default_nettype none

// How stimulus reaches the DUT: cumulative delays, the intra-assignment delay
// that looks like them and is not, and a task that packages a whole transfer
// so the test reads like a list of transactions.
module tb_stimulus;

  reg  [7:0] a = 8'h00, b = 8'h00;
  wire [7:0] sum;
  wire       cout;

  // The right-hand side of the intra-assignment delay below. It changes at
  // t=25, in the middle of that delay, so the two delay forms cannot produce
  // the same log: an example that demonstrates a distinction its own checks
  // cannot detect is a demonstration, not a test.
  reg  [7:0] src = 8'h20;

  integer errors = 0;
  integer i;

  reg [23:0] log [0:5];      // {time[15:0], a[7:0]} at each change of a
  integer    n_log = 0;
  reg [15:0] tnow;

  adder8 dut (.a(a), .b(b), .sum(sum), .cout(cout));

  always @(a) begin
    tnow = $time;            // $time is a function call; you cannot index one
    if (n_log < 6) log[n_log] = {tnow, a};
    n_log = n_log + 1;
  end

  initial #25 src = 8'h99;

  // A task may contain delays; a function may not. That is the whole reason
  // stimulus lives in tasks. `automatic` gives each call its own copy of the
  // arguments, which costs nothing and stops two concurrent calls colliding.
  //
  // Every vector states the carry it expects as well as the sum. A DUT output
  // that no testbench reads is an output that no testbench tests: adder8's
  // cout was connected in three files here and checked in none of them, so
  // tying it to a constant used to give a clean green run.
  task automatic drive(input [7:0] va, input [7:0] vb,
                       input [7:0] expected, input expected_cout);
    begin
      a = va;
      b = vb;
      #1;
      if (sum !== expected || cout !== expected_cout) begin
        errors = errors + 1;
        $display("FAIL tb_stimulus: %02h + %02h = %b_%02h, expected %b_%02h",
                 va, vb, cout, sum, expected_cout, expected);
      end else
        $display("  drive: t=%0t  %02h + %02h = %b_%02h",
                 $time, va, vb, cout, sum);
    end
  endtask

  task check_time(input integer idx, input integer t, input [7:0] val);
    begin
      if (log[idx] !== {t[15:0], val}) begin
        errors = errors + 1;
        $display("FAIL tb_stimulus: change %0d was {%0d, %02h}, expected {%0d, %02h}",
                 idx, log[idx][23:8], log[idx][7:0], t, val);
      end
    end
  endtask

  initial begin
    // Delays inside an initial block are CUMULATIVE, not absolute.
    a = 8'h01;                 // t = 0
    #10;                       // t = 10
    a = 8'h0f;                 // still t = 10
    #10 a = 8'hff;             // "wait 10, then assign": t = 20
    a = #10 src;               // intra-assignment: src read now (20), assigned
                               // at t = 30, after src itself became 99 at t=25
    #10;                       // t = 40

    for (i = 0; i < 4; i = i + 1)
      $display("  change %0d: t=%0d ns  a=%02h", i, log[i][23:8], log[i][7:0]);

    check_time(0, 0,  8'h01);
    check_time(1, 10, 8'h0f);
    check_time(2, 20, 8'hff);
    check_time(3, 30, 8'h20);

    // A directed vector table, read as transactions.
    for (i = 0; i < 3; i = i + 1) begin
      drive(8'h01 + i[7:0], 8'h02, 8'h03 + i[7:0], 1'b0);
      #1;
    end

    // Three more chosen for the carry alone: a wrap from the top bit, a wrap
    // from two set top bits, and the largest sum that does not wrap.
    drive(8'hff, 8'h01, 8'h00, 1'b1);   #1;
    drive(8'h80, 8'h80, 8'h00, 1'b1);   #1;
    drive(8'h7f, 8'h01, 8'h80, 1'b0);   #1;

    if (errors == 0) $display("PASS tb_stimulus (%0d changes of a)", n_log);
    else             $fatal(1, "%0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
