`timescale 1ns/1ps
`default_nettype none

module tb_half_adder;

  reg  a, b;
  wire sum, carry;
  integer errors = 0;

  half_adder dut (.a(a), .b(b), .sum(sum), .carry(carry));

  task check;
    input exp_sum;
    input exp_carry;
    begin
      if (sum !== exp_sum || carry !== exp_carry) begin
        errors = errors + 1;
        $display("FAIL a=%b b=%b : got sum=%b carry=%b, expected sum=%b carry=%b",
                 a, b, sum, carry, exp_sum, exp_carry);
      end else begin
        $display("ok   a=%b b=%b -> sum=%b carry=%b", a, b, sum, carry);
      end
    end
  endtask

  initial begin
    a = 1'b0; b = 1'b0; #1 check(1'b0, 1'b0);
    a = 1'b0; b = 1'b1; #1 check(1'b1, 1'b0);
    a = 1'b1; b = 1'b0; #1 check(1'b1, 1'b0);
    a = 1'b1; b = 1'b1; #1 check(1'b0, 1'b1);

    if (errors == 0) $display("PASS tb_half_adder");
    else             $fatal(1, "FAIL tb_half_adder: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
