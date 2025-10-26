import type { Game } from "@types";

/**
 * Cloud sync has been disabled.
 * Games are now only created locally.
 */
export const createGame = async (_game: Game) => {
  // Stub: No longer creating games on remote server
  return Promise.resolve();
};
