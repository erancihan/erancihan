`timescale 1ns/1ps
`default_nettype none

// Icarus 13.0 does not dump memory arrays. A `reg [7:0] mem [0:3]` appears in
// no VCD under any $dumpvars variant, and asking for it by name is a hard
// runtime error. Individual words can be dumped, one at a time, and arrive as
// escaped identifiers with a warning.
//
//   vvp sim +dump=/tmp/arr.vcd     mem is silently absent; the words appear
//
// The whole-array request is behind an `ifdef because it is not a run-time
// failure you can hide behind a plusarg: vvp rejects it when it loads the
// program, before time starts. Compile with -DDUMPMEM to see it.
//
// PASS means the memory itself still holds what the testbench put in it - the
// data is fine, it is only invisible to the waveform viewer. The PASS checks
// the contents and nothing else: delete the per-word $dumpvars above and this
// file still passes. The evidence for the invisibility is the VCD, which has
// no $var line for mem and one per named word.
module bad_dumparray;

  reg [7:0] mem [0:3];
  reg [7:0] scalar = 8'h00;
  integer   i;
  integer   errors = 0;

  initial begin : dumpctl
    reg [8*256-1:0] dumpfile;
    if ($value$plusargs("dump=%s", dumpfile)) begin
      $dumpfile(dumpfile);
`ifdef DUMPMEM
      $dumpvars(0, bad_dumparray.mem);            // vvp refuses to load this
`else
      $dumpvars(0, bad_dumparray);                // mem will not be in here
      $dumpvars(0, bad_dumparray.mem[0], bad_dumparray.mem[1]);
`endif
    end
  end

  initial begin
    for (i = 0; i < 4; i = i + 1) mem[i] = 8'h00;
    #5;
    for (i = 0; i < 4; i = i + 1) mem[i] = 8'ha0 + i[7:0];
    scalar = 8'h5a;
    #5;
    for (i = 0; i < 4; i = i + 1) mem[i] = 8'hb0 + i[7:0];
    scalar = 8'h6b;
    #5;

    for (i = 0; i < 4; i = i + 1)
      $display("  mem[%0d] = %02h", i, mem[i]);

    if (mem[0] !== 8'hb0 || mem[3] !== 8'hb3 || scalar !== 8'h6b) begin
      errors = errors + 1;
      $display("FAIL bad_dumparray: the memory does not hold what was written");
    end

    if (errors == 0)
      $display("PASS bad_dumparray (the data is there; the waveform is not)");
    else
      $fatal(1, "%0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
