# tmux-wsl-info

Display Windows host system information (CPU, RAM, battery) in your tmux status bar — designed for WSL2.

All data is fetched from the Windows host via a single `powershell.exe` call and cached to keep your status bar responsive.

## Requirements

- **WSL2** with `powershell.exe` accessible in `$PATH`
- **tmux** ≥ 2.1

## Installation

### With [TPM](https://github.com/tmux-plugins/tpm) (recommended)

Add to your `.tmux.conf`:

```shell
set -g @plugin 'erancihan/tmux-wsl-info'
```

Then press `prefix + I` to install.

### Manual

Clone the repo:

```shell
git clone https://github.com/erancihan/tmux-wsl-info ~/.config/tmux/plugins/tmux-wsl-info
```

Add to the bottom of `.tmux.conf`:

```shell
run '~/.config/tmux/plugins/tmux-wsl-info/wsl-info.tmux'
```

Reload tmux:

```shell
tmux source-file ~/.tmux.conf
```

## Usage

Add any of the format strings below to your `status-right` or `status-left`:

| Format String    | Description                        | Example Output   |
| ---------------- | ---------------------------------- | ---------------- |
| `#{wsl_cpu}`     | Windows host CPU usage with icon   | `🖥️ 27%`        |
| `#{wsl_ram}`     | Windows host RAM usage with icon   | `🧠 94%`         |
| `#{wsl_battery}` | Battery status with icon           | `🔋🔌 100%`      |

### Example

```shell
set -g status-right '#{wsl_cpu} #{wsl_ram} #{wsl_battery}'
```

## Customization

All options are configured via tmux `@` options in `.tmux.conf`. Every option has a sensible default — no configuration is required.

### Cache

| Option            | Default | Description                          |
| ----------------- | ------- | ------------------------------------ |
| `@wsl_cache_ttl`  | `5`     | Seconds to cache PowerShell results  |

### CPU

| Option           | Default | Description                    |
| ---------------- | ------- | ------------------------------ |
| `@wsl_cpu_icon`  | `🖥️`   | Icon displayed before CPU %    |

### RAM

| Option           | Default | Description                    |
| ---------------- | ------- | ------------------------------ |
| `@wsl_ram_icon`  | `🧠`    | Icon displayed before RAM %    |

### Battery

| Option                         | Default | Description                                  |
| ------------------------------ | ------- | -------------------------------------------- |
| `@wsl_battery_icon_full`       | `🔋`    | Battery icon when ≥ low threshold            |
| `@wsl_battery_icon_low`        | `🪫`    | Battery icon when < low threshold            |
| `@wsl_battery_icon_charging`   | `⚡`    | Postfix icon when battery is charging        |
| `@wsl_battery_icon_ac`         | `🔌`    | Postfix icon when on AC, not charging        |
| `@wsl_battery_icon_no_battery` | `🔌`    | Shown when no battery is detected            |
| `@wsl_battery_low_threshold`   | `25`    | Percentage below which low icon is used      |

### Example Configuration

```shell
# Use text labels instead of emojis
set -g @wsl_cpu_icon "CPU:"
set -g @wsl_ram_icon "RAM:"
set -g @wsl_battery_icon_full "BAT:"
set -g @wsl_battery_icon_low "LOW:"

# Refresh data every 10 seconds instead of 5
set -g @wsl_cache_ttl "10"
```

## How It Works

1. **Single fetch** — One `powershell.exe` call retrieves CPU, RAM, and battery data from the Windows host via WMI (`Win32_Processor`, `Win32_OperatingSystem`, `Win32_Battery`).
2. **Cached results** — Data is written atomically to `/tmp/tmux-wsl-info-cache` and reused for `@wsl_cache_ttl` seconds (default: 5).
3. **Lock protection** — A filesystem lock prevents concurrent PowerShell calls from piling up during cache refresh.
4. **Format interpolation** — On plugin load, `#{wsl_*}` placeholders in your status bar are replaced with `#(script)` calls that read from the cache.

## Battery Status Reference

The plugin interprets `Win32_Battery.BatteryStatus` values as follows:

| Status | Meaning                              | Display          |
| ------ | ------------------------------------ | ---------------- |
| 6–9    | Charging                             | `🔋⚡ 70%`       |
| 2      | On AC, not necessarily charging      | `🔋🔌 100%`      |
| 3      | Fully Charged                        | `🔋🔌 100%`      |
| 1      | Discharging                          | `🔋 85%`         |
| 4–5    | Low / Critical                       | `🪫 12%`         |
| 11     | Partially Charged                    | `🔋 60%`         |

## License

[MIT](LICENSE)
