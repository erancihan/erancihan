# tmux-wsl-info

Display Windows host system information (CPU, RAM, battery) in your tmux status bar — designed for WSL2.

All data is fetched from the Windows host via a single persistent Win32 API query helper and cached in `/tmp` to keep your status bar responsive and eliminate process spawning overhead.

---

## How It Works

Unlike other plugins that repeatedly spawn shell commands or Windows executables (which is extremely heavy and slow under WSL interop), `tmux-wsl-info` uses a **persistent-process architecture**:

1. **Daemon Startup**: On tmux load, the Linux daemon `wsl-info-daemon` spawns the Windows executable `wsl-info.exe` **once** as a background subprocess, establishing standard input and output pipes.
2. **Streaming Metrics**: `wsl-info.exe` loops internally, calling native Win32 APIs (`GetSystemTimes`, `GlobalMemoryStatusEx`, `GetSystemPowerStatus`) and streams formatted update lines to the daemon over its stdout pipe.
3. **Cache File**: The daemon reads the stream line-by-line and atomically writes it to `/tmp/tmux-wsl-info`.
4. **Tmux Rendering**: Tmux displays the contents of `/tmp/tmux-wsl-info` in the status bar.
5. **Clean Exit**: When tmux exits or restarts, the daemon closes the stdin pipe to `wsl-info.exe`. The helper detects the closed pipe (EOF) and immediately terminates, preventing orphaned processes.

```mermaid
sequenceDiagram
    participant Tmux as Tmux Status Bar
    participant Daemon as wsl-info-daemon (Linux)
    participant WinHelper as wsl-info.exe (Windows)
    participant WinAPI as Win32 API

    Note over Daemon, WinHelper: On Plugin/Tmux Startup
    Daemon->>WinHelper: Spawns wsl-info.exe with stdin pipe
    activate WinHelper
    WinHelper->>WinHelper: Starts background stdin reader
    
    loop Every Update Interval (e.g. 1s)
        WinHelper->>WinAPI: GetSystemTimes(), GlobalMemoryStatusEx(), GetSystemPowerStatus()
        WinAPI-->>WinHelper: CPU/RAM/Battery metrics
        WinHelper->>WinHelper: Calculate CPU delta (non-blocking)
        WinHelper->>Daemon: Stream formatted metrics line to stdout
        Daemon->>Daemon: Read stdout line
        Daemon->>Daemon: Atomically write to /tmp/tmux-wsl-info
    end

    loop Periodic Tmux Refresh
        Tmux->>Daemon: cat /tmp/tmux-wsl-info
        Daemon-->>Tmux: 🖥️  10% 🧠  71% 🔌
    end

    Note over Daemon, WinHelper: On Plugin/Tmux Shutdown
    Daemon->>WinHelper: Close Stdin Pipe
    WinHelper-->>WinHelper: Stdin reader detects EOF
    WinHelper->>WinHelper: Exit process (0)
    deactivate WinHelper
    Daemon->>Daemon: Delete /tmp/tmux-wsl-info
```

---

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

---

## Usage

Add the format string below to your `status-right` or `status-left`:

| Format String  | Description                           | Example Output                   |
| -------------- | ------------------------------------- | -------------------------------- |
| `#{wsl_info}`  | Host CPU, RAM, & Battery info (Padded) | `🖥️   9% 🧠  72% 🔌`               |

### Example

```shell
set -g status-right '#{wsl_info}'
```

---

## Customization

All options are configured via tmux `@` options in `.tmux.conf`.

| Option            | Default | Description                                                   |
| ----------------- | ------- | ------------------------------------------------------------- |
| `@wsl_cache_ttl`  | `1`     | Refresh interval in seconds (daemon update & sampling frequency) |

### Example Configuration

```shell
# Refresh metrics every 5 seconds
set -g @wsl_cache_ttl "5"
```

---

## License

[MIT](LICENSE)
