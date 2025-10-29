import { registerEvent } from "../register-event";
import { gamesSublevel, gamesShopAssetsSublevel, levelKeys } from "@main/level";
import path from "node:path";
import fs from "node:fs";
import { SystemPath } from "@main/services/system-path";
import { randomUUID } from "node:crypto";
import type { GameShop } from "@types";
import { app } from "electron";

interface DetectedApp {
  name: string;
  executablePath: string;
}

interface ScanFilter {
  Applications: {
    [category: string]: string[];
  };
}

let scanFilterCache: ScanFilter | null = null;

const loadScanFilter = (): ScanFilter | null => {
  if (scanFilterCache) {
    return scanFilterCache;
  }

  try {
    // In development: out/main/index.js -> ../../resources/scan-filter.json
    // In production: resources are in process.resourcesPath
    const filterPath = app.isPackaged
      ? path.join(process.resourcesPath, "scan-filter.json")
      : path.join(__dirname, "../../resources/scan-filter.json");

    console.log("Looking for scan-filter.json at:", filterPath);
    console.log("__dirname:", __dirname);
    console.log("app.isPackaged:", app.isPackaged);

    if (!fs.existsSync(filterPath)) {
      console.warn("scan-filter.json not found at:", filterPath);
      // Try alternative path
      const altPath = path.join(process.cwd(), "resources/scan-filter.json");
      console.log("Trying alternative path:", altPath);
      if (fs.existsSync(altPath)) {
        const filterData = fs.readFileSync(altPath, "utf-8");
        scanFilterCache = JSON.parse(filterData);
        console.log(
          "Loaded scan filter from alternative path with",
          Object.keys(scanFilterCache?.Applications || {}).length,
          "categories"
        );
        return scanFilterCache;
      }
      return null;
    }

    const filterData = fs.readFileSync(filterPath, "utf-8");
    scanFilterCache = JSON.parse(filterData);
    console.log(
      "Loaded scan filter with",
      Object.keys(scanFilterCache?.Applications || {}).length,
      "categories"
    );
    return scanFilterCache;
  } catch (error) {
    console.error("Error loading scan-filter.json:", error);
    return null;
  }
};

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
    "chroma",
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
    "hwinfo",
    "cpuz",
    "gpuz",
    "steelseries",
    "engine",
    "roccat",
    "swarm",
    "hyperx",
    "ngenuity",
    "alienware",
    "command center",
    "evga",
    "precision",
    "gigabyte",
    "rgb fusion",
    "thermaltake",
    "tt rgb",
    "cooler master",
    "masterplus",
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
    "wmplayer", // Windows Media Player (legacy)
    "wordpad", // WordPad (legacy)
    "notepad", // Basic Notepad (use Notepad++ instead)
    "mspaint", // MS Paint (basic)
    "calc", // Calculator
    "charmap", // Character Map
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

const getAppCategory = (fileName: string, filePath: string): string | null => {
  const filter = loadScanFilter();

  if (!filter) {
    return null;
  }

  const lowerPath = filePath.toLowerCase();
  const lowerFileName = fileName.toLowerCase();

  // Check each category to find which one this app belongs to
  for (const [categoryName, apps] of Object.entries(filter.Applications)) {
    for (const appName of apps) {
      const lowerAppName = appName.toLowerCase();

      if (lowerPath.includes(lowerAppName)) {
        return categoryName;
      }

      const appNameWords = lowerAppName.split(/\s+/);
      const matchesAppName = appNameWords.some(
        (word) => lowerFileName.includes(word) && word.length > 3
      );

      if (matchesAppName) {
        return categoryName;
      }
    }
  }

  return null;
};

const isProductivityApp = (fileName: string, filePath: string): boolean => {
  const filter = loadScanFilter();

  if (!filter) {
    console.warn("No scan filter loaded, rejecting app");
    return false;
  }

  const lowerFileName = fileName.toLowerCase();
  const lowerPath = filePath.toLowerCase();

  // Get all allowed app names from the filter
  const allAllowedApps: string[] = [];
  for (const category of Object.values(filter.Applications)) {
    allAllowedApps.push(...category);
  }

  // Check if any allowed app name matches the path or folder
  for (const appName of allAllowedApps) {
    const lowerAppName = appName.toLowerCase();

    // Check if the app name is in the path (folder structure)
    if (lowerPath.includes(lowerAppName)) {
      // Make sure it's not a helper process or system utility
      const helperPatterns = [
        "helper",
        "service",
        "background",
        "daemon",
        "agent",
        "watchdog",
        "monitor",
        "crashreporter",
        "crash_reporter",
        "crashpad",
        "createdump",
        "browsercore",
        "proxy",
        "relay",
        "host",
        "settings",
        "driver",
        "dtu",
        "msal",
        "msrdc",
        "unrar", // UnRAR is a command-line tool, not the main app
        "rar.exe", // Rar.exe is command-line, WinRAR.exe is the GUI
        "tunnel", // code-tunnel is a helper
        "wsl.exe", // WSL executables are system utilities
        "wslg",
        "wslhost",
        "wslrelay",
        "wslsettings",
        " app.exe", // Catches "ollama app.exe" - space before app indicates it's not the main exe
      ];

      const isHelper = helperPatterns.some((pattern) =>
        lowerFileName.includes(pattern)
      );

      if (!isHelper) {
        return true;
      }
    }

    // Check if the filename contains the app name
    // This helps catch executables like "Discord.exe", "Slack.exe", etc.
    const appNameWords = lowerAppName.split(/\s+/);
    const matchesAppName = appNameWords.some(
      (word) => lowerFileName.includes(word) && word.length > 3 // Avoid short words like "pro", "one"
    );

    if (matchesAppName) {
      return true;
    }
  }

  return false;
};

const getWindowsInstalledApps = async (): Promise<DetectedApp[]> => {
  const apps: DetectedApp[] = [];

  const commonPaths = [
    process.env.ProgramFiles || "C:\\Program Files",
    process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)",
    path.join(SystemPath.getPath("home"), "AppData", "Local", "Programs"),
    path.join(SystemPath.getPath("home"), "AppData", "Local"),
    path.join(SystemPath.getPath("home"), "AppData", "Roaming"),
    "C:\\Program Files\\WindowsApps", // Microsoft Store apps
  ];

  console.log("Scanning directories:", commonPaths);

  const scanDirectory = (dir: string, depth = 0, maxDepth = 3): string[] => {
    const executables: string[] = [];

    // Scan deeper to find more apps
    if (depth > maxDepth) return executables;

    try {
      if (!fs.existsSync(dir)) return executables;

      const files = fs.readdirSync(dir, { withFileTypes: true });

      for (const file of files) {
        try {
          const fullPath = path.join(dir, file.name);

          if (file.isDirectory()) {
            // Skip common subdirectories that contain helper files
            const lowerDirName = file.name.toLowerCase();
            const skipDirs = [
              "resources",
              "locales",
              "swiftshader",
              "lib",
              "bin",
              "tools",
              "helpers",
              "plugins",
              "extensions",
              "cache",
              "temp",
              "logs",
            ];

            if (!skipDirs.includes(lowerDirName)) {
              executables.push(...scanDirectory(fullPath, depth + 1, maxDepth));
            }
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
    if (!fs.existsSync(basePath)) {
      console.log(`Skipping non-existent path: ${basePath}`);
      continue;
    }

    console.log(`Scanning: ${basePath}`);
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

    const addedApps: Array<{
      name: string;
      executablePath: string;
      category: string;
    }> = [];
    const seenAppNames = new Set<string>(); // Track app names to avoid duplicates

    for (const app of detectedApps) {
      try {
        // Check if app with this executable path already exists (fast lookup)
        if (existingPaths.has(app.executablePath.toLowerCase())) {
          continue;
        }

        // Check if we've already added an app with this name
        const normalizedName = app.name.toLowerCase().trim();
        if (seenAppNames.has(normalizedName)) {
          console.log(`Skipping duplicate app: ${app.name}`);
          continue;
        }

        // Get the category for this app
        const category = getAppCategory(app.name, app.executablePath);
        if (!category) {
          console.log(`No category found for: ${app.name}`);
          continue;
        }

        seenAppNames.add(normalizedName);

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
          category: category,
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
        addedApps.push({
          name: app.name,
          executablePath: app.executablePath,
          category,
        });

        console.log(`Added app: ${app.name} (${category})`);
      } catch (error) {
        console.error(`Error adding app ${app.name}:`, error);
        continue;
      }
    }

    // Sort added apps by category, then by name
    addedApps.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });

    console.log(`\n=== Scan Complete ===`);
    console.log(`Added ${addedApps.length} new apps\n`);

    // Group by category for summary
    const byCategory = addedApps.reduce(
      (acc, app) => {
        if (!acc[app.category]) {
          acc[app.category] = [];
        }
        acc[app.category].push(app.name);
        return acc;
      },
      {} as Record<string, string[]>
    );

    // Print summary by category
    for (const [category, apps] of Object.entries(byCategory).sort()) {
      console.log(`${category} (${apps.length}):`);
      apps.forEach((app) => console.log(`  - ${app}`));
      console.log("");
    }

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
