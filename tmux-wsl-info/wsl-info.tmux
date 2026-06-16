#!/usr/bin/env bash

CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- Tmux Option Helpers ---

get_tmux_option() {
  local option="$1"
  local default_value="$2"
  local option_value
  option_value="$(tmux show-option -gqv "$option")"
  if [ -z "$option_value" ]; then
    echo "$default_value"
  else
    echo "$option_value"
  fi
}

set_tmux_option() {
  local option="$1"
  local value="$2"
  tmux set-option -gq "$option" "$value"
}

# --- Format String Interpolation ---

wsl_interpolation=(
  "\#{wsl_info}"
)
wsl_commands=(
  "#(cat /tmp/tmux-wsl-info)"
)

do_interpolation() {
  local all_interpolated="$1"
  for ((i = 0; i < ${#wsl_commands[@]}; i++)); do
    all_interpolated=${all_interpolated//${wsl_interpolation[$i]}/${wsl_commands[$i]}}
  done
  echo "$all_interpolated"
}

update_tmux_option() {
  local option="$1"
  local option_value
  local new_option_value
  option_value=$(get_tmux_option "$option")
  new_option_value=$(do_interpolation "$option_value")
  set_tmux_option "$option" "$new_option_value"
}

# --- Main ---

main() {
  local cache_ttl
  cache_ttl=$(get_tmux_option "@wsl_cache_ttl" "1")
  tmux set-environment -g WSL_CACHE_TTL "$cache_ttl"

  # Start background daemon
  "$CURRENT_DIR/scripts/daemon.sh" start

  # Interpolate format strings
  update_tmux_option "status-right"
  update_tmux_option "status-left"
}
main
