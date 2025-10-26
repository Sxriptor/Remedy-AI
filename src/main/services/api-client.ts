import axios, { AxiosInstance } from "axios";
import { WindowManager } from "./window-manager";
import { uploadGamesBatch } from "./library-sync";
import { clearGamesRemoteIds } from "./library-sync/clear-games-remote-id";
import { logger } from "./logger";
import { UserNotLoggedInError, SubscriptionRequiredError } from "@shared";
import { appVersion } from "@main/constants";
import { getUserData } from "./user/get-user-data";
import { db } from "@main/level";
import { levelKeys } from "@main/level/sublevels";
import type { Auth, User } from "@types";

export interface ApiOptions {
  needsAuth?: boolean;
  needsSubscription?: boolean;
  ifModifiedSince?: Date;
}

interface UserAuth {
  authToken: string;
  refreshToken: string;
  expirationTimestamp: number;
  subscription: { expiresAt: Date | string | null } | null;
}

/**
 * Generic API Client - Configure with your own backend (e.g., Supabase)
 *
 * This is a stub implementation. You should:
 * 1. Set your API base URL via environment variable or config
 * 2. Implement authentication with Supabase
 * 3. Implement the endpoints you need for your backend
 */
export class ApiClient {
  private static instance: AxiosInstance;

  private static userAuth: UserAuth = {
    authToken: "",
    refreshToken: "",
    expirationTimestamp: 0,
    subscription: null,
  };

  public static isLoggedIn() {
    return this.userAuth.authToken !== "";
  }

  private static hasActiveSubscription() {
    const expiresAt = new Date(this.userAuth.subscription?.expiresAt ?? 0);
    return expiresAt > new Date();
  }

  static async handleExternalAuth(uri: string) {
    // TODO: Implement your own authentication flow with Supabase
    logger.log("External auth received:", uri);

    // Example: Parse auth data from URI
    // const { payload } = url.parse(uri, true).query;
    // Implement your Supabase authentication here

    if (WindowManager.mainWindow) {
      WindowManager.mainWindow.webContents.send("on-signin");
      await clearGamesRemoteIds();
      uploadGamesBatch();
    }
  }

  static handleSignOut() {
    this.userAuth = {
      authToken: "",
      refreshToken: "",
      expirationTimestamp: 0,
      subscription: null,
    };
  }

  static async setupApi() {
    // TODO: Configure your API base URL
    const baseURL = process.env.REMEDY_API_URL || "http://localhost:3000/api";

    this.instance = axios.create({
      baseURL,
      headers: { "User-Agent": `Remedy v${appVersion}` },
    });

    // Load stored auth data
    const result = await db.getMany<string>([levelKeys.auth, levelKeys.user], {
      valueEncoding: "json",
    });

    const userAuth = result.at(0) as Auth | undefined;
    const user = result.at(1) as User | undefined;

    this.userAuth = {
      authToken: userAuth?.accessToken ?? "",
      refreshToken: userAuth?.refreshToken ?? "",
      expirationTimestamp: userAuth?.tokenExpirationTimestamp ?? 0,
      subscription: user?.subscription
        ? { expiresAt: user.subscription?.expiresAt }
        : null,
    };

    // Try to get updated user data if logged in
    if (this.isLoggedIn()) {
      try {
        const updatedUserData = await getUserData();
        this.userAuth.subscription = updatedUserData?.subscription
          ? { expiresAt: updatedUserData.subscription.expiresAt }
          : null;
      } catch (err) {
        logger.error("Failed to get user data on startup:", err);
      }
    }
  }

  public static async refreshToken() {
    // TODO: Implement token refresh with your backend
    throw new Error(
      "Token refresh not implemented - configure your auth backend"
    );
  }

  private static async revalidateAccessTokenIfExpired() {
    if (this.userAuth.expirationTimestamp < Date.now()) {
      try {
        await this.refreshToken();
      } catch (err) {
        logger.error("Token refresh failed:", err);
      }
    }
  }

  private static getAxiosConfig() {
    return {
      headers: {
        Authorization: `Bearer ${this.userAuth.authToken}`,
      },
    };
  }

  private static async validateOptions(options?: ApiOptions) {
    const needsAuth = options?.needsAuth == undefined || options.needsAuth;
    const needsSubscription = options?.needsSubscription === true;

    if (needsAuth) {
      if (!this.isLoggedIn()) throw new UserNotLoggedInError();
      await this.revalidateAccessTokenIfExpired();
    }

    if (needsSubscription && !this.hasActiveSubscription()) {
      throw new SubscriptionRequiredError();
    }
  }

  // Generic HTTP methods - implement your backend endpoints as needed
  static async get<T = any>(
    url: string,
    params?: any,
    options?: ApiOptions
  ): Promise<T> {
    await this.validateOptions(options);

    try {
      const response = await this.instance.get<T>(url, {
        params,
        ...this.getAxiosConfig(),
      });
      return response.data;
    } catch (err) {
      logger.error("API GET error:", url, err);
      throw err;
    }
  }

  static async post<T = any>(
    url: string,
    data?: any,
    options?: ApiOptions
  ): Promise<T> {
    await this.validateOptions(options);

    try {
      const response = await this.instance.post<T>(
        url,
        data,
        this.getAxiosConfig()
      );
      return response.data;
    } catch (err) {
      logger.error("API POST error:", url, err);
      throw err;
    }
  }

  static async put<T = any>(
    url: string,
    data?: any,
    options?: ApiOptions
  ): Promise<T> {
    await this.validateOptions(options);

    try {
      const response = await this.instance.put<T>(
        url,
        data,
        this.getAxiosConfig()
      );
      return response.data;
    } catch (err) {
      logger.error("API PUT error:", url, err);
      throw err;
    }
  }

  static async patch<T = any>(
    url: string,
    data?: any,
    options?: ApiOptions
  ): Promise<T> {
    await this.validateOptions(options);

    try {
      const response = await this.instance.patch<T>(
        url,
        data,
        this.getAxiosConfig()
      );
      return response.data;
    } catch (err) {
      logger.error("API PATCH error:", url, err);
      throw err;
    }
  }

  static async delete<T = any>(url: string, options?: ApiOptions): Promise<T> {
    await this.validateOptions(options);

    try {
      const response = await this.instance.delete<T>(
        url,
        this.getAxiosConfig()
      );
      return response.data;
    } catch (err) {
      logger.error("API DELETE error:", url, err);
      throw err;
    }
  }
}

// Export with original name for compatibility
export { ApiClient as HydraApi };
