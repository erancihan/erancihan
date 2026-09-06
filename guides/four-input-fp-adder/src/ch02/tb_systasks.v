`timescale 1ns/1ps
`default_nettype none

// The system tasks and functions you will actually use, and the two that
// will mislead you: $random (signed) and $error (does not fail the build).
// This file ends in PASS with exit code 0 even though it prints an ERROR
// line. That is the point of the $error demonstration.
module tb_systasks;

  reg [7:0]  byte_val;
  reg [95:0] str;
  shortreal  sr;
  reg [31:0] bits32;

  integer errors = 0;
  integer signed_mod, unsigned_mod, n;
  reg     saw_negative;

  initial begin
    byte_val = 8'hA5;

    $display("-- format specifiers");
    $display("  dec=%0d hex=%h oct=%o bin=%b char=%c str=%s",
             byte_val, byte_val, byte_val, byte_val, 8'h41, "hi");

    $display("-- %%s pads with the vector's leading zero bytes");
    str = "hello";
    $display("  str as %%s = '%s'  as hex = %h  $bits = %0d", str, str, $bits(str));

    $display("-- $clog2 is how many bits it takes to index N things");
    $display("  $clog2(1)=%0d $clog2(2)=%0d $clog2(3)=%0d $clog2(8)=%0d $clog2(9)=%0d $clog2(0)=%0d",
             $clog2(1), $clog2(2), $clog2(3), $clog2(8), $clog2(9), $clog2(0));
    if ($clog2(8) !== 3 || $clog2(9) !== 4) begin
      errors = errors + 1; $display("FAIL $clog2");
    end

    $display("-- $random is SIGNED, so $random %% N is negative half the time");
    saw_negative = 1'b0;
    for (n = 0; n < 6; n = n + 1) begin
      signed_mod   =  $random % 16;
      unsigned_mod = {$random} % 16;
      if (signed_mod < 0) saw_negative = 1'b1;
      if (unsigned_mod < 0) begin
        errors = errors + 1; $display("FAIL {$random} %% 16 was negative");
      end
      $display("  $random %% 16 = %0d\t{$random} %% 16 = %0d", signed_mod, unsigned_mod);
    end
    if (!saw_negative) begin
      errors = errors + 1; $display("FAIL expected at least one negative $random %% 16");
    end
    $display("  $urandom_range(3,7) = %0d", $urandom_range(3, 7));

    $display("-- $signed / $unsigned reinterpret bits; they do not convert values");
    $display("  $signed(8'hFF) = %0d   $unsigned(-8'sd1) = %0d",
             $signed(8'hFF), $unsigned(-8'sd1));
    if ($signed(8'hFF) !== -1) begin
      errors = errors + 1; $display("FAIL $signed(8'hFF)");
    end

    $display("-- $time rounds to the time unit; $realtime does not");
    #1.25;
    $display("  after #1.25 : $time = %0d   $realtime = %f", $time, $realtime);
    if ($time !== 1) begin
      errors = errors + 1; $display("FAIL $time did not round to 1");
    end

    $display("-- $sformatf builds a string instead of printing one");
    $display("  %0s", $sformatf("byte_val is %h (%0d decimal)", byte_val, byte_val));

    $display("-- shortreal <-> raw IEEE-754 bits: the golden-model route");
    sr     = 1.5;
    bits32 = $shortrealtobits(sr);
    $display("  $shortrealtobits(1.5)          = %h", bits32);
    $display("  $bitstoshortreal(32'h40490fdb) = %f", $bitstoshortreal(32'h4049_0fdb));
    if (bits32 !== 32'h3FC0_0000) begin
      errors = errors + 1; $display("FAIL $shortrealtobits(1.5)");
    end

    $display("-- severity tasks: $info and $warning and $error all CONTINUE");
    $info("this is $info");
    $warning("this is $warning");
    $error("this is $error -- note the run still exits 0");

    if (errors == 0) $display("PASS tb_systasks");
    else             $fatal(1, "FAIL tb_systasks: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
