import { registerEvent } from "../register-event";
import type { FriendRequestSync } from "@types";

/**
 * Cloud sync has been disabled.
 * Friend requests are no longer synced with a remote server.
 */
export const syncFriendRequests = async () => {
  // Stub: No longer syncing friend requests
  return { friendRequestCount: 0 } as FriendRequestSync;
};

registerEvent("syncFriendRequests", syncFriendRequests);
