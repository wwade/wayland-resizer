/* extension.js */
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

function loadConfig() {
    // Try multiple locations
    const configPaths = [
        GLib.get_home_dir() + '/.config/sizer2/config.json',
        GLib.get_current_dir() + '/config.json',
    ];

    for (let configPath of configPaths) {
        const file = Gio.File.new_for_path(configPath);
        if (file.query_exists(null)) {
            try {
                const [success, contents] = file.load_contents(null);
                if (success) {
                    const decoder = new TextDecoder('utf-8');
                    const contentsStr = decoder.decode(contents);
                    return JSON.parse(contentsStr);
                }
            } catch (e) {
                log(`Warning: Could not load config from ${configPath}: ${e}`);
                continue;
            }
        }
    }

    log('Error: No configuration file found');
    log(`Searched: ${configPaths.join(', ')}`);
    return null;
}

function classifyWindow(win, classifiers) {
    const wmClass = win.get_wm_class() || '';
    const title = win.get_title() || '';
    const wmClassLower = wmClass.toLowerCase();
    const titleLower = title.toLowerCase();

    // Try each classifier to find a match
    for (let [name, classifier] of Object.entries(classifiers)) {
        let classMatch = false;
        let titleMatch = true; // Default to true if no title pattern specified

        // Check class pattern
        if (classifier.class) {
            const classPattern = classifier.class.toLowerCase();
            const classRegex = new RegExp(classPattern);
            classMatch = classRegex.test(wmClassLower);
        } else {
            classMatch = true; // No class pattern means match any class
        }

        // Check title pattern if specified
        if (classifier.title) {
            const titlePattern = classifier.title.toLowerCase();
            const titleRegex = new RegExp(titlePattern);
            titleMatch = titleRegex.test(titleLower);
        }

        // Both conditions must match
        if (classMatch && titleMatch) {
            return name;
        }
    }

    log(`Classification failure: No match for window with wm_class="${wmClass}", title="${title}"`);
    return null;
}

function resizeWindows(allWorkspaces) {
    const display = global.display;
    const workspace = global.workspace_manager.get_active_workspace();

    // Load configuration
    const configs = loadConfig();
    if (!configs) {
        Main.notify('Window Sizer', 'Error: Could not load configuration');
        return;
    }

    const classifiers = configs.classifiers;
    const resolutions = configs.resolutions;

    let processed = 0;
    const monitorsProcessed = new Set();
    const windows = display.get_tab_list(Meta.TabList.NORMAL, null);

    for (let win of windows) {
        // Skip if not on active workspace (unless allWorkspaces)
        if (!allWorkspaces && !win.located_on_workspace(workspace)) {
            continue;
        }

        // Get window's monitor and resolution
        const monitorIndex = win.get_monitor();
        const monitor = Main.layoutManager.monitors[monitorIndex];
        const resolution = `${monitor.width}x${monitor.height}`;

        // Get config for this monitor's resolution
        const config = resolutions[resolution];
        if (!config) {
            log(`No configuration for resolution ${resolution} on monitor ${monitorIndex}`);
            continue;
        }

        const windowType = classifyWindow(win, classifiers);
        if (!windowType || !config[windowType]) {
            continue;
        }

        const typeConfig = config[windowType];
        const workArea = win.get_work_area_for_monitor(monitorIndex);

        // Calculate width
        let width;
        if (typeConfig.widthPercent) {
            width = Math.floor(workArea.width * typeConfig.widthPercent);
            log(`Width calculation for ${windowType}: widthPercent=${typeConfig.widthPercent}, workArea.width=${workArea.width}, result=${width}`);
        } else {
            width = typeConfig.width || workArea.width;
            log(`Width calculation for ${windowType}: fixed width=${typeConfig.width || 'not set (using workArea.width)'}, result=${width}`);
        }

        const height = workArea.height;

        // Calculate position
        let x;
        const align = typeConfig.align || 'center';  // Default to center alignment

        if (align === 'center') {
            x = workArea.x + Math.floor((workArea.width - width) / 2);
            log(`Position calculation for ${windowType}: align=${align}, workArea.x=${workArea.x}, workArea.width=${workArea.width}, width=${width}, x=${x}`);
        } else if (align === 'right') {
            x = workArea.x + workArea.width - width;
            log(`Position calculation for ${windowType}: align=${align}, workArea.x=${workArea.x}, workArea.width=${workArea.width}, width=${width}, x=${x}`);
        } else {  // 'left' or any other value defaults to left
            x = workArea.x;
            log(`Position calculation for ${windowType}: align=${align}, workArea.x=${workArea.x}, x=${x}`);
        }
        const y = workArea.y;

        // Unmaximize if needed
        if (win.get_maximized()) {
            log(`Unmaximizing ${windowType} (${win.get_wm_class()}) before resize`);
            win.unmaximize(Meta.MaximizeFlags.BOTH);
        }

        // Move and resize
        win.move_resize_frame(false, x, y, width, height);

        log(`Resized ${windowType} (${win.get_wm_class()}) to ${width}x${height} at ${x},${y} on monitor ${monitorIndex} (${resolution})`);
        processed++;
        monitorsProcessed.add(resolution);
    }

    // Create notification message
    let message;
    if (monitorsProcessed.size === 0) {
        message = 'No windows processed';
    } else if (monitorsProcessed.size === 1) {
        const resolution = Array.from(monitorsProcessed)[0];
        message = `Processed ${processed} window(s) at ${resolution}`;
    } else {
        const resolutionList = Array.from(monitorsProcessed).sort().join(', ');
        message = `Processed ${processed} window(s) across ${monitorsProcessed.size} monitors (${resolutionList})`;
    }

    Main.notify('Window Sizer', message);
}

export default class WindowSizerExtension {
    enable() {
        log('Window Sizer extension enabled');

        // Add D-Bus interface for command-line control
        this._dbusImpl = Gio.DBusNodeInfo.new_for_xml(
            '<node>' +
            '  <interface name="org.gnome.Shell.Extensions.WindowSizer">' +
            '    <method name="ResizeWindows">' +
            '      <arg type="b" direction="in" name="allWorkspaces"/>' +
            '    </method>' +
            '  </interface>' +
            '</node>'
        ).interfaces[0];

        const methodCallHandler = (connection, sender, objectPath, interfaceName, methodName, parameters, invocation) => {
            try {
                if (methodName === 'ResizeWindows') {
                    const allWorkspaces = parameters.get_child_value(0).get_boolean();
                    resizeWindows(allWorkspaces);
                    // Return empty tuple for method with no return value
                    invocation.return_value(new GLib.Variant('()', []));
                } else {
                    invocation.return_error_literal(
                        Gio.DBusError,
                        Gio.DBusError.UNKNOWN_METHOD,
                        `Unknown method: ${methodName}`
                    );
                }
            } catch (e) {
                log(`Error in D-Bus method call: ${e}`);
                invocation.return_error_literal(
                    Gio.DBusError,
                    Gio.DBusError.FAILED,
                    `Error: ${e.message}`
                );
            }
        };

        this._dbusId = Gio.DBus.session.own_name(
            'org.gnome.Shell.Extensions.WindowSizer',
            Gio.BusNameOwnerFlags.NONE,
            () => {
                this._dbusRegistration = Gio.DBus.session.register_object(
                    '/org/gnome/Shell/Extensions/WindowSizer',
                    this._dbusImpl,
                    methodCallHandler,
                    null,  // getProperty callback
                    null   // setProperty callback
                );
            },
            null,
            null
        );
    }

    disable() {
        log('Window Sizer extension disabled');

        if (this._dbusRegistration) {
            Gio.DBus.session.unregister_object(this._dbusRegistration);
            this._dbusRegistration = null;
        }

        if (this._dbusId) {
            Gio.DBus.session.unown_name(this._dbusId);
            this._dbusId = null;
        }
    }
}
