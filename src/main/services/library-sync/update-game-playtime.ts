import type { Game } from "@types";

/**
 * Cloud sync has been disabled.
 * Game playtime is now only tracked locally.
 */
export const updateGamePlaytime = async (
  _game: Game,
  _deltaInMillis: number,
  _lastTimePlayed: Date
) => {
  // Stub: No longer syncing playtime to cloud
  return Promise.resolve();
};
