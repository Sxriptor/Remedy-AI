import { downloadsSublevel } from "./level/sublevels/downloads";
import { sortBy } from "lodash-es";
import { levelKeys, db } from "./level";
import type { UserPreferences } from "@types";
import {
  SystemPath,
  CommonRedistManager,
  TorBoxClient,
  RealDebridClient,
  Aria2,
  DownloadManager,
  uploadGamesBatch,
  startMainLoop,
  Ludusavi,
  Lock,
  DeckyPlugin,
  ResourceCache,
  initializeSupabase,
} from "@main/services";

export const loadState = async () => {
  await Lock.acquireLock();

  ResourceCache.initialize();
  await ResourceCache.updateResourcesOnStartup();

  const userPreferences = await db.get<string, UserPreferences | null>(
    levelKeys.userPreferences,
    {
      valueEncoding: "json",
    }
  );

  await import("./events");

  if (process.platform !== "darwin") {
    Aria2.spawn();
  }

  if (userPreferences?.realDebridApiToken) {
    RealDebridClient.authorize(userPreferences.realDebridApiToken);
  }

  if (userPreferences?.torBoxApiToken) {
    TorBoxClient.authorize(userPreferences.torBoxApiToken);
  }

  Ludusavi.copyConfigFileToUserData();
  Ludusavi.copyBinaryToUserData();

  if (process.platform === "linux") {
    DeckyPlugin.checkAndUpdateIfOutdated();
  }

  // Initialize Supabase
  initializeSupabase();

  uploadGamesBatch();

  const downloads = await downloadsSublevel
    .values()
    .all()
    .then((games) => {
      return sortBy(games, "timestamp", "DESC");
    });

  downloads.forEach((download) => {
    if (download.extracting) {
      downloadsSublevel.put(levelKeys.game(download.shop, download.objectId), {
        ...download,
        extracting: false,
      });
    }
  });

  const [nextItemOnQueue] = downloads.filter((game) => game.queued);

  // Seeding functionality removed - torrents no longer supported
  await DownloadManager.startRPC(nextItemOnQueue, undefined);

  startMainLoop();

  CommonRedistManager.downloadCommonRedist();

  SystemPath.checkIfPathsAreAvailable();
};
