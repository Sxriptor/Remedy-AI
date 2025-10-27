import http from "http";
import { shell } from "electron";
import { URL } from "url";
import { logger } from "./logger";
import { SupabaseClient } from "./supabase-client";
import { WindowManager } from "./window-manager";
import { fetchGitHubUserData } from "./github-api";
import { db } from "../level";
import { levelKeys } from "../level/sublevels";
import type { User } from "@types";

class AuthManager {
  private callbackServer: http.Server | null = null;

  /**
   * Find an open port in the given range
   */
  private async findOpenPort(start: number, end: number): Promise<number> {
    for (let port = start; port <= end; port++) {
      try {
        await new Promise<void>((resolve, reject) => {
          const server = http.createServer();
          server.listen(port, () => {
            server.close(() => resolve());
          });
          server.on("error", reject);
        });
        return port;
      } catch {
        continue;
      }
    }
    throw new Error(`No open ports found in range ${start}-${end}`);
  }

  /**
   * Start local HTTP server to receive OAuth callback
   */
  private async startCallbackServer(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.callbackServer = http.createServer(async (req, res) => {
        try {
          const url = new URL(req.url || "", `http://localhost:${port}`);

          if (url.pathname === "/auth/callback") {
            const accessToken = url.searchParams.get("token");
            const refreshToken = url.searchParams.get("refresh_token");
            // githubToken available if needed in future
            // const githubToken = url.searchParams.get("github_token");

            if (!accessToken) {
              logger.error("No access token in callback");
              res.writeHead(400, { "Content-Type": "text/html" });
              res.end(`
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>Authentication Error</title>
                    <style>
                      body { font-family: system-ui; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #1a1a1a; color: #fff; }
                      .container { text-align: center; padding: 2rem; }
                      h1 { color: #ef4444; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <h1>Authentication Error</h1>
                      <p>No authentication token received.</p>
                      <p>You can close this window.</p>
                    </div>
                  </body>
                </html>
              `);
              return;
            }

            if (!refreshToken) {
              logger.error("No refresh token in callback");
              res.writeHead(400, { "Content-Type": "text/html" });
              res.end(`
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>Authentication Error</title>
                    <style>
                      body { font-family: system-ui; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #1a1a1a; color: #fff; }
                      .container { text-align: center; padding: 2rem; }
                      h1 { color: #ef4444; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <h1>Authentication Error</h1>
                      <p>Refresh token missing. Please ensure your website passes both access_token and refresh_token.</p>
                      <p>You can close this window.</p>
                    </div>
                  </body>
                </html>
              `);
              return;
            }

            logger.info("Received tokens, setting session...");

            // Set session with both tokens
            const { data, error } = await SupabaseClient.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              logger.error("Error setting session:", error);
              res.writeHead(500, { "Content-Type": "text/html" });
              res.end(`
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>Authentication Error</title>
                    <style>
                      body { font-family: system-ui; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #1a1a1a; color: #fff; }
                      .container { text-align: center; padding: 2rem; }
                      h1 { color: #ef4444; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <h1>Authentication Error</h1>
                      <p>${error.message}</p>
                      <p>You can close this window.</p>
                    </div>
                  </body>
                </html>
              `);
              return;
            }

            if (data?.session && data.user) {
              logger.info("Authentication successful via HTTP callback");

              // Extract GitHub user data and store it
              const githubUsername =
                data.user.user_metadata?.user_name ||
                data.user.user_metadata?.preferred_username ||
                null;
              const githubAvatarUrl =
                data.user.user_metadata?.avatar_url || null;
              const displayName =
                data.user.user_metadata?.full_name ||
                data.user.user_metadata?.name ||
                githubUsername ||
                "User";

              // Fetch additional GitHub data (bio, links, etc.)
              let githubData = null;
              if (githubUsername) {
                githubData = await fetchGitHubUserData(githubUsername);
              }

              const userData: User = {
                id: data.user.id,
                displayName,
                profileImageUrl: githubAvatarUrl,
                backgroundImageUrl: null,
                subscription: null,
                githubUsername,
                githubAvatarUrl,
                email: data.user.email || null,
                githubBio: githubData?.bio || null,
                githubBlog: githubData?.blog || null,
                githubTwitterUsername: githubData?.twitter_username || null,
                githubCompany: githubData?.company || null,
                githubLocation: githubData?.location || null,
              };

              logger.info("Storing user data:", userData);

              // Store user data in level database
              try {
                await db.put<string, User>(levelKeys.user, userData, {
                  valueEncoding: "json",
                });
                logger.info("User data stored successfully");
              } catch (dbError) {
                logger.error("Error storing user data:", dbError);
              }

              // Notify renderer
              const mainWindow = WindowManager.mainWindow;
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send("on-supabase-auth-success");
              }

              // Send success page
              res.writeHead(200, { "Content-Type": "text/html" });
              res.end(`
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>Authentication Successful</title>
                    <style>
                      body { font-family: system-ui; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #1a1a1a; color: #fff; }
                      .container { text-align: center; padding: 2rem; }
                      h1 { color: #22c55e; }
                      .checkmark { font-size: 4rem; margin-bottom: 1rem; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="checkmark">✓</div>
                      <h1>Authentication Successful!</h1>
                      <p>You can now close this window and return to Remedy.</p>
                      <script>setTimeout(() => window.close(), 2000);</script>
                    </div>
                  </body>
                </html>
              `);

              // Stop the server after successful auth
              setTimeout(() => this.stopCallbackServer(), 3000);
            }
          } else {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Not Found");
          }
        } catch (err) {
          logger.error("Error handling callback:", err);
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Internal Server Error");
        }
      });

      this.callbackServer.listen(port, () => {
        logger.info(`Auth callback server started on port ${port}`);
        resolve();
      });

      this.callbackServer.on("error", (err) => {
        logger.error("Callback server error:", err);
        reject(err);
      });
    });
  }

  /**
   * Stop the callback server
   */
  private stopCallbackServer(): void {
    if (this.callbackServer) {
      this.callbackServer.close(() => {
        logger.info("Auth callback server stopped");
      });
      this.callbackServer = null;
    }
  }

  /**
   * Start the authentication flow
   */
  async startSignIn(): Promise<{ success: boolean; error?: string }> {
    try {
      // Find an open port
      const port = await this.findOpenPort(8080, 8090);

      // Start callback server
      await this.startCallbackServer(port);

      // Build redirect URI
      const redirectUri = `http://localhost:${port}/auth/callback`;

      // Open browser with redirect_uri parameter
      const authUrl = `https://colabify.xyz/login?source=ide&redirect_uri=${encodeURIComponent(redirectUri)}`;

      logger.info(`Opening auth URL: ${authUrl}`);
      await shell.openExternal(authUrl);

      return { success: true };
    } catch (err: any) {
      logger.error("Error starting sign-in:", err);
      this.stopCallbackServer();
      return {
        success: false,
        error: err.message || "Failed to start sign-in",
      };
    }
  }

  /**
   * Clean up on app quit
   */
  cleanup(): void {
    this.stopCallbackServer();
  }
}

export const authManager = new AuthManager();
