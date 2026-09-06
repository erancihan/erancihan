`timescale 1ns/1ps
`default_nettype none

module tb_byte_select;

  reg  [31:0] word;
  reg  [1:0]  idx;
  wire [7:0]  lo_up, hi_down;

  integer errors = 0;
  integer i, n;

  reg [7:0] want_up, want_down;

  byte_select dut (.word(word), .idx(idx), .lo_up(lo_up), .hi_down(hi_down));

  initial begin
    word = 32'hDEAD_BEEF;
    for (i = 0; i < 4; i = i + 1) begin
      idx = i[1:0];
      #1;
      want_up   = (word >> (i*8))      & 8'hFF;
      want_down = (word >> (24 - i*8)) & 8'hFF;
      $display("idx=%0d : word[idx*8 +: 8] = %h   word[31-idx*8 -: 8] = %h",
               i, lo_up, hi_down);
      if (lo_up !== want_up || hi_down !== want_down) begin
        errors = errors + 1;
        $display("FAIL idx=%0d : want up=%h down=%h", i, want_up, want_down);
      end
    end

    // Random words, every index.
    for (n = 0; n < 200; n = n + 1) begin
      word = $urandom;
      for (i = 0; i < 4; i = i + 1) begin
        idx = i[1:0];
        #1;
        want_up   = (word >> (i*8))      & 8'hFF;
        want_down = (word >> (24 - i*8)) & 8'hFF;
        if (lo_up !== want_up || hi_down !== want_down) begin
          errors = errors + 1;
          $display("FAIL word=%h idx=%0d", word, i);
        end
      end
    end

    if (errors == 0) $display("PASS tb_byte_select (4 directed + 800 random)");
    else             $fatal(1, "FAIL tb_byte_select: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
