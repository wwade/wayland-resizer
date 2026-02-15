# sizer2 - Window Sizing Tool for GNOME Wayland

A tool to automatically resize and position windows based on screen resolution and window type.

## Components

sizer2 consists of two parts:

1. **Bash script** (`sizer2`) - Provides the command-line interface and calls the extension via D-Bus
2. **GNOME Shell extension** (`window-sizer@wwade`) - Handles all window resizing (both Wayland and XWayland windows)

## Installation Locations

After installation:

- **Script**: `~/.local/bin/sizer2`
- **Config file**: `~/.config/sizer2/config.json`
- **Extension**: `~/.local/share/gnome-shell/extensions/window-sizer@wwade/`
- **Desktop launcher**: `~/.local/share/applications/sizer2.desktop`

## Installation

Run the installation script:

```bash
cd ~/git/sizer2
./install.sh
```

This will:
- Copy the sizer2 script to ~/.local/bin/
- Install the GNOME Shell extension
- Enable the extension
- Create a desktop launcher

After installation, **log out and log back in** to ensure the extension loads properly.

## Usage

### Command Line

```bash
# Resize windows on current workspace
sizer2

# Resize windows on all workspaces
sizer2 --all
```

### Desktop Launcher

Search for "Window Sizer" in Activities and:
- Click to run
- Right-click and "Add to Favorites" to pin to Dash

The launcher runs `sizer2 --all` by default.

## Configuration

Window sizing rules are defined in `~/.config/sizer2/config.json`. The extension reads this file to determine how to size windows.

### Configuration File Structure

The config file has two sections:

1. **classifiers**: Define how to recognize window types by WM_CLASS and title
2. **resolutions**: Define sizing rules for each screen resolution

Each window type config can have:
- `width` (fixed width in pixels) OR `widthPercent` (percentage of screen width, 0.0-1.0)
- `centered` (boolean - center window or left-align)

### Default Resolutions

- **1920x1080**: All windows full width
- **1920x1200**: All windows full width
- **2048x1152**: All windows full width
- **2560x1440** (QHD):
  - Chrome: 70% width, centered
  - Google Chat: 70% width, left-aligned
  - Terminal/Emacs: 1696px width, centered
- **3840x2160** (UHD):
  - Chrome: 70% width, centered
  - Google Chat: 70% width, centered
  - Terminal/Emacs: 1696px width, centered

### Default Window Types

- **chrome**: Chrome/Chromium browsers
- **googleChat**: Chrome windows with "Google Chat" in title
- **terminal**: Alacritty, gnome-terminal, and other terminal emulators
- **emacs**: Emacs and emacsclient windows

## How It Works

1. The bash script calls the GNOME Shell extension via D-Bus
2. The extension reads `~/.config/sizer2/config.json` to get sizing rules
3. The extension resizes all windows (both native Wayland apps like Chrome and XWayland apps like terminals)

## Troubleshooting

### Extension not working

```bash
# Check if extension is enabled
gnome-extensions info window-sizer@wwade

# Enable it if needed
gnome-extensions enable window-sizer@wwade

# Check logs
journalctl -b /usr/bin/gnome-shell | grep -i sizer
```

### Chrome windows not resizing

Chrome runs as a native Wayland app, so it requires the GNOME Shell extension. Make sure the extension is enabled and try logging out/in.

### Test the extension manually

```bash
gdbus call --session \
  --dest org.gnome.Shell.Extensions.WindowSizer \
  --object-path /org/gnome/Shell/Extensions/WindowSizer \
  --method org.gnome.Shell.Extensions.WindowSizer.ResizeWindows false
```

## Customizing

To add new resolutions or change window sizes, edit `~/.config/sizer2/config.json`.

### Adding a New Resolution

1. Edit `~/.config/sizer2/config.json`
2. Add a new resolution key under `"resolutions"` (e.g., `"3440x1440"`)
3. Define sizing rules for each window type
4. The extension will reload the config on next run

Example:
```json
{
  "resolutions": {
    "3440x1440": {
      "chrome": {"widthPercent": 0.80, "centered": true},
      "googleChat": {"width": 1920, "centered": false},
      "terminal": {"width": 1800, "centered": true},
      "emacs": {"width": 1800, "centered": true}
    }
  }
}
```

### Adding a New Window Type

1. Add a classifier under `"classifiers"` with matching rules
2. Add sizing rules for that window type under each resolution
3. See `config.json` for examples

## Requirements

- bash
- GNOME Shell 45 or 46
- gdbus (part of GLib, usually pre-installed)

No additional installation needed on most GNOME systems.
