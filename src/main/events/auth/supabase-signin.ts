import { ipcMain, shell } from "electron";
import { getSupabaseClient } from "@main/services";
import { registerEvent } from "../register-event";
import { WindowManager } from "@main/services";
import { logger } from "@main/services";

/**
 * Initiate GitHub OAuth sign-in flow
 * Opens the default browser for OAuth and listens for callback
 */
const signInWithGitHub = async () => {
  try {
    logger.info("Starting GitHub OAuth sign-in...");

    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase client not initialized");
    }

    // Get the OAuth URL from Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: "remedy://auth/callback",
        skipBrowserRedirect: true, // We'll handle the redirect manually
      },
    });

    if (error) {
      logger.error("Error getting OAuth URL:", error);
      throw error;
    }

    if (!data.url) {
      throw new Error("No OAuth URL returned from Supabase");
    }

    logger.info("Opening OAuth URL in browser:", data.url);

    // Open the OAuth URL in the user's default browser
    await shell.openExternal(data.url);

    return { success: true };
  } catch (error: any) {
    logger.error("Sign in error:", error);
    return {
      success: false,
      error: error.message || "Failed to start sign-in process",
    };
  }
};

/**
 * Handle the OAuth callback from the browser
 * Extracts tokens from the URL and sets the session
 */
const handleSupabaseCallback = async (
  _event: Electron.IpcMainInvokeEvent,
  hash: string
) => {
  try {
    logger.info("Handling Supabase OAuth callback");

    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase client not initialized");
    }

    // Parse the hash to extract tokens
    const hashParams = new URLSearchParams(hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (!accessToken) {
      throw new Error("No access token in callback");
    }

    logger.info("Setting Supabase session with tokens");

    // Set the session in Supabase
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || "",
    });

    if (error) {
      logger.error("Error setting session:", error);
      throw error;
    }

    logger.info("Successfully authenticated user:", data.user?.email);

    // Send success event to renderer
    if (WindowManager.mainWindow) {
      WindowManager.mainWindow.webContents.send("supabase-auth-success", {
        user: data.user,
      });
    }

    return { success: true, user: data.user };
  } catch (error: any) {
    logger.error("Callback handling error:", error);
    return {
      success: false,
      error: error.message || "Failed to complete authentication",
    };
  }
};

/**
 * Get the current Supabase session
 */
const getSupabaseSession = async () => {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return null;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  } catch (error) {
    logger.error("Error getting session:", error);
    return null;
  }
};

/**
 * Sign out from Supabase
 */
const supabaseSignOut = async () => {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: "Supabase not initialized" };
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      logger.error("Sign out error:", error);
      return { success: false, error: error.message };
    }

    logger.info("User signed out successfully");

    // Notify renderer
    if (WindowManager.mainWindow) {
      WindowManager.mainWindow.webContents.send("supabase-signed-out");
    }

    return { success: true };
  } catch (error: any) {
    logger.error("Sign out error:", error);
    return { success: false, error: error.message };
  }
};

registerEvent("signInWithGitHub", signInWithGitHub);
registerEvent("handleSupabaseCallback", handleSupabaseCallback);
registerEvent("getSupabaseSession", getSupabaseSession);
registerEvent("supabaseSignOut", supabaseSignOut);

ipcMain.on("supabase-auth-success", () => {
  logger.info("Auth success event acknowledged");
});
