import { User, type ProfileVisibility, type UserDetails } from "@types";
import { logger } from "../logger";
import { db } from "@main/level";
import { levelKeys } from "@main/level/sublevels";

export const getUserData = async () => {
  // API calls removed - returning local user data only
  // TODO: Implement Supabase user profile fetching if needed

  try {
    const loggedUser = await db.get<string, User>(levelKeys.user, {
      valueEncoding: "json",
    });

    if (loggedUser) {
      return {
        ...loggedUser,
        username: "",
        bio: "",
        email: null,
        profileVisibility: "PUBLIC" as ProfileVisibility,
        quirks: {
          backupsPerGameLimit: 0,
        },
        subscription: loggedUser.subscription
          ? {
              id: loggedUser.subscription.id,
              status: loggedUser.subscription.status,
              plan: {
                id: loggedUser.subscription.plan.id,
                name: loggedUser.subscription.plan.name,
              },
              expiresAt: loggedUser.subscription.expiresAt,
            }
          : null,
        featurebaseJwt: "",
      } as UserDetails;
    }
  } catch (dbError) {
    logger.warn("No local user data found", dbError);
  }

  return null;
};
