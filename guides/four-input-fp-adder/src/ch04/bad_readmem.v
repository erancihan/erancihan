`timescale 1ns/1ps
`default_nettype none

// $readmemh reads one memory word per whitespace-separated token. It does not
// care about lines, so a data file laid out in readable columns silently
// becomes one narrow value per column.
//
// PASS here means the trap still reproduces on your simulator: the first word
// of the memory holds 0x000001, the single token "01", rather than the
// 24-bit vector 0x010203 the file appears to contain.
module bad_readmem;

  reg [23:0] vec [0:3];
  integer    i;
  integer    errors = 0;

  initial begin
    for (i = 0; i < 4; i = i + 1) vec[i] = 24'h000000;

    $readmemh("vectors_bad.hex", vec);

    for (i = 0; i < 4; i = i + 1)
      $display("  vec[%0d] = %06h", i, vec[i]);

    if (vec[0] !== 24'h000001 || vec[1] !== 24'h000002 ||
        vec[2] !== 24'h000003 || vec[3] !== 24'h00000f) begin
      errors = errors + 1;
      $display("FAIL bad_readmem: the column layout no longer misloads");
    end

    if (errors == 0)
      $display("PASS bad_readmem (one token per word, not one line per word)");
    else
      $fatal(1, "%0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
