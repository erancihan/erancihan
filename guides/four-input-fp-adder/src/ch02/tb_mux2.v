`timescale 1ns/1ps
`default_nettype none

module tb_mux2;

  reg  [7:0] d0, d1;
  reg        sel;
  wire [7:0] y;

  integer errors = 0;

  mux2 #(.W(8)) dut (.d0(d0), .d1(d1), .sel(sel), .y(y));

  task check_y;
    input [7:0] want;
    begin
      if (y !== want) begin
        errors = errors + 1;
        $display("FAIL d0=%h d1=%h sel=%b : got %h expected %h", d0, d1, sel, y, want);
      end else begin
        $display("ok   d0=%h d1=%h sel=%b -> y=%h", d0, d1, sel, y);
      end
    end
  endtask

  initial begin
    d0 = 8'hAA; d1 = 8'h55; sel = 1'b0; #1 check_y(8'hAA);
    d0 = 8'hAA; d1 = 8'h55; sel = 1'b1; #1 check_y(8'h55);

    // Unknown selector, arms disagree in every bit -> every bit unknown.
    d0 = 8'hAA; d1 = 8'h55; sel = 1'bx; #1 check_y(8'hxx);

    // Unknown selector, arms agree -> the value survives. This is what x
    // really means: "the simulator will not guess", not "garbage".
    d0 = 8'hAA; d1 = 8'hAA; sel = 1'bx; #1 check_y(8'hAA);

    // Partial agreement: only the differing nibble goes unknown.
    d0 = 8'hA5; d1 = 8'hAA; sel = 1'bx; #1 check_y(8'hAx);

    if (errors == 0) $display("PASS tb_mux2");
    else             $fatal(1, "FAIL tb_mux2: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
