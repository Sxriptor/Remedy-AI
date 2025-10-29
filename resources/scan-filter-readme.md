# Scan Filter Configuration

## Overview
The `scan-filter.json` file controls which applications are detected during the system scan. This allows for easy maintenance and updates without modifying code.

## How It Works

### Application Matching
The scanner checks if an executable matches any app in the filter by:

1. **Path matching** - Checks if the app name appears in the installation path
   - Example: `C:\Program Files\Visual Studio Code\Code.exe` matches "Visual Studio Code"

2. **Filename matching** - Checks if words from the app name appear in the executable filename
   - Example: `discord.exe` matches "Discord"
   - Only matches words longer than 3 characters to avoid false positives

3. **Helper process filtering** - Automatically excludes helper processes like:
   - `*helper.exe`, `*service.exe`, `*background.exe`
   - `*daemon.exe`, `*agent.exe`, `*watchdog.exe`
   - `*monitor.exe`, `*crashreporter.exe`

### Ignored Applications
Applications are ignored if they match patterns in the code's ignore lists:
- Gaming platforms (Steam, Epic, Origin, etc.)
- Hardware utilities (Corsair, Logitech, Razer, etc.)
- System utilities (installers, updaters, uninstallers)

## Adding New Applications

To add a new application to the scan filter:

1. Open `resources/scan-filter.json`
2. Find the appropriate category or create a new one
3. Add the application name to the array

Example:
```json
"Coding_IDEs": [
  "Visual Studio Code",
  "Cursor",
  "Your New IDE"
]
```

## Categories

- **Coding_IDEs** - Code editors and integrated development environments
- **Virtual_Machines** - VM software and containerization tools
- **AI_Tools** - AI and machine learning applications
- **Photo_Editing** - Image editing software
- **Video_Editing** - Video editing and production tools
- **3D_and_VFX** - 3D modeling and visual effects software
- **Streaming_and_Recording** - Screen recording and streaming tools
- **Office_and_Productivity** - Office suites and productivity apps
- **Design_and_UI** - UI/UX design tools
- **Browsers** - Web browsers
- **Development_Tools** - Developer utilities and tools
- **System_Utilities** - System management and utility software
- **Audio_Editing** - Audio production and editing software
- **Game_Engines_and_Dev** - Game development engines and tools
- **Communication** - Communication and messaging apps
- **Extensions_and_Plugins** - Reserved for future use

## Tips

- Use the full application name as it appears in the installation folder
- Names are case-insensitive
- Partial matches work (e.g., "Visual Studio" will match "Visual Studio Code")
- Be specific to avoid false positives
