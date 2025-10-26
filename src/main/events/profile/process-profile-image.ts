import { registerEvent } from "../register-event";
// Python RPC removed - profile image processing disabled

const processProfileImage = async (
  _event: Electron.IpcMainInvokeEvent,
  _path: string
) => {
  // Profile image processing removed - Python RPC no longer available
  throw new Error("Profile image processing not implemented");
};

registerEvent("processProfileImage", processProfileImage);
