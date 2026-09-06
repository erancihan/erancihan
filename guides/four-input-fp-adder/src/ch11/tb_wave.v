`timescale 1ns/1ps
`default_nettype none

// Chapter 11: the waveform story, self-checked. Both pipeline depths run
// side by side on one bus streaming a quiet carrier (1.0 + 1.0 = 2.0
// every cycle) with ONE marker pair (pi + pi = 2pi) embedded at slot 10.
// The 2-stage result edge lands exactly LAT=2 capturing posedges after
// the marker's input edge, the 4-stage's exactly 4 -- the testbench
// counts the slots, and the chapter's python VCD parse measures the same
// two edges as horizontal distance (and shows why raw cursor subtraction
// under-reads it by half a period: the input edge sits on the DRIVE
// negedge, the result edge on a CAPTURE posedge).
//
// Waveform dump on request only, chapter 4's convention:
//   vvp sim.vvp +dump=/tmp/wave_p.vcd
// Nothing is ever written into the source tree.
module tb_wave;
  localparam integer NSLOT = 24;
  localparam integer MARK  = 10;

  reg         clk, rst_n, in_valid;
  reg  [31:0] a, b;
  wire [31:0] r_p2, r_p4;
  wire        inv_2, ovf_2, inx_2, ov_2;
  wire        inv_4, ovf_4, inx_4, ov_4;
  integer     i, errors, seen2, seen4;

  fp32_add2_p2 dut2 (.clk(clk), .rst_n(rst_n), .in_valid(in_valid),
                     .a(a), .b(b), .result(r_p2), .invalid(inv_2),
                     .overflow(ovf_2), .inexact(inx_2), .out_valid(ov_2));
  fp32_add2_p4 dut4 (.clk(clk), .rst_n(rst_n), .in_valid(in_valid),
                     .a(a), .b(b), .result(r_p4), .invalid(inv_4),
                     .overflow(ovf_4), .inexact(inx_4), .out_valid(ov_4));

  always #5 clk = ~clk;

  initial begin : dumpctl
    reg [8*256-1:0] dumpfile;
    if ($value$plusargs("dump=%s", dumpfile)) begin
      $dumpfile(dumpfile);
      $dumpvars(0, tb_wave);
    end
  end

  initial begin : watchdog
    #100000;
    $display("FAIL tb_wave: timeout");
    $fatal(1, "timeout");
  end

  task err(input [255:0] what);
    begin
      errors = errors + 1;
      $display("FAIL tb_wave slot %0d: %0s", i, what);
    end
  endtask

  initial begin
    clk = 1'b0; rst_n = 1'b0; in_valid = 1'b0;
    a = 32'h3F800000; b = 32'h3F800000;
    errors = 0; seen2 = 0; seen4 = 0;
    repeat (2) @(posedge clk);
    @(negedge clk) rst_n = 1'b1;

    for (i = 0; i < NSLOT; i = i + 1) begin
      @(negedge clk);
      // ---- observe: slot i retires the operands driven at slot i-LAT ----
      if (i < 2) begin
        if (ov_2 !== 1'b0) err("p2 out_valid not 0 during fill");
      end else begin
        if (ov_2 !== 1'b1) err("p2 out_valid not 1 after fill");
        if (r_p2 === 32'h40C90FDB) seen2 = seen2 + 1;
        if ({r_p2, inv_2, ovf_2, inx_2} !==
            {(i - 2 == MARK) ? 32'h40C90FDB : 32'h40000000, 3'b000})
          err("p2 result wrong");
      end
      if (i < 4) begin
        if (ov_4 !== 1'b0) err("p4 out_valid not 0 during fill");
      end else begin
        if (ov_4 !== 1'b1) err("p4 out_valid not 1 after fill");
        if (r_p4 === 32'h40C90FDB) seen4 = seen4 + 1;
        if ({r_p4, inv_4, ovf_4, inx_4} !==
            {(i - 4 == MARK) ? 32'h40C90FDB : 32'h40000000, 3'b000})
          err("p4 result wrong");
      end
      // ---- drive slot i ----
      in_valid = 1'b1;
      if (i == MARK) begin a = 32'h40490FDB; b = 32'h40490FDB; end
      else           begin a = 32'h3F800000; b = 32'h3F800000; end
    end

    if (seen2 !== 1) err("marker 2pi seen on p2 more or less than once");
    if (seen4 !== 1) err("marker 2pi seen on p4 more or less than once");
    if (errors !== 0)
      $fatal(1, "FAIL tb_wave: %0d errors", errors);
    $display("PASS tb_wave (marker pi+pi at slot %0d retired 2pi at slots %0d and %0d: latency 2 and 4 as horizontal distance)",
             MARK, MARK + 2, MARK + 4);
    $finish;
  end
endmodule

`default_nettype wire
