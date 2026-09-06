`timescale 1ns/1ps
`default_nettype none

// Chapter 9: unit testbench for fp32_align. Nine directed vectors chosen
// from the module's CONTRACT: shifts d = 0,1,2,3 walk a live bit through
// G, R and into sticky in sequence; d = 25 parks the significand's leading
// bit in R (chapter 8's clamp-boundary lesson at module level); d = 26, 27
// and 200 pin the saturation; and one pattern whose sticky comes from
// bit 0 alone. Every expected value was computed by an independent python3
// model first and pasted as a constant -- never read off the DUT.
module tb_align_u;
  reg  [7:0]  e_big, e_sml;
  reg  [23:0] sig;
  wire [23:0] al;
  wire        g, r, s;
  integer errors, checks;
  fp32_align dut (.e_big(e_big), .e_sml(e_sml), .sig_sml(sig),
                  .aligned(al), .g(g), .r(r), .s(s));
  initial begin : watchdog
    #100000;
    $display("FAIL tb_align_u: timeout");
    $fatal(1, "timeout");
  end
  task chk(input [7:0] d, input [23:0] m, input [23:0] eal,
           input eg, input er, input es);
    begin
      e_big = 8'd200; e_sml = 8'd200 - d; sig = m; #1;
      if ({al, g, r, s} !== {eal, eg, er, es}) begin
        errors = errors + 1;
        $display("FAIL tb_align_u d=%0d sig=%h: got %h/%b%b%b want %h/%b%b%b",
                 d, m, al, g, r, s, eal, eg, er, es);
      end
      checks = checks + 1;
    end
  endtask
  initial begin
    errors = 0; checks = 0;
    chk(8'd0,   24'hC90FDB, 24'hC90FDB, 0, 0, 0);
    chk(8'd1,   24'hC90FDB, 24'h6487ED, 1, 0, 0);
    chk(8'd2,   24'hC90FDB, 24'h3243F6, 1, 1, 0);
    chk(8'd3,   24'hC90FDB, 24'h1921FB, 0, 1, 1);
    chk(8'd25,  24'hC90FDB, 24'h000000, 0, 1, 1);  // leading bit parks in R
    chk(8'd26,  24'hC90FDB, 24'h000000, 0, 0, 1);  // all sticky
    chk(8'd27,  24'hC90FDB, 24'h000000, 0, 0, 1);  // clamp: same as 26
    chk(8'd200, 24'hC90FDB, 24'h000000, 0, 0, 1);  // deep clamp (would wrap to 8)
    chk(8'd3,   24'h800001, 24'h100000, 0, 0, 1);  // sticky from bit 0 only
    if (checks !== 9)
      $fatal(1, "FAIL tb_align_u: %0d checks ran, expected 9", checks);
    if (errors !== 0)
      $fatal(1, "FAIL tb_align_u: %0d error(s)", errors);
    $display("PASS tb_align_u (9 directed)");
    $finish;
  end
endmodule

`default_nettype wire
