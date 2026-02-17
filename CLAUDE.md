# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

sizer2 is a window sizing tool for GNOME Wayland that automatically resizes and positions windows based on screen resolution and window type. It consists of two components that work together:

1. **Bash script** (`sizer2`) - Provides the command-line interface and calls the extension via D-Bus
2. **GNOME Shell extension** (`extension/`) - Handles all window resizing (both Wayland and XWayland windows)

## Development Commands

### Installation
```bash
./install.sh
```
Installs to:
- Script: `~/.local/bin/sizer2`
- Config file: `~/.config/sizer2/config.json`
- Extension: `~/.local/share/gnome-shell/extensions/window-sizer@wwade/`
- Desktop launcher: `~/.local/share/applications/sizer2.desktop`

After installation, user must log out and back in for extension to load.

### Testing the Extension
```bash
# Check extension status
gnome-extensions info window-sizer@wwade

# Enable/disable
gnome-extensions enable window-sizer@wwade
gnome-extensions disable window-sizer@wwade

# Test D-Bus communication manually
gdbus call --session \
  --dest org.gnome.Shell.Extensions.WindowSizer \
  --object-path /org/gnome/Shell/Extensions/WindowSizer \
  --method org.gnome.Shell.Extensions.WindowSizer.ResizeWindows false

# Check extension logs
journalctl -b /usr/bin/gnome-shell
```

### Running the Tool
```bash
sizer2              # Resize windows on current workspace
sizer2 --all        # Resize windows on all workspaces
```

## Architecture

### Two-Component Design

The tool uses a simple architecture:

1. **Bash script** provides the CLI interface and calls the GNOME extension via D-Bus
2. **Extension** handles ALL window resizing (both Wayland and XWayland windows)

This architecture exists because:
- GNOME Shell extension has access to all windows (both native Wayland apps like Chrome and XWayland apps like terminals)
- Bash script provides a convenient command-line interface

### D-Bus Communication

The extension exposes a D-Bus interface:
- **Service**: `org.gnome.Shell.Extensions.WindowSizer`
- **Object path**: `/org/gnome/Shell/Extensions/WindowSizer`
- **Method**: `ResizeWindows(boolean allWorkspaces)`

The bash script calls this D-Bus method using `gdbus` to trigger window resizing.

### Configuration System

Window sizing rules are defined in a JSON configuration file at `~/.config/sizer2/config.json`. The extension reads this file to determine how to size windows.

**Multi-monitor support**: The extension handles each monitor independently. For each window, it determines which monitor the window is on, then uses the configuration for that monitor's resolution. This allows different sizing rules on different monitors (e.g., a 4K monitor and a Full HD monitor can have different configurations).

**Configuration file structure**:
- Top-level keys are resolution strings (e.g., `'1920x1080'`, `'2560x1440'`)
- Each resolution contains window type configs (chrome, googleChat, terminal, emacs)
- Each window type config has:
  - `width` (fixed width in pixels) OR `widthPercent` (percentage of screen width, 0.0-1.0)
  - `align` (optional: `"left"`, `"right"`, or `"center"` - defaults to `"center"` if not specified)

**Adding a new resolution**:
1. Edit `~/.config/sizer2/config.json` (or `config.json` in the repo before installing)
2. Add a new resolution key with window type configs
3. No need to reinstall unless you edited the repo file
4. Extension will reload config on next run

**Config file location precedence**:
- Extension checks `~/.config/sizer2/config.json`, then `./config.json` (dev mode)

### Window Classification

The extension classifies windows by `wm_class` and `title`:

- **chrome**: Chrome/Chromium browsers (by WM_CLASS)
- **googleChat**: Chrome windows with "Google Chat" in title
- **terminal**: Alacritty, gnome-terminal, or any terminal emulator
- **emacs**: Emacs or emacsclient

Classification logic is in the `classifyWindow(win)` function in `extension/extension.js`.

## Key Files

- `sizer2` - Main bash script (executable)
- `config.json` - Window sizing configuration (installed to `~/.config/sizer2/config.json`)
- `extension/extension.js` - GNOME Shell extension with D-Bus interface
- `extension/metadata.json` - Extension metadata (supports GNOME 45, 46)
- `install.sh` - Installation script

## Dependencies

- bash
- gdbus (part of GLib, usually pre-installed)
- GNOME Shell 45 or 46
