`timescale 1ns/1ps
`default_nettype none

// Vectors, part-selects, indexed part-selects, arrays, and what an
// out-of-range select actually returns. Compiling this file emits two
// select-range warnings, both deliberate.
module tb_partsel;

  reg [31:0] v;
  reg [0:31] ascending;
  reg [7:0]  mem [0:3];

  integer errors = 0;
  integer k;

  initial begin
    v = 32'hDEAD_BEEF;

    $display("-- constant part-select and bit-select, v = %h", v);
    $display("  v[15:8]  = %h", v[15:8]);
    $display("  v[31:28] = %h", v[31:28]);
    $display("  v[0]     = %b", v[0]);
    if (v[15:8] !== 8'hBE || v[31:28] !== 4'hD || v[0] !== 1'b1) begin
      errors = errors + 1; $display("FAIL constant selects");
    end

    $display("-- indexed part-select, constant width, variable base");
    for (k = 0; k < 4; k = k + 1) begin
      $display("  v[%0d*8 +: 8] = %h", k, v[k*8 +: 8]);
      if (v[k*8 +: 8] !== ((v >> (k*8)) & 8'hFF)) begin
        errors = errors + 1; $display("FAIL v[%0d*8 +: 8]", k);
      end
    end
    $display("  v[31 -: 8]   = %h   (8 bits ending at 31, counting down)", v[31 -: 8]);
    if (v[31 -: 8] !== 8'hDE) begin errors = errors + 1; $display("FAIL v[31 -: 8]"); end

    $display("-- out-of-range selects are not errors; they return x");
    $display("  v[35:32]  = %h", v[35:32]);
    $display("  v[40 +: 4]= %h", v[40 +: 4]);
    if (v[35:32] !== 4'bxxxx || v[40 +: 4] !== 4'bxxxx) begin
      errors = errors + 1; $display("FAIL out-of-range select did not give x");
    end

    $display("-- an ascending declaration reverses the NUMBERING, not the value");
    ascending = 32'hDEAD_BEEF;
    $display("  reg [0:31] a; a[0:7] = %h  a[24:31] = %h", ascending[0:7], ascending[24:31]);
    if (ascending[0:7] !== 8'hDE || ascending[24:31] !== 8'hEF) begin
      errors = errors + 1; $display("FAIL ascending vector");
    end

    $display("-- arrays: width on the left of the name, depth on the right");
    mem[1] = 8'h32;
    mem[2] = 8'hA5;
    $display("  mem[1]      = %h", mem[1]);
    $display("  mem[1][3:0] = %h", mem[1][3:0]);
    $display("  $bits(mem[0]) = %0d", $bits(mem[0]));
    $display("  unwritten mem[0] = %h", mem[0]);
    if (mem[1][3:0] !== 4'h2 || $bits(mem[0]) !== 8 || mem[0] !== 8'hxx) begin
      errors = errors + 1; $display("FAIL array behaviour");
    end

    if (errors == 0) $display("PASS tb_partsel");
    else             $fatal(1, "FAIL tb_partsel: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
