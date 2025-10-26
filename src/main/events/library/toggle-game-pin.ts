import { registerEvent } from "../register-event";
import { gamesSublevel, levelKeys } from "@main/level";
import { logger } from "@main/services";
import type { GameShop } from "@types";

const toggleGamePin = async (
  _event: Electron.IpcMainInvokeEvent,
  shop: GameShop,
  objectId: string,
  pin: boolean
) => {
  try {
    const gameKey = levelKeys.game(shop, objectId);

    const game = await gamesSublevel.get(gameKey);
    if (!game) return;

    // Cloud sync disabled - pin status is now only stored locally
    if (pin) {
      await gamesSublevel.put(gameKey, {
        ...game,
        isPinned: pin,
        pinnedDate: new Date(),
      });
    } else {
      await gamesSublevel.put(gameKey, {
        ...game,
        isPinned: pin,
        pinnedDate: null,
      });
    }
  } catch (error) {
    logger.error("Failed to update game pinned status", error);
    throw new Error(`Failed to update game pinned status: ${error}`);
  }
};

registerEvent("toggleGamePin", toggleGamePin);
