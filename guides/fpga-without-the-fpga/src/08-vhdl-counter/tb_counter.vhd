-- tb_counter.vhd — self-checking VHDL testbench for counter.vhd.
--
-- VHDL testbenches leans on `assert ... report ... severity` instead of
-- $display: a failing assertion prints the message, and `severity failure`
-- stops the simulation with a non-zero exit code (GHDL turns that into a
-- failing shell command — handy for Makefiles and CI).
library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity tb_counter is
end entity;

architecture sim of tb_counter is
    signal clk   : std_logic := '0';
    signal rst   : std_logic := '1';
    signal en    : std_logic := '0';
    signal count : std_logic_vector(7 downto 0);
    signal done  : boolean := false;
begin

    dut : entity work.counter
        generic map (WIDTH => 8)
        port map (clk => clk, rst => rst, en => en, count => count);

    -- 100 MHz clock that stops when the test is done
    clk <= not clk after 5 ns when not done else '0';

    stimulus : process
    begin
        wait until rising_edge(clk);
        wait until rising_edge(clk);
        rst <= '0';

        -- enable low: hold at zero
        wait until rising_edge(clk);
        wait for 1 ns;
        assert unsigned(count) = 0
            report "count must stay 0 while en = '0'" severity failure;

        -- count ten ticks
        en <= '1';
        for i in 1 to 10 loop
            wait until rising_edge(clk);
        end loop;
        wait for 1 ns;
        assert unsigned(count) = 10
            report "count /= 10 after ten enabled cycles" severity failure;

        -- pause and hold
        en <= '0';
        wait until rising_edge(clk);
        wait until rising_edge(clk);
        wait for 1 ns;
        assert unsigned(count) = 10
            report "count moved while en = '0'" severity failure;

        -- synchronous reset mid-run
        rst <= '1';
        wait until rising_edge(clk);
        wait for 1 ns;
        assert unsigned(count) = 0
            report "synchronous reset failed" severity failure;

        report "ALL TESTS PASSED";   -- GHDL prints this as a note
        done <= true;
        wait;
    end process;

end architecture;
