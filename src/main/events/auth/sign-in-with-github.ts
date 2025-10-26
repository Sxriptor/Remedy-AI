import { registerEvent } from "../register-event";
import { shell } from "electron";
import { SupabaseClient } from "@main/services";

const signInWithGitHub = async () => {
  try {
    // Generate OAuth URL
    const { data, error } = await SupabaseClient.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${process.env.VITE_SUPABASE_REDIRECT_URL || "http://localhost:3000"}/auth/callback`,
        skipBrowserRedirect: true, // Don't redirect automatically, we'll open in external browser
      },
    });

    if (error) {
      console.error("Error generating OAuth URL:", error);
      return { success: false, error: error.message };
    }

    if (!data?.url) {
      return { success: false, error: "No OAuth URL generated" };
    }

    // Open the OAuth URL in the user's default browser
    console.log("Opening GitHub OAuth in browser:", data.url);
    await shell.openExternal(data.url);

    return { success: true };
  } catch (err: any) {
    console.error("Sign in error:", err);
    return { success: false, error: err.message || "Failed to initiate sign-in" };
  }
};

registerEvent("signInWithGitHub", signInWithGitHub);

