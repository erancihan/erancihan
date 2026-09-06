`timescale 1ns/1ps
`default_nettype none

// Proves that the ANSI and the 1995 port styles describe the same hardware,
// and exercises named vs positional connection (both correct here) and a
// hierarchical name reference.
module tb_port_styles;

  reg  [7:0] a, b;
  reg        cin;

  wire [7:0] s_named,  s_posn,  s_1995;
  wire       c_named,  c_posn,  c_1995;

  integer errors = 0;
  integer i;

  adder_ansi     u_named (.a(a), .b(b), .cin(cin), .sum(s_named), .cout(c_named));
  adder_ansi     u_posn  (a, b, cin, s_posn, c_posn);
  adder_1995 #(8) u_1995 (a, b, cin, s_1995, c_1995);

  initial begin
    for (i = 0; i < 64; i = i + 1) begin
      a   = $urandom_range(0, 255);
      b   = $urandom_range(0, 255);
      cin = $urandom_range(0, 1);
      #1;
      if ({c_named, s_named} !== {c_posn, s_posn}) begin
        errors = errors + 1;
        $display("FAIL named vs positional at a=%0d b=%0d cin=%b", a, b, cin);
      end
      if ({c_named, s_named} !== {c_1995, s_1995}) begin
        errors = errors + 1;
        $display("FAIL ANSI vs 1995 at a=%0d b=%0d cin=%b", a, b, cin);
      end
    end

    // Hierarchical names: legal in a testbench, never synthesisable.
    $display("hierarchical: tb_port_styles.u_1995.W = %0d, scope %%m = %m",
             tb_port_styles.u_1995.W);

    if (errors == 0) $display("PASS tb_port_styles (64 random vectors, 3 instances)");
    else             $fatal(1, "FAIL tb_port_styles: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
