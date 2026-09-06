`timescale 1ns/1ps

// An xfail target: this file MUST NOT compile.
//
// The composition wall, and the most useful single lesson in this chapter's
// code: Icarus's SystemVerilog features frequently work ALONE and fail
// COMBINED. Queues work (tb_q_stream.sv ships one). Packed structs work
// (fp32_fields_sv.sv ships one). A queue OF a packed struct does not:
//
//   bad_qstruct.sv:36: Sorry: Queue of type `11netstruct_t` is not yet supported.
//
// -- the mangled type name is the compiler's internal spelling, and it is
// what you get instead of the obvious data structure for a scoreboard entry.
//
// The workable pattern, and the one tb_q_stream.sv uses: a queue of plain
// vectors, with the packed struct kept as the UNPACKING type. Packed structs
// assign freely to and from equal-width vectors, so
//
//   q.push_back({r_c, inv_c, ovf_c, inx_c, a, b});   // concat in
//   e = q.pop_front();                               // vector -> struct
//   ... e.r, e.inv, e.a ...                          // named fields out
//
// costs one concatenation at the push and buys named fields everywhere else.
// Named assignment patterns ('{r: ..., inv: ...}) would remove even that
// concatenation and are themselves a syntax error here, measured.
//
// A support matrix built from single-feature probes will not predict this
// class of failure. Compile the composite.
module bad_qstruct;

  typedef struct packed {
    logic [31:0] r;
    logic        inv;
  } exp_t;

  exp_t q[$];

  initial begin
    q.push_back('0);
    $display("%0d", q.size());
  end

endmodule
