`timescale 1ns/1ps

// An xfail target: this file MUST NOT compile.
//
// The half of SystemVerilog interfaces that this guide's chapter 11 bundles
// actually want -- an interface as a module PORT, so a pipeline stage's port
// list collapses to one name and a modport states the direction contract.
//
// Measured on Icarus Verilog 13.0 at -g2005-sv, -g2009 and -g2012, all three
// identical, and for all THREE port forms (modport-typed `stream_if.dut s`,
// plain `stream_if s`, and generic `interface s`):
//
//   bad_if_port.sv:35: syntax error
//   bad_if_port.sv:1: Errors in port declarations.
//
// (At -g2005 it dies four lines earlier, on the `interface` keyword itself:
// "bad_if_port.sv:29: syntax error" / "I give up.")
//
// What DOES work is in fp_bundles.sv and tb_if_stream.sv: declare the
// interface, instantiate it, and wire DUT ports to its members by hand. That
// is a namespace -- it keeps chapter 11's two travelling bundles together and
// makes the testbench read like the protocol. It is not a contract: with
// modport ports unparseable, nothing distinguishes the driver's view of the
// bundle from the DUT's, and no direction is checked.
//
// Chapter 5 already pins the other two SystemVerilog parse walls of this
// project as xfail targets -- bad_sva.v (concurrent assertions) and
// bad_covergroup.v (functional coverage). This file adds the third.
interface stream_if;
  logic        valid;
  logic [31:0] a, b;
  modport dut (input valid, a, b);
endinterface

module bad_if_port (input wire clk, stream_if.dut s, output wire [31:0] y);

  assign y = s.valid ? s.a : s.b;

endmodule
