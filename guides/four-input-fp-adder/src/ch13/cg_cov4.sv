// Chapter 13: the covergroup form of three of chapter 12's 105 coverage
// dimensions, written as IEEE 1800 clause 19 prescribes. Icarus 13.0 cannot
// parse it at ANY -g level -- this file exists to pin that boundary
// mechanically, the way ch05's bad_covergroup.v pins the bare case. It is an
// xfail target: the regression FAILS if a future Icarus starts accepting it.
// ch05's bad_covergroup.v pins the minimal form; this pins the ported form.
`timescale 1ns/1ps
module cg_cov4;
  reg        clk = 1'b0;
  reg [31:0] a, b;
  reg        ng, nr, ns, round_up;
  function automatic [2:0] fclass(input [31:0] x);
    fclass = x[30:23] == 8'hFF ? (|x[22:0] ? 3'd4 : 3'd3)
           : x[30:23] == 8'h00 ? (|x[22:0] ? 3'd1 : 3'd0) : 3'd2;
  endfunction
  covergroup cg @(posedge clk);
    cp_class_a: coverpoint fclass(a) {
      bins zero = {0}; bins subn = {1}; bins norm = {2};
      bins inf  = {3}; bins nan  = {4};
    }
    cp_expd: coverpoint (a[30:23] > b[30:23] ? a[30:23]-b[30:23]
                                             : b[30:23]-a[30:23]) {
      bins d0 = {0}; bins d_near = {[1:2]};
      bins d_mid = {[3:24]}; bins d_far = {[25:255]};
    }
    cp_round: coverpoint {ng, nr, ns, round_up} {
      bins tie_up   = {4'b1001};
      bins tie_down = {4'b1000};
      wildcard bins up = {4'b???1};
    }
    x_class_expd: cross cp_class_a, cp_expd;
  endgroup
endmodule
