import { registerEvent } from "../register-event";
import { authManager } from "@main/services";

const signInWithGitHub = async () => {
  return await authManager.startSignIn();
};

registerEvent("signInWithGitHub", signInWithGitHub);
