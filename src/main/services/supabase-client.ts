import {
  createClient,
  SupabaseClient as SupabaseClientType,
} from "@supabase/supabase-js";
import { logger } from "./logger";

/**
 * Supabase Client for Remedy
 *
 * Set your Supabase credentials in .env:
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_ANON_KEY
 */

let supabaseClient: SupabaseClientType | null = null;

export const initializeSupabase = () => {
  const supabaseUrl = process.env.MAIN_VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.MAIN_VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    logger.warn(
      "Supabase credentials not configured. Please set MAIN_VITE_SUPABASE_URL and MAIN_VITE_SUPABASE_ANON_KEY in .env"
    );
    return null;
  }

  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });

    logger.info("Supabase client initialized successfully");
    return supabaseClient;
  } catch (error) {
    logger.error("Failed to initialize Supabase client:", error);
    return null;
  }
};

export const getSupabaseClient = (): SupabaseClientType | null => {
  if (!supabaseClient) {
    return initializeSupabase();
  }
  return supabaseClient;
};

// Create a wrapper object that provides direct access to auth methods
class SupabaseClientWrapper {
  get auth() {
    const client = getSupabaseClient();
    if (!client) {
      logger.warn("Supabase client not initialized");
      // Return a stub that throws errors
      return {
        signInWithOAuth: async () => ({
          data: null,
          error: new Error("Supabase not initialized"),
        }),
        signInWithPassword: async () => ({
          data: null,
          error: new Error("Supabase not initialized"),
        }),
        signUp: async () => ({
          data: null,
          error: new Error("Supabase not initialized"),
        }),
        signOut: async () => ({ error: new Error("Supabase not initialized") }),
        getSession: async () => ({
          data: { session: null },
          error: new Error("Supabase not initialized"),
        }),
        getUser: async () => ({
          data: { user: null },
          error: new Error("Supabase not initialized"),
        }),
        setSession: async () => ({
          data: { session: null },
          error: new Error("Supabase not initialized"),
        }),
      };
    }
    return client.auth;
  }

  // Convenience methods
  async signInWithOAuth(options: any) {
    return this.auth.signInWithOAuth(options);
  }

  async setSession(session: any) {
    return this.auth.setSession(session);
  }

  async getSession() {
    return this.auth.getSession();
  }

  async getUser() {
    return this.auth.getUser();
  }

  async signOut() {
    return this.auth.signOut();
  }
}

export const SupabaseClient = new SupabaseClientWrapper();

// Legacy auth helpers for backward compatibility
export const supabaseAuth = {
  async signIn(email: string, password: string) {
    const client = getSupabaseClient();
    if (!client) throw new Error("Supabase not initialized");

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async signUp(email: string, password: string) {
    const client = getSupabaseClient();
    if (!client) throw new Error("Supabase not initialized");

    const { data, error } = await client.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const client = getSupabaseClient();
    if (!client) throw new Error("Supabase not initialized");

    const { error } = await client.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const client = getSupabaseClient();
    if (!client) return null;

    const {
      data: { session },
    } = await client.auth.getSession();
    return session;
  },

  async getUser() {
    const client = getSupabaseClient();
    if (!client) return null;

    const {
      data: { user },
    } = await client.auth.getUser();
    return user;
  },
};
