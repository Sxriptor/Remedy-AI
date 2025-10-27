import { registerEvent } from "../register-event";
import { gamesSublevel, levelKeys } from "@main/level";
import path from "node:path";
import fs from "node:fs";
import { SystemPath } from "@main/services/system-path";
import { randomUUID } from "node:crypto";
import type { GameShop } from "@types";

interface DetectedApp {
  name: string;
  executablePath: string;
}

const getWindowsInstalledApps = async (): Promise<DetectedApp[]> => {
  const apps: DetectedApp[] = [];

  const commonPaths = [
    path.join(SystemPath.getPath("programFiles")),
    path.join(SystemPath.getPath("programFiles(x86)")),
    path.join(SystemPath.getPath("home"), "AppData", "Local", "Programs"),
  ];

  const scanDirectory = (dir: string, depth = 0): string[] => {
    const executables: string[] = [];

    if (depth > 3) return executables;

    try {
      if (!fs.existsSync(dir)) return executables;

      const files = fs.readdirSync(dir, { withFileTypes: true });

      for (const file of files) {
        try {
          const fullPath = path.join(dir, file.name);

          if (file.isDirectory()) {
            executables.push(...scanDirectory(fullPath, depth + 1));
          } else if (file.isFile() && file.name.toLowerCase().endsWith(".exe")) {
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
      const appName = path.basename(exePath, ".exe");

      // Skip system and temporary files
      if (
        appName.toLowerCase().includes("uninstall") ||
        appName.toLowerCase().includes("setup") ||
        appName.toLowerCase().includes("temp") ||
        appName.toLowerCase().includes("tmp")
      ) {
        continue;
      }

      apps.push({
        name: appName,
        executablePath: exePath,
      });
    }
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
    const detectedApps =
      process.platform === "win32"
        ? await getWindowsInstalledApps()
        : process.platform === "linux"
          ? await getLinuxInstalledApps()
          : [];

    const addedApps: Array<{ name: string; executablePath: string }> = [];

    for (const app of detectedApps) {
      try {
        // Check if app with this executable path already exists
        const existingGames = await gamesSublevel.iterator().all();
        const appExists = existingGames.some(
          ([_key, game]) =>
            game.executablePath === app.executablePath && !game.isDeleted
        );

        if (appExists) {
          continue;
        }

        const objectId = randomUUID();
        const shop: GameShop = "custom";
        const gameKey = levelKeys.game(shop, objectId);

        const game = {
          title: app.name,
          iconUrl: null,
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

        await gamesSublevel.put(gameKey, game);
        addedApps.push(app);
      } catch (error) {
        console.error(`Error adding app ${app.name}:`, error);
        continue;
      }
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
