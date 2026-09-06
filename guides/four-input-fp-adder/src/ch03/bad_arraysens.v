`timescale 1ns/1ps
`default_nettype none

// Indexing inside a combinational block sensitises it to the WHOLE object,
// not to the selected element. This is the one thing in this chapter that
// Icarus actually warns about, and only for arrays:
//
//   warning: @* is sensitive to all 4 words in array 'mem'.
//
// The identical rule applies to the vector select on the next line, and that
// one is silent under -Wall. Add -Wsensitivity-entire-vector to see it.
module bad_arraysens;

  reg [7:0] mem [0:3];
  reg [3:0] v;
  reg [1:0] idx;

  reg [7:0] y_mem;
  reg       y_vec;

  integer wakeups = 0;
  integer errors  = 0;

  always @(*) begin
    y_mem   = mem[idx];
    y_vec   = v[idx];
  end

  always @(y_mem or y_vec) wakeups = wakeups + 1;

  initial begin
    mem[0] = 8'h00; mem[1] = 8'h11; mem[2] = 8'h22; mem[3] = 8'h33;
    v      = 4'b0010;
    idx    = 2'd1;
    #1 $display("  idx=%0d | y_mem=%h y_vec=%b", idx, y_mem, y_vec);
    if (y_mem !== 8'h11 || y_vec !== 1'b1) begin
      errors = errors + 1;
      $display("FAIL wrong element selected");
    end

    // Writing a word the block is not reading still wakes it.
    mem[3] = 8'hee;
    #1 $display("  after writing mem[3], which idx does not select: y_mem=%h", y_mem);
    if (y_mem !== 8'h11) begin
      errors = errors + 1;
      $display("FAIL the selected element should not have changed");
    end

    if (errors == 0) $display("PASS bad_arraysens");
    else             $fatal(1, "bad_arraysens: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
