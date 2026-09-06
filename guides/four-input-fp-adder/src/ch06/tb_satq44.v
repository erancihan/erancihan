`timescale 1ns/1ps
`default_nettype none

// Chapter 6: exhaustive proof of satq44, all 65,536 (a, b) pairs.
//
// The reference model is built from integer arithmetic on values, not from
// the DUT's own widen-and-mux structure: expected wrap is (sa+sb) mod 256
// re-read as signed, expected saturation is an explicit clamp, expected
// overflow is a range test on the true sum. The testbench also counts the
// overflowing pairs and asserts the exact total, 16384 of 65536.
module tb_satq44;

  reg  signed [7:0] a, b;
  wire signed [7:0] y_wrap, y_sat;
  wire              ovf;

  satq44 dut (.a(a), .b(b), .y_wrap(y_wrap), .y_sat(y_sat), .ovf(ovf));

  integer ia, ib, errors, pairs, novf;
  integer tsum, wrapv, satv;
  reg     ovfv;

  initial begin : watchdog
    #10000000;
    $display("FAIL tb_satq44: timeout at %0t, the sweep never finished",
             $time);
    $fatal(1, "timeout");
  end

  task show(input signed [7:0] va, input signed [7:0] vb);
    begin
      a = va; b = vb; #1;
      $display("  %7.4f + %7.4f = true %8.4f : wrap %7.4f  sat %7.4f  ovf=%b",
               va / 16.0, vb / 16.0, va / 16.0 + vb / 16.0,
               y_wrap / 16.0, y_sat / 16.0, ovf);
    end
  endtask

  initial begin
    errors = 0; pairs = 0; novf = 0;
    for (ia = -128; ia < 128; ia = ia + 1) begin
      for (ib = -128; ib < 128; ib = ib + 1) begin
        a = ia[7:0]; b = ib[7:0]; #1;
        tsum  = ia + ib;
        ovfv  = (tsum < -128) || (tsum > 127);
        wrapv = tsum - (ovfv ? (tsum > 0 ? 256 : -256) : 0);
        satv  = ovfv ? (tsum > 0 ? 127 : -128) : tsum;
        if (y_wrap !== wrapv[7:0] || y_sat !== satv[7:0] || ovf !== ovfv)
        begin
          errors = errors + 1;
          if (errors <= 5)
            $display("FAIL tb_satq44: %0d+%0d wrap=%0d/%0d sat=%0d/%0d ovf=%b/%b",
                     ia, ib, y_wrap, wrapv, y_sat, satv, ovf, ovfv);
        end
        if (ovf) novf = novf + 1;
        pairs = pairs + 1;
      end
    end

    // Guards: the sweep must have covered the whole space, and the overflow
    // count must match the census computed independently in python3.
    if (pairs !== 65536) begin
      $display("FAIL tb_satq44: swept %0d pairs, expected 65536", pairs);
      $fatal(1, "incomplete sweep");
    end
    if (novf !== 16384) begin
      $display("FAIL tb_satq44: %0d overflow pairs, expected 16384", novf);
      $fatal(1, "census mismatch");
    end
    if (errors !== 0)
      $fatal(1, "FAIL tb_satq44: %0d error(s)", errors);

    $display("satq44: 0 errors in 65536 pairs; overflow pairs: %0d (25%%)",
             novf);
    show(8'sd84, 8'sd72);     //  5.25 + 4.5   : positive overflow
    show(-8'sd112, -8'sd96);  // -7.0  - 6.0   : negative overflow
    show(8'sd84, -8'sd72);    //  5.25 - 4.5   : no overflow
    $display("PASS tb_satq44 (wrap is maximally wrong; sat is least wrong)");
    $finish;
  end

endmodule

`default_nettype wire
