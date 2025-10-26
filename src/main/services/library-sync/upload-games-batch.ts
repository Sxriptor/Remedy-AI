import { WindowManager } from "../window-manager";
import { AchievementWatcherManager } from "../achievements/achievement-watcher-manager";

/**
 * Cloud sync has been disabled.
 * This function no longer uploads game data to a remote server.
 */
export const uploadGamesBatch = async () => {
  // Stub: No longer syncing to cloud

  // Still initialize achievement watchers locally
  AchievementWatcherManager.preSearchAchievements();

  if (WindowManager.mainWindow)
    WindowManager.mainWindow.webContents.send("on-library-batch-complete");
};
