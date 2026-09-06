`timescale 1ns/1ps
`default_nettype none

// Drives sel_mux, latch_if and latch_case from one set of stimulus.
// sel_mux is checked for correctness. The two broken modules are checked for
// the WRONG answer: a PASS here means the latch still reproduces.
module tb_latch;

  reg  [1:0] sel;
  reg  [3:0] a, b, c;
  wire [3:0] y_mux, y_if, y_case;

  integer errors = 0;
  integer i;

  sel_mux    u_mux  (.sel(sel), .a(a), .b(b), .c(c), .y(y_mux));
  latch_if   u_if   (.sel(sel), .a(a), .b(b), .c(c), .y(y_if));
  latch_case u_case (.sel(sel), .a(a), .b(b), .c(c), .y(y_case));

  task show;
    begin
      $display("  sel=%b a=%h b=%h c=%h | y_mux=%h  y_if=%h  y_case=%h",
               sel, a, b, c, y_mux, y_if, y_case);
    end
  endtask

  task expect_mux;
    input [3:0] exp;
    begin
      if (y_mux !== exp) begin
        errors = errors + 1;
        $display("FAIL sel_mux sel=%b: got %h, expected %h", sel, y_mux, exp);
      end
    end
  endtask

  // The deliberately wrong expectation: both broken modules should be stuck
  // on a value they were given earlier.
  task expect_held;
    input [3:0] exp;
    begin
      if (y_if !== exp || y_case !== exp) begin
        errors = errors + 1;
        $display("FAIL latch no longer reproduces: y_if=%h y_case=%h, wanted %h",
                 y_if, y_case, exp);
      end
    end
  endtask

  initial begin
    a = 4'h1; b = 4'h5; c = 4'h9;

    sel = 2'b01; #1; show; expect_mux(4'h5); expect_held(4'h5);
    sel = 2'b11; #1; show; expect_mux(4'h0); expect_held(4'h5);
    b   = 4'ha;  #1; show; expect_mux(4'h0); expect_held(4'h5);
    sel = 2'b00; #1; show; expect_mux(4'h1); expect_held(4'h1);

    // sel_mux on its own, over every selector value and three data patterns.
    for (i = 0; i < 12; i = i + 1) begin
      sel = i[1:0];
      a   = 4'h3 + i[3:0];
      b   = 4'h6 + i[3:0];
      c   = 4'h9 + i[3:0];
      #1;
      case (sel)
        2'b00:   expect_mux(a);
        2'b01:   expect_mux(b);
        2'b10:   expect_mux(c);
        default: expect_mux(4'h0);
      endcase
    end

    if (errors == 0) $display("PASS tb_latch (latch behaviour reproduced, sel_mux clean)");
    else             $fatal(1, "tb_latch: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
