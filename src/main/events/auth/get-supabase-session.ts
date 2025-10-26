import { registerEvent } from "../register-event";
import { SupabaseClient } from "@main/services";

const getSupabaseSession = async () => {
  try {
    const { data, error } = await SupabaseClient.getSession();

    if (error) {
      console.error("Error getting session:", error);
      return null;
    }

    return data?.session ? {
      user: data.session.user,
      session: data.session,
    } : null;
  } catch (err: any) {
    console.error("Get session error:", err);
    return null;
  }
};

registerEvent("getSupabaseSession", getSupabaseSession);

