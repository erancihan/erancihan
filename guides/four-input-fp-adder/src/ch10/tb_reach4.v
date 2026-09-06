`timescale 1ns/1ps
`default_nettype none
// ch10: does the rounding-carry renormalize still fire when COMPOSED stage
// outputs feed the adder that must take it? ch08's four directed reachers,
// each rebuilt as a quadruple whose stage-1/2 adds are genuine (all operands
// nonzero, every intermediate an exact halving sum):
//   tree: (hx+hx) + (hy+hy) = X + Y  -> level-2 round_renorm
//   seq : ((qx+qx)+hx) + Y  = X + Y  -> stage-3 round_renorm
// Sampled on the white-box wires dut_t.u_add_r.u_round.round_renorm and
// dut_s.u_add3.u_round.round_renorm (ch09's hierarchical-bin route).
module tb_reach4;
  reg [31:0] a, b, c, d;
  wire [31:0] t_res, s_res;
  wire t_inv, t_ovf, t_inx, s_inv, s_ovf, s_inx;
  fp32_add4_tree dut_t (.a(a), .b(b), .c(c), .d(d), .result(t_res),
                        .invalid(t_inv), .overflow(t_ovf), .inexact(t_inx));
  fp32_add4_seq  dut_s (.a(a), .b(b), .c(c), .d(d), .result(s_res),
                        .invalid(s_inv), .overflow(s_ovf), .inexact(s_inx));

  integer errors, tree_fires, seq_fires, checks;

  // X, Y, half(X), quarter(X), half(Y), expected X+Y
  reg [31:0] xs [0:3]; reg [31:0] ys [0:3];
  reg [31:0] hx [0:3]; reg [31:0] qx [0:3]; reg [31:0] hy [0:3];
  reg [31:0] ex [0:3];
  integer i;

  task check_tree(input [31:0] exp);
    begin
      #1;
      checks = checks + 1;
      if (^t_res === 1'bx || t_res !== exp) begin
        errors = errors + 1;
        $display("FAIL tb_reach4 tree: %h %h %h %h -> %h expected %h", a,b,c,d,t_res,exp);
      end
      if (dut_t.u_add_r.u_round.round_renorm === 1'b1) begin
        tree_fires = tree_fires + 1;
        $display("  tree level-2 round_renorm FIRED: (%h+%h)+(%h+%h) = %h", a,b,c,d,t_res);
      end
    end
  endtask
  task check_seq(input [31:0] exp);
    begin
      #1;
      checks = checks + 1;
      if (^s_res === 1'bx || s_res !== exp) begin
        errors = errors + 1;
        $display("FAIL tb_reach4 seq: %h %h %h %h -> %h expected %h", a,b,c,d,s_res,exp);
      end
      if (dut_s.u_add3.u_round.round_renorm === 1'b1) begin
        seq_fires = seq_fires + 1;
        $display("  seq stage-3 round_renorm FIRED: ((%h+%h)+%h)+%h = %h", a,b,c,d,s_res);
      end
    end
  endtask

  initial begin
    errors = 0; tree_fires = 0; seq_fires = 0; checks = 0;
    // ch08's four reachers (the ONLY renormalize reachers in the corner
    // library; 0 fires in 10^6 random pairs -- ch08 census)
    xs[0]=32'h4B800000; ys[0]=32'hB3800000; ex[0]=32'h4B800000;
    xs[1]=32'h4B000000; ys[1]=32'hBDFFFFFF; ex[1]=32'h4B000000;
    xs[2]=32'h3FFFFFFF; ys[2]=32'h33800000; ex[2]=32'h40000000;
    xs[3]=32'h7F7FFFFF; ys[3]=32'h73000000; ex[3]=32'h7F800000;
    for (i = 0; i < 4; i = i + 1) begin
      hx[i] = {xs[i][31], xs[i][30:23] - 8'd1, xs[i][22:0]};
      qx[i] = {xs[i][31], xs[i][30:23] - 8'd2, xs[i][22:0]};
      hy[i] = {ys[i][31], ys[i][30:23] - 8'd1, ys[i][22:0]};
    end
    for (i = 0; i < 4; i = i + 1) begin
      // tree: both level-1 adds are genuine halving sums
      a = hx[i]; b = hx[i]; c = hy[i]; d = hy[i];
      check_tree(ex[i]);
      // seq: stage1 = qx+qx = hx, stage2 = hx+hx = X, stage3 = X+Y
      a = qx[i]; b = qx[i]; c = hx[i]; d = ys[i];
      check_seq(ex[i]);
    end
    // negative control: a plain quadruple must NOT fire either bin
    a = 32'h3F800000; b = 32'h40000000; c = 32'h40400000; d = 32'h40800000;
    #1;
    checks = checks + 1;
    if (dut_t.u_add_r.u_round.round_renorm !== 1'b0 ||
        dut_s.u_add3.u_round.round_renorm !== 1'b0) begin
      errors = errors + 1;
      $display("FAIL tb_reach4: negative control fired a renorm bin");
    end
    if (checks !== 9) begin errors = errors + 1;
      $display("FAIL tb_reach4: check count %0d != 9", checks); end
    if (tree_fires !== 4 || seq_fires !== 4) begin
      errors = errors + 1;
      $display("FAIL tb_reach4: fires tree=%0d seq=%0d, expected 4/4", tree_fires, seq_fires);
    end
    if (errors == 0)
      $display("PASS tb_reach4 (4 reachers fire the last-stage round_renorm in BOTH structures, from composed inputs)");
    $finish;
  end
  initial begin #1_000_000; $display("FAIL tb_reach4: watchdog"); $fatal(1); end
endmodule
`default_nettype wire
