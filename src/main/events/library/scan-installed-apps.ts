import { registerEvent } from "../register-event";
import { gamesSublevel, gamesShopAssetsSublevel, levelKeys } from "@main/level";
import path from "node:path";
import fs from "node:fs";
import { SystemPath } from "@main/services/system-path";
import { randomUUID } from "node:crypto";
import type { GameShop } from "@types";

interface DetectedApp {
  name: string;
  executablePath: string;
}

// Temporarily disabled icon extraction to speed up scanning
// Icon extraction was causing the scan to hang
// TODO: Re-implement icon extraction in a background process
/*
const extractIconFromExecutable = async (
  executablePath: string,
  timeoutMs: number = 3000
): Promise<string | null> => {
  if (process.platform !== "win32") {
    return null;
  }

  try {
    const iconsDir = path.join(app.getPath("userData"), "app-icons");
    await fs.promises.mkdir(iconsDir, { recursive: true });

    const iconFileName = `${path.basename(executablePath, ".exe")}_${Date.now()}.png`;
    const iconPath = path.join(iconsDir, iconFileName);

    const psScript = `
      Add-Type -AssemblyName System.Drawing
      $icon = [System.Drawing.Icon]::ExtractAssociatedIcon('${executablePath.replace(/'/g, "''")}')
      if ($icon) {
        $bitmap = $icon.ToBitmap()
        $bitmap.Save('${iconPath.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png)
        $bitmap.Dispose()
        $icon.Dispose()
        Write-Output 'success'
      }
    `;

    const extractionPromise = execAsync(`powershell -Command "${psScript.replace(/"/g, '\\"')}"`);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Icon extraction timeout")), timeoutMs)
    );

    await Promise.race([extractionPromise, timeoutPromise]);

    if (fs.existsSync(iconPath)) {
      const iconData = await fs.promises.readFile(iconPath);
      const base64 = iconData.toString("base64");
      return `data:image/png;base64,${base64}`;
    }

    return null;
  } catch (error) {
    return null;
  }
};
*/

const shouldIgnoreExecutable = (
  fileName: string,
  filePath: string
): boolean => {
  const lowerFileName = fileName.toLowerCase();
  const lowerPath = filePath.toLowerCase();

  // Gaming-related applications to ignore
  const gamingPatterns = [
    "steam",
    "battleye",
    "eac", // Easy Anti-Cheat
    "anticheat",
    "epic", // Epic Games
    "origin", // EA Origin
    "uplay",
    "riot", // Riot Games
    "blizzard",
    "gog", // GOG Galaxy
    "battlenet",
    "launcher", // Game launchers
    "xbox",
    "playnite",
  ];

  // Hardware utilities to ignore
  const hardwarePatterns = [
    "corsair",
    "icue",
    "logitech",
    "lghub",
    "ghub",
    "razer",
    "synapse",
    "msi",
    "afterburner",
    "asus",
    "aura",
    "armoury",
    "nvidia",
    "geforce",
    "amd",
    "radeon",
    "rtss", // RivaTuner
    "hwmonitor",
    "cpuz",
    "gpuz",
  ];

  // System utilities and maintenance to ignore
  const systemPatterns = [
    "uninstall",
    "unins000",
    "uninst",
    "install",
    "setup",
    "installer",
    "update",
    "updater",
    "autoupdate",
    "selfupdate",
    "crashreporter",
    "crash_reporter",
    "errorreport",
    "bugreport",
    "dumprenderer",
    "temp",
    "tmp",
    "cache",
    "vcredist",
    "redist",
    "dotnet",
    "directx",
    "dxsetup",
    "oalinst",
    "bootstrap",
    "stub",
    "repair",
    "cleanup",
    "cleaner",
    "unlocker",
    "register",
    "activate",
    "license",
  ];

  // Combine all ignore patterns
  const allIgnorePatterns = [
    ...gamingPatterns,
    ...hardwarePatterns,
    ...systemPatterns,
  ];

  // Check if filename or path contains any ignore patterns
  const shouldIgnore = allIgnorePatterns.some(
    (pattern) => lowerFileName.includes(pattern) || lowerPath.includes(pattern)
  );

  // Ignore executables in specific directories
  const ignoreDirs = [
    "\\uninstall\\",
    "\\temp\\",
    "\\tmp\\",
    "\\cache\\",
    "\\steamapps\\",
    "\\steam\\",
    "/uninstall/",
    "/temp/",
    "/tmp/",
    "/cache/",
    "/steam/",
  ];

  const shouldIgnoreByPath = ignoreDirs.some((dir) => lowerPath.includes(dir));

  return shouldIgnore || shouldIgnoreByPath;
};

const isProductivityApp = (fileName: string, filePath: string): boolean => {
  const lowerFileName = fileName.toLowerCase();
  const lowerPath = filePath.toLowerCase();

  // Productivity & Development Tools
  const productivityPatterns = [
    // Code Editors & IDEs
    "code",
    "vscode",
    "cursor",
    "sublime",
    "atom",
    "notepad++",
    "visual studio",
    "jetbrains",
    "pycharm",
    "webstorm",
    "intellij",
    "rider",
    "phpstorm",
    "goland",
    "clion",
    "rubymine",

    // Communication
    "discord",
    "slack",
    "teams",
    "zoom",
    "skype",
    "teamspeak",
    "telegram",
    "whatsapp",
    "signal",

    // Browsers
    "chrome",
    "firefox",
    "edge",
    "brave",
    "opera",

    // Email Clients
    "outlook",
    "thunderbird",
    "mailbird",
    "postbox",

    // Office & Productivity
    "word",
    "excel",
    "powerpoint",
    "onenote",
    "notion",
    "evernote",
    "obsidian",
    "joplin",
    "typora",

    // AI Tools
    "chatgpt",
    "copilot",
    "claude",
    "openai",

    // Development Tools
    "git",
    "docker",
    "node",
    "python",
    "java",
    "mysql",
    "postgres",
    "mongodb",
    "redis",
    "postman",
    "insomnia",
    "terminal",
    "powershell",
    "cmd",
    "wsl",

    // Design Tools
    "figma",
    "photoshop",
    "illustrator",
    "gimp",
    "inkscape",
    "blender",
    "unity",
    "unreal",

    // Utilities
    "7zip",
    "winrar",
    "vlc",
    "spotify",
    "obs",
    "greenshot",
    "sharex",
    "lightshot",
  ];

  return productivityPatterns.some(
    (pattern) => lowerFileName.includes(pattern) || lowerPath.includes(pattern)
  );
};

const getWindowsInstalledApps = async (): Promise<DetectedApp[]> => {
  const apps: DetectedApp[] = [];

  const commonPaths = [
    process.env.ProgramFiles || "C:\\Program Files",
    process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)",
    path.join(SystemPath.getPath("home"), "AppData", "Local", "Programs"),
  ];

  const scanDirectory = (dir: string, depth = 0): string[] => {
    const executables: string[] = [];

    // Only scan 2 levels deep to avoid finding too many files
    if (depth > 2) return executables;

    try {
      if (!fs.existsSync(dir)) return executables;

      const files = fs.readdirSync(dir, { withFileTypes: true });

      for (const file of files) {
        try {
          const fullPath = path.join(dir, file.name);

          if (file.isDirectory()) {
            executables.push(...scanDirectory(fullPath, depth + 1));
          } else if (
            file.isFile() &&
            file.name.toLowerCase().endsWith(".exe")
          ) {
            executables.push(fullPath);
          }
        } catch {
          // Skip files/directories we can't access
          continue;
        }
      }
    } catch {
      // Skip directories we can't access
    }

    return executables;
  };

  for (const basePath of commonPaths) {
    if (!fs.existsSync(basePath)) continue;

    const exeFiles = scanDirectory(basePath);

    for (const exePath of exeFiles) {
      // Limit total apps to prevent overwhelming the system
      if (apps.length >= 500) {
        console.log("Reached maximum app limit (500), stopping scan");
        break;
      }

      const appName = path.basename(exePath, ".exe");

      // Skip executables in the ignore list
      if (shouldIgnoreExecutable(appName, exePath)) {
        continue;
      }

      // Only include productivity-related apps
      if (!isProductivityApp(appName, exePath)) {
        continue;
      }

      apps.push({
        name: appName,
        executablePath: exePath,
      });
    }

    // Break outer loop if limit reached
    if (apps.length >= 500) break;
  }

  return apps;
};

const getLinuxInstalledApps = async (): Promise<DetectedApp[]> => {
  const apps: DetectedApp[] = [];

  const commonPaths = [
    path.join(SystemPath.getPath("home"), ".local", "bin"),
    path.join(SystemPath.getPath("home"), ".local", "share", "applications"),
    "/usr/local/bin",
    "/usr/bin",
  ];

  for (const basePath of commonPaths) {
    if (!fs.existsSync(basePath)) continue;

    try {
      const files = fs.readdirSync(basePath);

      for (const file of files) {
        const fullPath = path.join(basePath, file);

        try {
          const stat = fs.statSync(fullPath);

          // Check if it's an executable file
          if (stat.isFile() && (stat.mode & 0o111) !== 0) {
            // Skip executables in the ignore list
            if (shouldIgnoreExecutable(file, fullPath)) {
              continue;
            }

            // Only include productivity-related apps
            if (!isProductivityApp(file, fullPath)) {
              continue;
            }

            apps.push({
              name: file,
              executablePath: fullPath,
            });
          }
        } catch {
          continue;
        }
      }
    } catch {
      continue;
    }
  }

  return apps;
};

const scanInstalledApps = async () => {
  try {
    console.log("Starting app scan...");

    const detectedApps =
      process.platform === "win32"
        ? await getWindowsInstalledApps()
        : process.platform === "linux"
          ? await getLinuxInstalledApps()
          : [];

    console.log(`Found ${detectedApps.length} potential apps`);

    // Build a Set of existing executable paths for faster lookup
    const existingGames = await gamesSublevel.iterator().all();
    const existingPaths = new Set(
      existingGames
        .filter(([_key, game]) => !game.isDeleted && game.executablePath)
        .map(([_key, game]) => game.executablePath?.toLowerCase())
    );

    console.log(`Existing apps in library: ${existingPaths.size}`);

    const addedApps: Array<{ name: string; executablePath: string }> = [];

    for (const app of detectedApps) {
      try {
        // Check if app with this executable path already exists (fast lookup)
        if (existingPaths.has(app.executablePath.toLowerCase())) {
          continue;
        }

        const objectId = randomUUID();
        const shop: GameShop = "custom";
        const gameKey = levelKeys.game(shop, objectId);

        // Skip icon extraction for now to speed up scanning
        // Icons can be extracted later if needed
        const iconUrl = null;

        const game = {
          title: app.name,
          iconUrl: iconUrl,
          logoImageUrl: null,
          libraryHeroImageUrl: null,
          objectId,
          shop,
          remoteId: null,
          isDeleted: false,
          playTimeInMilliseconds: 0,
          lastTimePlayed: null,
          executablePath: app.executablePath,
          launchOptions: null,
          favorite: false,
          automaticCloudSync: false,
          hasManuallyUpdatedPlaytime: false,
        };

        // Store game assets
        const assets = {
          updatedAt: Date.now(),
          objectId,
          shop,
          title: app.name,
          iconUrl: iconUrl || null,
          libraryHeroImageUrl: "",
          libraryImageUrl: iconUrl || "",
          logoImageUrl: "",
          logoPosition: null,
          coverImageUrl: iconUrl || "",
        };
        await gamesShopAssetsSublevel.put(gameKey, assets);

        await gamesSublevel.put(gameKey, game);
        addedApps.push(app);

        console.log(`Added app: ${app.name}`);
      } catch (error) {
        console.error(`Error adding app ${app.name}:`, error);
        continue;
      }
    }

    console.log(`Scan complete. Added ${addedApps.length} new apps`);

    return {
      success: true,
      addedCount: addedApps.length,
      detectedCount: detectedApps.length,
    };
  } catch (error) {
    console.error("Error scanning installed apps:", error);
    return {
      success: false,
      addedCount: 0,
      detectedCount: 0,
      error: String(error),
    };
  }
};

registerEvent("scanInstalledApps", scanInstalledApps);
