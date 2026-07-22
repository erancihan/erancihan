# Guides

Long-form implementation guides and tutorials I keep for my own learning.

> **Note:** the guides in this folder are generated with [Claude](https://claude.com/claude-code)
> (researched, written, and link-checked in Claude Code sessions) and are intended
> for **learning purposes only**. They are not official documentation for any of the
> tools or engines they cover — always cross-check against the linked primary sources
> before relying on a detail, and expect some drift as the underlying software evolves.

## Contents

| Guide | Description |
|---|---|
| [coop-soulslike-ue5](coop-soulslike-ue5/) | A 12-chapter, Blueprint-first guide to building a 2–4 player online co-op soulslike in Unreal Engine 5 |
| [topdown-arpg-ue5](topdown-arpg-ue5/) | A 13-chapter, Blueprint-first guide to building a Path of Exile / Diablo-style top-down ARPG in Unreal Engine 5 — data-driven skills, affix-based loot, hordes, passive tree, and a closing co-op multiplayer retrofit |
| [container-from-scratch](container-from-scratch/) | A 13-chapter guide to how OS-level containerization works, building a Docker-style runtime in Go from Linux primitives — with 10 runnable steps, plus how macOS, Windows & AppImage isolation compare |
| [fpga-without-the-fpga](fpga-without-the-fpga/) | A 13-chapter guide to FPGA/digital design entirely in free simulators on a laptop (no board needed) — 8 runnable, tested steps building from a counter to a single-cycle RISC-V CPU, a 4-lane SIMT GPU core, and a 4×4 systolic-array TPU, plus RAMs/FIFOs, synthesis & timing without hardware, and a VHDL track |
| [huffman-coding](huffman-coding/) | An 11-chapter, implement-it-yourself guide to Huffman coding — from prefix codes and the entropy floor through the optimality proof, bit I/O, canonical codes and a real `HUF1` file format. You write the codec in **Python, C, Java & Rust**; a language-agnostic test harness (round-trip corpus + golden vectors) verifies your work |
| [space-fighter-metal](space-fighter-metal/) | A 12-chapter, build-it-yourself guide to a Star Fox / Ace Combat-style **space fighter** on Apple's **Metal** with a hand-rolled **Entity–Component–System** — the GPU frame, matrix & quaternion math, sparse-set ECS, instanced rendering, procedural geometry (no assets), an arcade flight model, chase camera, homing enemies and collisions. You build the macOS Swift project (`swift run`) chapter by chapter, all code shown inline |
