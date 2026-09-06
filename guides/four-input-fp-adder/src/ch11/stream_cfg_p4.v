// Chapter 11: compile-order configuration for the 4-stage runs.
//
// tb_stream.v and tb_reset.v default their `DUT/`LAT/`RSCREEN macros to
// the 2-stage pipeline. Listing THIS file ahead of them in a target
// retargets the same harness source at fp32_add2_p4 -- macro definitions
// carry across files in command-line order, so this is the manifest-file
// equivalent of -DDUT=fp32_add2_p4 -DLAT=4 -DRSCREEN=c_screen.
`define DUT fp32_add2_p4
`define LAT 4
`define RSCREEN c_screen
