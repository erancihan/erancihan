#!/usr/bin/env bash
#
# Build and run every Verilog target in the guide, from scratch.
#
#   ./run_all.sh            # every chapter
#   ./run_all.sh ch02 ch09  # only the named chapters
#
# Each chapter directory holds a targets.txt manifest, one target per line:
#
#   <expect> : <source files ...>
#
# expect is one of
#   run   - must compile with ZERO output from iverilog (any warning fails the
#           target), and the simulation must exit 0 with no FAIL in its output
#   warn  - must compile successfully but WITH compiler output; a deliberate
#           warning demonstration whose diagnostic the chapter quotes. Runs
#           under the same simulation checks as run.
#   xfail - must FAIL to compile; a deliberate teaching example, such as a
#           `default_nettype none` typo that elaboration is supposed to reject
#
# Build artifacts go to a temporary directory and are removed on exit, so the
# source tree stays clean.
#
# Exit status is 0 only if every target behaved as its manifest says it should.

set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD="$(mktemp -d)"
trap 'rm -rf "$BUILD"' EXIT

IVERILOG="${IVERILOG:-iverilog}"
VVP="${VVP:-vvp}"
IVFLAGS="${IVFLAGS:--g2012 -Wall}"

# Wall-clock limit for a single simulation, in seconds. A testbench whose clock
# dies, or whose watchdog counts clock edges instead of time, hangs forever
# rather than failing -- and one hang stalls the whole regression. macOS ships
# no timeout(1) and no gtimeout, so use a small perl alarm shim instead.
SIM_TIMEOUT="${SIM_TIMEOUT:-60}"

run_with_timeout() {
  perl -e '
    my $limit = shift @ARGV;
    $SIG{ALRM} = sub { kill "KILL", $pid if $pid; exit 124 };
    alarm $limit;
    $pid = fork();
    if ($pid == 0) { exec @ARGV or exit 127; }
    waitpid $pid, 0;
    my $st = $?;
    alarm 0;
    exit($st & 127 ? 128 + ($st & 127) : $st >> 8);
  ' "$SIM_TIMEOUT" "$@"
}

pass=0
fail=0
failed_targets=()

if [ "$#" -gt 0 ]; then
  chapters=("$@")
else
  chapters=()
  for d in "$HERE"/ch*/; do
    [ -d "$d" ] && chapters+=("$(basename "$d")")
  done
fi

for ch in "${chapters[@]}"; do
  dir="$HERE/$ch"
  manifest="$dir/targets.txt"

  if [ ! -f "$manifest" ]; then
    echo "SKIP  $ch (no targets.txt)"
    continue
  fi

  echo
  echo "=== $ch ==="

  while IFS= read -r line; do
    # Skip comments and blank lines.
    case "$line" in ''|\#*) continue ;; esac

    expect="${line%%:*}"
    files="${line#*:}"
    # Trim surrounding whitespace.
    expect="$(echo "$expect" | tr -d '[:space:]')"
    files="$(echo "$files" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    [ -z "$files" ] && continue

    sim="$BUILD/sim.vvp"
    clog="$BUILD/compile.log"
    rlog="$BUILD/run.log"

    # shellcheck disable=SC2086
    if (cd "$dir" && $IVERILOG $IVFLAGS -o "$sim" $files) >"$clog" 2>&1; then
      compiled=yes
    else
      compiled=no
    fi

    if [ "$expect" = "xfail" ]; then
      if [ "$compiled" = "no" ]; then
        echo "  PASS  (xfail as expected)  $files"
        pass=$((pass + 1))
      else
        echo "  FAIL  compiled but should NOT have:  $files"
        fail=$((fail + 1))
        failed_targets+=("$ch: $files (expected compile failure)")
      fi
      continue
    fi

    if [ "$compiled" = "no" ]; then
      echo "  FAIL  compile error:  $files"
      sed 's/^/        /' "$clog" | head -5
      fail=$((fail + 1))
      failed_targets+=("$ch: $files (compile error)")
      continue
    fi

    # A run target must compile SILENTLY: -Wall warnings land in the compile
    # log with exit 0, and a green run used to swallow them (found by the
    # chapter 6 review). Any compile output at all now fails the target, so
    # "zero warnings" is a regression-guarded property, not a one-time claim.
    # A "warn" target is the dual: it must compile WITH output — these are the
    # deliberate warning demonstrations of chapters 2-3, whose prose quotes
    # the warning text. If a future Icarus stops warning, the target fails
    # and the chapter knows its transcript went stale.
    if [ "$expect" = "warn" ]; then
      if [ ! -s "$clog" ]; then
        echo "  FAIL  expected compile warnings, compiled silently:  $files"
        fail=$((fail + 1))
        failed_targets+=("$ch: $files (expected compile warnings)")
        continue
      fi
    elif [ -s "$clog" ]; then
      echo "  FAIL  compile warnings:  $files"
      sed 's/^/        /' "$clog" | head -5
      fail=$((fail + 1))
      failed_targets+=("$ch: $files (compile warnings)")
      continue
    fi

    (cd "$dir" && run_with_timeout $VVP "$sim") >"$rlog" 2>&1
    rc=$?

    if [ "$rc" -eq 124 ]; then
      echo "  FAIL  simulation hung (killed after ${SIM_TIMEOUT}s):  $files"
      fail=$((fail + 1))
      failed_targets+=("$ch: $files (timeout after ${SIM_TIMEOUT}s)")
      continue
    fi

    if [ "$rc" -eq 0 ]; then
      # A testbench may exit 0 and still report failures in its own output.
      if grep -qE '(^|[^A-Za-z])FAIL' "$rlog"; then
        echo "  FAIL  testbench reported a failure:  $files"
        grep -nE '(^|[^A-Za-z])FAIL' "$rlog" | sed 's/^/        /' | head -5
        fail=$((fail + 1))
        failed_targets+=("$ch: $files (testbench FAIL)")
      else
        echo "  PASS  $files"
        pass=$((pass + 1))
      fi
    else
      echo "  FAIL  simulation exited non-zero:  $files"
      sed 's/^/        /' "$rlog" | tail -5
      fail=$((fail + 1))
      failed_targets+=("$ch: $files (runtime failure)")
    fi
  done <"$manifest"
done

echo
echo "================================"
echo "  passed: $pass"
echo "  failed: $fail"
if [ "$fail" -gt 0 ]; then
  echo
  echo "  failing targets:"
  for t in "${failed_targets[@]}"; do
    echo "    - $t"
  done
fi
echo "================================"

[ "$fail" -eq 0 ]
