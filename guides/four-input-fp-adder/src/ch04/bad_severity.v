`timescale 1ns/1ps
`default_nettype none

// This file exists to be reported PASS by the guide's own regression runner
// while printing ERROR: in the middle. $info, $warning and $error all print,
// all continue, and all leave the exit status at 0. A build script that trusts
// only the exit code calls this run green.
//
// Nothing here checks anything. That is the point.
module bad_severity;

  initial begin
    $info   ("this is $info, and the run continues");
    $warning("this is $warning, and the run continues");
    $error  ("this is $error - loud, red, and worth exactly zero to a build script");
    $display("PASS bad_severity (exit status is still 0; look above)");
    $finish;
  end

endmodule

`default_nettype wire
