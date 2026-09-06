`timescale 1ns/1ps
`default_nettype none

// File-driven stimulus. The vectors live in vectors.hex, so adding a test case
// is editing a data file rather than recompiling. Three things here are not
// optional:
//
//   * the load is checked at BOTH ends of the array. $readmemh on a missing
//     file prints ERROR: and lets the simulation carry on with an untouched
//     memory, exiting 0; a file short of N words leaves the tail x, and an x
//     output compared against an x expectation never reports anything.
//   * cout is read, not merely connected. With sum alone,
//     cout = a[7] | b[7] and cout = ~sum[7] & (a[7] | b[7]) both pass.
//   * the run ends in $fatal when the error count is non-zero, so the exit
//     status is not a lie.
//
// Run it with +break to corrupt one expected value and watch the failure path:
//   vvp sim +break
module tb_vectors;

  localparam N = 8;

  reg  [7:0] a, b;
  wire [7:0] sum;
  wire       cout;

  reg [31:0] vec [0:N-1];
  integer    i;
  integer    errors = 0;

  adder8 dut (.a(a), .b(b), .sum(sum), .cout(cout));

  task check(input [7:0] got, input got_cout,
             input [7:0] want, input want_cout);
    begin
      if (got !== want || got_cout !== want_cout) begin
        errors = errors + 1;
        $display("FAIL tb_vectors: t=%0t a=%02h b=%02h got=%b_%02h want=%b_%02h",
                 $time, a, b, got_cout, got, want_cout, want);
      end
    end
  endtask

  initial begin
    for (i = 0; i < N; i = i + 1) vec[i] = 32'hxxxxxxxx;

    // Relative to the working directory of vvp, not to this source file.
    $readmemh("vectors.hex", vec);

    // vec[0] catches a file that did not load; vec[N-1] catches a short one.
    if (^vec[0] === 1'bx || ^vec[N-1] === 1'bx) begin
      $display("FAIL tb_vectors: vectors.hex did not load %0d vectors", N);
      $fatal(1, "no vectors");
    end

    if ($test$plusargs("break")) vec[2][15:8] = 8'hAA;   // a deliberate lie

    for (i = 0; i < N; i = i + 1) begin
      {a, b} = vec[i][31:16];
      #1 check(sum, cout, vec[i][15:8], vec[i][0]);
      #1;
    end

    if (errors == 0) $display("PASS tb_vectors (%0d vectors, 0 errors)", N);
    else begin
      $display("FAIL tb_vectors: %0d of %0d vectors wrong", errors, N);
      $fatal(1, "%0d error(s)", errors);
    end
    $finish;
  end

endmodule

`default_nettype wire
