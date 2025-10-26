import { registerEvent } from "../register-event";
import { logger } from "@main/services";
// Python RPC removed - process watching disabled
import { GameShop } from "@types";

const closeGame = async (
  _event: Electron.IpcMainInvokeEvent,
  _shop: GameShop,
  _objectId: string
) => {
  // Game process closing removed - Python RPC no longer available
  // TODO: Implement direct process management without Python
  logger.warn("closeGame not implemented - Python RPC removed");
};

registerEvent("closeGame", closeGame);
