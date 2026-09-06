`timescale 1ns/1ps

// An xfail target: this file MUST NOT compile.
//
// The one place Icarus 13.0 is genuinely STRICT about SystemVerilog, and it
// is worth a target of its own because almost every other strictness promise
// in the language turns out to be unenforced here (see the chapter's ledger:
// blocking assignment inside always_ff, two always_ff blocks writing one
// variable, an incomplete always_comb -- all accepted in silence).
//
// An enum-typed variable will not take a raw constant, and will not take the
// result of arithmetic on itself. Both statements below are elaboration
// errors:
//
//   bad_enum_cast.sv:30: error: This assignment requires an explicit cast.
//   bad_enum_cast.sv:31: error: This assignment requires an explicit cast.
//
// This is the protection chapter 3's "State Machines" asks for by hand --
// the raw-constant state assignment that compiles fine in plain Verilog and
// silently means nothing. `cls = fclass_e'(3'd1);` compiles and runs, and an
// unlabelled value round-trips with .name() returning the empty string, which
// tb_unique_case.sv checks.
typedef enum logic [2:0] {FC_ZERO = 3'd0, FC_SUBN = 3'd1, FC_NORM = 3'd2} fclass_e;

module bad_enum_cast;

  fclass_e cls;

  initial begin
    cls = 3'd1;      // raw constant into an enum variable
    cls = cls + 1;   // arithmetic on an enum variable
  end

endmodule
