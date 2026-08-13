#!/usr/bin/env bash
# Full verification of the canonical project. Run from the repo root.
set -e
CANON=work/inputs/canonical
echo "== build =="
cmake -S "$CANON" -B "$CANON/build" >/dev/null
cmake --build "$CANON/build" -j4 2>&1 | grep -E "error|warning|Built target SpaceFighter"
echo "== behavioural tests =="
g++ -std=c++17 -I"$CANON/src" -I"$CANON/third_party" -Wall -Wextra -O1 \
    -o /tmp/core_test work/tests/core_test.cpp \
    "$CANON/src/Game.cpp" "$CANON/src/Mesh.cpp" "$CANON/src/HUD.cpp" -lglfw
/tmp/core_test
echo "== headless run (Xvfb + lavapipe + validation layers) =="
pkill Xvfb 2>/dev/null || true
Xvfb :99 -screen 0 1280x720x24 >/dev/null 2>&1 &
sleep 3
( cd "$CANON/build" && DISPLAY=:99 VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/lvp_icd.json \
    stdbuf -oL ./SpaceFighter > /tmp/run.log 2>&1 & )
sleep 8
DISPLAY=:99 import -window root /tmp/shot.png 2>/dev/null || true
pkill -f SpaceFighter || true
echo "--- validation output (device banner only = clean) ---"
cat /tmp/run.log
