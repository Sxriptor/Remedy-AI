import { registerEvent } from "../register-event";
import { SupabaseClient, WindowManager } from "@main/services";

const handleSupabaseCallback = async (_event: Electron.IpcMainInvokeEvent, hash: string) => {
  try {
    console.log("Handling Supabase callback with hash");

    // Parse the hash to extract tokens
    const hashParams = new URLSearchParams(hash.substring(1)); // Remove leading '#'
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (!accessToken) {
      return { success: false, error: "No access token found in callback" };
    }

    // Set the session in Supabase
    const { data, error } = await SupabaseClient.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || "",
    });

    if (error) {
      console.error("Error setting session:", error);
      return { success: false, error: error.message };
    }

    if (!data?.session) {
      return { success: false, error: "Failed to establish session" };
    }

    console.log("Session established successfully:", data.session.user.email);

    // Notify renderer that auth was successful
    const mainWindow = WindowManager.mainWindow;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("on-supabase-auth-success");
    }

    return { success: true };
  } catch (err: any) {
    console.error("Callback handling error:", err);
    return { success: false, error: err.message || "Failed to handle callback" };
  }
};

registerEvent("handleSupabaseCallback", handleSupabaseCallback);

