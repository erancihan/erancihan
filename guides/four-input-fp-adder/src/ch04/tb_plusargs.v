`timescale 1ns/1ps
`default_nettype none

// Plusargs turn one compiled binary into many tests. Two rules are measured
// here rather than assumed: $value$plusargs leaves the variable untouched when
// the argument is absent, so you must initialise it with the default first;
// and matching is case-sensitive.
//
//   vvp sim
//   vvp sim +verbose +count=7
//   vvp sim +name=alpha +hex=deadbeef
//   vvp sim +VERBOSE
module tb_plusargs;

  integer         count;
  reg [8*16-1:0]  name;
  reg [31:0]      hex;
  integer         errors = 0;
  integer         ok_count, ok_name, ok_hex;

  initial begin
    count = 10;                       // defaults FIRST - see below
    name  = "none";
    hex   = 32'hxxxxxxxx;

    if ($test$plusargs("verbose")) $display("  verbose ON");
    else                          $display("  verbose off");

    ok_count = $value$plusargs("count=%d", count);
    ok_name  = $value$plusargs("name=%s",  name);
    ok_hex   = $value$plusargs("hex=%h",   hex);

    $display("  count ok=%0d count=%0d", ok_count, count);
    $display("  name  ok=%0d name=%0s",  ok_name,  name);
    $display("  hex   ok=%0d hex=%08h",  ok_hex,   hex);

    // With no plusargs at all the defaults must have survived untouched.
    // That is the property you rely on, and it is easy to get wrong by
    // declaring the variable and never assigning it.
    if (ok_count == 0 && count !== 10) begin
      errors = errors + 1;
      $display("FAIL tb_plusargs: default count was clobbered");
    end
    if (ok_hex == 0 && hex === 32'h00000000) begin
      errors = errors + 1;
      $display("FAIL tb_plusargs: an absent %%h argument wrote the variable");
    end

    if (errors == 0) $display("PASS tb_plusargs");
    else             $fatal(1, "%0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
