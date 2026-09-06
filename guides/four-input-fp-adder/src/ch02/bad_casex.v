`timescale 1ns/1ps
`default_nettype none

// DELIBERATELY WRONG. casex treats x and z as don't-cares on BOTH sides,
// including in the selector. One unknown bit arriving from an uninitialised
// register makes it match the first item, and the design looks like it works.
// casez wildcards only the items, so the same selector falls to default.
// PASS here means the difference reproduced.
module bad_casex;

  reg [3:0] sel;
  reg [8*8-1:0] hit_x, hit_z;

  integer errors = 0;

  always @(*) begin
    casex (sel)
      4'b1xxx: hit_x = "1xxx";
      4'b01xx: hit_x = "01xx";
      default: hit_x = "default";
    endcase
  end

  always @(*) begin
    casez (sel)
      4'b1???: hit_z = "1???";
      4'b01??: hit_z = "01??";
      default: hit_z = "default";
    endcase
  end

  task show;
    input [8*8-1:0] want_x;
    input [8*8-1:0] want_z;
    begin
      $display("  sel=%b : casex -> %0s\tcasez -> %0s", sel, hit_x, hit_z);
      if (hit_x !== want_x || hit_z !== want_z) begin
        errors = errors + 1;
        $display("FAIL sel=%b : wanted casex %0s casez %0s", sel, want_x, want_z);
      end
    end
  endtask

  initial begin
    sel = 4'b1000; #1 show("1xxx", "1???");
    sel = 4'b0100; #1 show("01xx", "01??");
    sel = 4'b0010; #1 show("default", "default");
    sel = 4'bx000; #1 show("1xxx", "default");   // <-- the whole point

    if (errors == 0)
      $display("PASS bad_casex: one x in the selector made casex match the first item");
    else
      $fatal(1, "FAIL bad_casex: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
