`timescale 1ns/1ps

// Chapter 13: the binary32 format as a SystemVerilog package.
//
// This is chapter 7's format diagram made machine-readable. A packed struct
// is a bit vector with named fields -- $bits(fp32_t) is 32, measured -- and
// the members are laid out MSB first in declaration order, so the typedef
// below reads top to bottom exactly like the field picture in chapter 6's
// "The Three Fields, and What They Encode".
//
// The point is not brevity. The magic numbers 31, 30:23 and 22:0 appear in
// four shipped modules of this guide (fp32_fields, fp32_unpack, fp32_screen,
// fp32_round_pack). In the SystemVerilog build they appear once, here.
//
// Requires -g2005-sv or above. At -g2005 the whole file is
//   fp32_pkg.sv:25: syntax error
//   I give up.
// -- line 25 is the `package` keyword, and the parser does not recover. That
// asymmetry is the migration price tag: the shipped ../ch07/fp32_fields.v
// compiles silently at every level from -g1995 to -g2012, while this file
// dies below -g2005-sv with a diagnostic that names neither the construct
// nor the flag. Note also that the .sv suffix is NOT what enables the
// language: the identical text in a .v file behaves identically at both
// levels, measured.
package fp32_pkg;

  typedef struct packed {
    logic        sign;   // bit 31
    logic [7:0]  e_raw;  // bits 30:23
    logic [22:0] frac;   // bits 22:0
  } fp32_t;

  // Chapter 12 scatters these as localparams across several modules and
  // testbenches. A package is the one place they can live.
  localparam logic [7:0] E_MAX  = 8'd255;   // infinity / NaN exponent field
  localparam logic [7:0] E_BIAS = 8'd127;

  // Chapter 12's tb_cov4 classifies every operand with an integer function
  // returning 0..4 and then indexes coverage bins with the bare number. An
  // enum names the same five codes, and Icarus implements the LRM's strong
  // typing for it: assigning a raw constant or the result of `cls + 1` to a
  // variable of this type is an elaboration error, "This assignment requires
  // an explicit cast" (see bad_enum_cast.sv). `.name()` returns the label,
  // so a failure message can print NAN instead of 4.
  typedef enum logic [2:0] {
    FC_ZERO = 3'd0,
    FC_SUBN = 3'd1,
    FC_NORM = 3'd2,
    FC_INF  = 3'd3,
    FC_NAN  = 3'd4
  } fclass_e;

endpackage
