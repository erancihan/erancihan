`timescale 1ns/1ps
`default_nettype none

// A PASS here means both sensitivity-list traps still reproduce: the
// incomplete list goes stale, and @(*) still cannot see a signal that is only
// read inside a called function.
module tb_sens;

  reg a, b, sel;
  wire y_bad, y_full, y_star;

  reg  [3:0] p, q;
  wire [3:0] y_auto, y_manual;

  integer errors = 0;

  mux2_bad_sens  u_bad  (.a(a), .b(b), .sel(sel), .y(y_bad));
  mux2_full_sens u_full (.a(a), .b(b), .sel(sel), .y(y_full));
  mux2_star      u_star (.a(a), .b(b), .sel(sel), .y(y_star));

  func_sens      u_func (.p(p), .q(q), .y_auto(y_auto), .y_manual(y_manual));

  task step;
    input        na;
    input        nb;
    input        nsel;
    input        e_bad;
    input        e_good;
    input [40*8:1] note;
    begin
      a = na; b = nb; sel = nsel;
      #1;
      $display("  a=%b b=%b sel=%b | y_bad=%b y_full=%b y_star=%b   %0s",
               a, b, sel, y_bad, y_full, y_star, note);
      if (y_full !== e_good || y_star !== e_good) begin
        errors = errors + 1;
        $display("FAIL correct muxes: expected %b", e_good);
      end
      if (y_bad !== e_bad) begin
        errors = errors + 1;
        $display("FAIL stale mux no longer reproduces: got %b, wanted %b", y_bad, e_bad);
      end
    end
  endtask

  task fstep;
    input [3:0] np;
    input [3:0] nq;
    input [3:0] e_auto;
    input [40*8:1] note;
    begin
      p = np; q = nq;
      #1;
      $display("  p=%0d q=%0d | y_auto=%0d y_manual=%0d   %0s",
               p, q, y_auto, y_manual, note);
      if (y_manual !== (p + q)) begin
        errors = errors + 1;
        $display("FAIL f_clean: expected %0d", p + q);
      end
      if (y_auto !== e_auto) begin
        errors = errors + 1;
        $display("FAIL f_hidden no longer reproduces: got %0d, wanted %0d", y_auto, e_auto);
      end
    end
  endtask

  initial begin
    $display("-- an incomplete sensitivity list");
    step(1'b0, 1'b0, 1'b0, 1'b0, 1'b0, "start");
    step(1'b1, 1'b0, 1'b0, 1'b1, 1'b1, "a changed: all three agree");
    step(1'b1, 1'b0, 1'b1, 1'b1, 1'b0, "sel changed: y_bad is stale");
    step(1'b1, 1'b1, 1'b1, 1'b1, 1'b1, "b changed: y_bad stale but right");
    step(1'b0, 1'b1, 1'b1, 1'b1, 1'b1, "a changed: y_bad wakes up");

    $display("-- a signal read only inside a called function");
    fstep(4'd1, 4'd0, 4'd1, "start");
    fstep(4'd1, 4'd5, 4'd1, "only q changed: y_auto did not move");
    fstep(4'd2, 4'd5, 4'd7, "p changed: y_auto catches up");

    if (errors == 0) $display("PASS tb_sens (both traps reproduced)");
    else             $fatal(1, "tb_sens: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
