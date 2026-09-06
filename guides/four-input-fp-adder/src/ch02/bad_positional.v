`timescale 1ns/1ps
`default_nettype none

// DELIBERATELY WRONG. u_bad connects the ports positionally and swaps b with
// cin. The compiler emits width warnings only because the two ports happen to
// have different widths; swap two same-width ports and it says nothing at all.
// This program asserts the WRONG answer, so a PASS here means the trap still
// reproduces on your simulator.
module bad_positional;

  reg  [7:0] a, b;
  reg        cin;
  wire [7:0] s_good, s_bad;
  wire       c_good, c_bad;

  integer errors = 0;

  adder_ansi u_good (.a(a), .b(b), .cin(cin), .sum(s_good), .cout(c_good));
  adder_ansi u_bad  (a, cin, b, s_bad, c_bad);   // b <-> cin swapped

  initial begin
    a = 8'd200; b = 8'd100; cin = 1'b1;
    #1;
    $display("intended  a=%0d b=%0d cin=%b -> cout=%b sum=%0d", a, b, cin, c_good, s_good);
    $display("mis-wired a=%0d b=%0d cin=%b -> cout=%b sum=%0d", a, b, cin, c_bad,  s_bad);

    if ({c_good, s_good} !== 9'd301) begin
      errors = errors + 1;
      $display("FAIL the good instance is not 301");
    end
    if ({c_bad, s_bad} !== 9'd201) begin
      errors = errors + 1;
      $display("FAIL the trap did not reproduce (expected the wrong answer 201)");
    end

    if (errors == 0) $display("PASS bad_positional: trap reproduced, mis-wire gives 201 not 301");
    else             $fatal(1, "FAIL bad_positional: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
