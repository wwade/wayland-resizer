#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Installing sizer2..."

# Install the Python script
echo "Installing sizer2 script to ~/.local/bin/..."
install -D -m755 "$SCRIPT_DIR/sizer2" ~/.local/bin/sizer2

# Install configuration file
if [[ ! -f ~/.config/sizer2/config.json ]]; then
   echo "Installing configuration file..."
   install -D -m644 "$SCRIPT_DIR/config.json" ~/.config/sizer2/config.json
fi

# Install the GNOME Shell extension
echo "Installing GNOME Shell extension..."
EXT_DIR="$HOME/.local/share/gnome-shell/extensions/window-sizer@wwade"
install -D -m644 "$SCRIPT_DIR/extension/extension.js" "$EXT_DIR/extension.js"
install -D -m644 "$SCRIPT_DIR/extension/metadata.json" "$EXT_DIR/metadata.json"

# Enable the extension
echo "Enabling GNOME Shell extension..."
gnome-extensions enable window-sizer@wwade 2>/dev/null || echo "Extension will be available after logout/login"

# Install desktop launcher
echo "Installing desktop launcher..."
DESKTOP_FILE=~/.local/share/applications/sizer2.desktop
install -D -m644 /dev/null "$DESKTOP_FILE"
cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Window Sizer
Comment=Resize and position windows by resolution
Exec=$HOME/.local/bin/sizer2 --all
Icon=preferences-system-windows
Terminal=false
Categories=Utility;
StartupNotify=true
EOF
update-desktop-database ~/.local/share/applications/ 2>/dev/null || true

echo ""
echo "✓ Installation complete!"
echo ""
echo "Next steps:"
echo "  1. Log out and log back in (required for extension to load)"
echo "  2. Search for 'Window Sizer' in Activities"
echo "  3. Right-click and 'Add to Favorites' to pin to Dash"
echo ""
echo "Usage:"
echo "  sizer2           - Resize windows on current workspace"
echo "  sizer2 --all     - Resize windows on all workspaces"
echo ""
echo "See README.md for more information."
