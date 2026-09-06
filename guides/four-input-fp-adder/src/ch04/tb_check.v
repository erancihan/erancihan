`timescale 1ns/1ps
`default_nettype none

// A correct adder and a deliberately broken one driven from the same vectors,
// so the comparison machinery has something to report. Three of the four
// vectors disagree. The fourth agrees by accident, which is the whole reason a
// green run is not evidence of anything.
//
// The mismatch lines say MISMATCH and not FAIL on purpose: this file is
// supposed to pass, and the guide's regression runner treats the string FAIL
// anywhere in the output as a failure. That is the corollary of the convention
// - no passing message may contain the word.
module tb_check;

  reg  [7:0] a, b;
  wire [7:0] good_sum, bad_sum;
  wire       good_cout, bad_cout;

  integer mismatches = 0;
  integer errors     = 0;
  integer i;

  reg [23:0] vec [0:3];

  adder8     u_good (.a(a), .b(b), .sum(good_sum), .cout(good_cout));
  bad_adder8 u_bad  (.a(a), .b(b), .sum(bad_sum),  .cout(bad_cout));

  // !== and never !=. With !=, a comparison against an x returns x, if (x) is
  // false, and an all-x DUT output passes every test you have.
  task compare(input [7:0] got, input [7:0] want);
    begin
      if (got !== want) begin
        mismatches = mismatches + 1;
        $display("MISMATCH t=%0t a=%02h b=%02h got=%02h want=%02h",
                 $time, a, b, got, want);
      end else
        $display("ok       t=%0t a=%02h b=%02h got=%02h", $time, a, b, got);
    end
  endtask

  initial begin
    vec[0] = 24'h010203;
    vec[1] = 24'h0f0110;
    vec[2] = 24'hff0100;
    vec[3] = 24'h808000;

    for (i = 0; i < 4; i = i + 1) begin
      {a, b} = vec[i][23:8];
      #1 compare(bad_sum, vec[i][7:0]);
      #1;
    end

    if (mismatches !== 3) begin
      errors = errors + 1;
      $display("FAIL tb_check: %0d mismatches, expected 3", mismatches);
    end
    if (good_sum !== bad_sum) begin
      errors = errors + 1;
      $display("FAIL tb_check: 80+80 and 80-80 should agree in 8 bits");
    end

    if (errors == 0)
      $display("PASS tb_check (%0d of 4 vectors caught the broken adder)",
               mismatches);
    else
      $fatal(1, "%0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
