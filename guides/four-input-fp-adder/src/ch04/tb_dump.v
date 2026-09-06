`timescale 1ns/1ps
`default_nettype none

// Waveform dumping, every variant in one file, all of it optional. With no
// plusargs this is an ordinary self-checking testbench that writes nothing to
// disk, which is what a regression wants. Ask for a dump and you get one:
//
//   vvp sim +dump=/tmp/w.vcd            $dumpvars;                (no arguments)
//   vvp sim +dump=/tmp/w.vcd +depth=1   $dumpvars(1, tb_dump);
//   vvp sim +dump=/tmp/w.vcd +depth=2   $dumpvars(2, tb_dump);
//   vvp sim +dump=/tmp/w.vcd +sub       $dumpvars(0, tb_dump.u_pipe);
//   vvp sim +dump=/tmp/w.vcd +sub +window   ... plus $dumpoff / $dumpon
//   vvp sim +dump=/tmp/w.fst -fst       the same, in FST
//
// $dumpfile writes relative to the working directory of vvp, not to this
// source file, so give it an absolute path or run from a build directory.
module tb_dump;

  reg        clk = 1'b0;
  reg  [7:0] d   = 8'h00;
  wire [7:0] q;

  integer errors = 0;
  integer cyc;
  integer ncyc;

  pipe2 u_pipe (.clk(clk), .d(d), .q(q));

  always #5 clk = ~clk;

  initial begin : dumpctl
    reg [8*256-1:0] dumpfile;
    integer depth;
    if ($value$plusargs("dump=%s", dumpfile)) begin
      $dumpfile(dumpfile);
      if ($test$plusargs("sub"))               $dumpvars(0, tb_dump.u_pipe);
      else if ($value$plusargs("depth=%d", depth)) $dumpvars(depth, tb_dump);
      else                                     $dumpvars;
      if ($test$plusargs("window")) begin
        $dumpoff;                              // record nothing for now
        repeat (3) @(posedge clk);
        $dumpon;                               // the interesting window
        repeat (2) @(posedge clk);
        $dumpoff;
      end
    end
  end

  // A watchdog must not wait on the clock. Counting edges reads well and
  // survives a change of period, but it cannot fire when the clock is what
  // died - the commonest cause of a hang, and the trap this chapter's own
  // table calls "reg clk; with no initial value". An absolute #delay needs no
  // edge to arrive, so it fires either way. Scaled from +cycles, in periods,
  // so a long run is not cut short.
  initial begin : watchdog
    integer limit;
    limit = 8;
    if ($value$plusargs("cycles=%d", limit)) ;
    #((limit + 20) * 10);                  // 10 ns period, from the always above
    $display("FAIL tb_dump: timeout at %0t, the test never finished", $time);
    $fatal(1, "timeout");
  end

  // Drive one value per cycle on the far edge, and check on that same edge
  // that the value driven two cycles ago has arrived. The check has to run
  // WHILE the pipe is full: checking only after the stream has drained pins
  // the settled value, which every pipeline of latency two or less produces,
  // so the drain check alone passes a one-stage pipe while printing
  // "latency 2". That was a real defect in this file, caught by rebuilding
  // pipe2 with one flip-flop and watching the test still pass.
  initial begin
    ncyc = 8;
    if ($value$plusargs("cycles=%d", ncyc)) ;   // +cycles=100000 for a big file
    // A check that cannot run is not a check: below three cycles the loop
    // never reaches a full pipe and the verdict would be worth nothing.
    if (ncyc < 3) begin
      errors = errors + 1;
      $display("FAIL tb_dump: +cycles=%0d is too few to see a latency of 2",
               ncyc);
    end
    for (cyc = 0; cyc < ncyc; cyc = cyc + 1) begin
      @(negedge clk) d <= 8'h10 + cyc[7:0];
      if (cyc >= 2 && q !== 8'h10 + (cyc[7:0] - 8'd2)) begin
        errors = errors + 1;                    // the pipe is full from here
        if (errors <= 4)                        // +cycles can be 100000
          $display("FAIL tb_dump: cyc=%0d q=%02h, expected %02h",
                   cyc, q, 8'h10 + (cyc[7:0] - 8'd2));
      end
    end
    repeat (2) @(negedge clk);      // two edges of latency to drain
    if (q !== 8'h10 + (ncyc[7:0] - 8'd1)) begin
      errors = errors + 1;
      $display("FAIL tb_dump: q=%02h at the end, expected %02h",
               q, 8'h10 + (ncyc[7:0] - 8'd1));
    end
    if (errors == 0) $display("PASS tb_dump (latency 2, q=%02h)", q);
    else             $fatal(1, "%0d error(s)", errors);
    $finish;
  end

  // The loop above pins WHAT q holds at one instant per cycle. It cannot pin
  // WHEN q changes, and that is half the property: a flip-flop on the falling
  // edge moves q half a cycle early, is sampled before it moves, and lands on
  // the expected value by construction. A pipe2 rebuilt as a single negedge
  // flop passed this file for exactly that reason. So watch every change of q
  // instead of one instant per cycle, and require clk to be high when it
  // happens - true only at a rising edge, because q updates in the
  // non-blocking region of the same time step that set clk.
  always @(q)
    if (clk !== 1'b1) begin
      errors = errors + 1;
      if (errors <= 4)
        $display("FAIL tb_dump: q became %02h at t=%0t with clk=%b, not on a rising edge",
                 q, $time, clk);
    end

endmodule

`default_nettype wire
