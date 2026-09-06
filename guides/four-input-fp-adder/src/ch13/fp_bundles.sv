`timescale 1ns/1ps

// Chapter 13: chapter 11's two travelling bundles, given names.
//
// {in_valid, a, b} enters fp32_add2_p2 together and {out_valid, result,
// flags} leaves together; chapter 11's harnesses plumb both through every
// testbench by hand. A SystemVerilog `interface` is the construct for
// exactly that, and on Icarus 13.0 it works as far as INSTANTIATION goes:
// declare it, instantiate it, read and write its members hierarchically.
//
// The modport declarations below parse and elaborate, and nothing can
// consume them: an interface as a module PORT is a parse error in all three
// forms (modport-typed, plain, generic) -- see bad_if_port.sv, this
// chapter's xfail target. So the modports are honest documentation of the
// two views, and the direction checking they exist to provide is not
// available here. On this simulator an interface is a NAMESPACE, not a
// contract.
interface fp_in_if;
  logic        valid;
  logic [31:0] a, b;
  modport drv (output valid, a, b);   // the testbench's view
  modport dut (input  valid, a, b);   // the DUT's view
endinterface

interface fp_out_if;
  logic        valid;
  logic [31:0] result;
  logic        invalid, overflow, inexact;
  modport dut (output valid, result, invalid, overflow, inexact);
  modport mon (input  valid, result, invalid, overflow, inexact);
endinterface
