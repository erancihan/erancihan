#!/usr/bin/env bash
#
# Manages the wsl-info-daemon Go binary.
#
# Usage: daemon.sh [start|stop]
#

CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DAEMON="$CURRENT_DIR/../bin/wsl-info-daemon"
PIDFILE="/tmp/tmux-wsl-info-daemon.pid"

stop_daemon() {
    if [ -f "$PIDFILE" ]; then
        kill "$(cat "$PIDFILE")" 2>/dev/null
        rm -f "$PIDFILE"
    fi
}

start_daemon() {
    stop_daemon
    nohup "$DAEMON" -interval "${WSL_CACHE_TTL:-1}" </dev/null >/dev/null 2>&1 &
    disown
}

case "${1:-start}" in
    start) start_daemon ;;
    stop)  stop_daemon ;;
esac
