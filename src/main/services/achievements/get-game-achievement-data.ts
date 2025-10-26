import type { GameShop } from "@types";
import { gameAchievementsSublevel, levelKeys } from "@main/level";

export const getGameAchievementData = async (
  objectId: string,
  shop: GameShop,
  _useCachedData: boolean
) => {
  // API calls removed - returning cached achievements only
  // TODO: Implement your own achievement data source if needed
  
  const gameKey = levelKeys.game(shop, objectId);
  const cachedAchievements = await gameAchievementsSublevel.get(gameKey);

  return cachedAchievements?.achievements ?? [];
};
