# Adding Apps to Scan Filter

## If Apps Are Missing

If the scanner isn't finding apps you have installed, they need to be added to `scan-filter.json`.

### Steps to Add an App:

1. **Find the app's installation folder**
   - Right-click the app shortcut → Properties → "Open File Location"
   - Note the folder name (e.g., "Adobe Photoshop", "Slack", "Discord")

2. **Add to scan-filter.json**
   - Open `resources/scan-filter.json`
   - Find the appropriate category or create a new one
   - Add the app name exactly as it appears in the folder

Example:
```json
"Photo_Editing": [
  "Adobe Photoshop",
  "GIMP",
  "Your New App Name Here"
]
```

3. **Run the scan again**
   - The app should now be detected

## Common Installation Locations

The scanner checks these directories:
- `C:\Program Files\`
- `C:\Program Files (x86)\`
- `%USERPROFILE%\AppData\Local\Programs\`
- `%USERPROFILE%\AppData\Local\`
- `%USERPROFILE%\AppData\Roaming\`
- `C:\Program Files\WindowsApps\` (Microsoft Store apps)

## Extensions vs Applications

**Applications** (added to scan-filter.json):
- Standalone programs you launch directly
- Examples: VS Code, Chrome, Photoshop, Discord

**Extensions** (NOT added to scan-filter.json):
- Plugins or add-ons for other applications
- Helper utilities that run in the background
- Examples: Browser extensions, VS Code plugins, system tray utilities

## Troubleshooting

### App not found even after adding to filter:
1. Check the exact folder name matches what you added
2. Make sure the app has a `.exe` file in its folder (within 3 levels deep)
3. Check if it's being filtered out as a "helper" process
4. Look at the console logs to see what was detected

### Too many helper processes being added:
- These should be automatically filtered out
- If one slips through, report it so we can add it to the ignore list

### Duplicate apps:
- The scanner now prevents duplicates by app name
- If you see duplicates, they might have different names (e.g., "Code" vs "Visual Studio Code")
