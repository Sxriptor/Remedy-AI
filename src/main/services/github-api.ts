import { logger } from "./logger";

export interface GitHubUserData {
  bio: string | null;
  blog: string | null;
  twitter_username: string | null;
  company: string | null;
  location: string | null;
}

/**
 * Fetch public GitHub user data
 * @param username - GitHub username
 * @returns GitHub user data or null if failed
 */
export async function fetchGitHubUserData(
  username: string
): Promise<GitHubUserData | null> {
  try {
    logger.info(`Fetching GitHub data for user: ${username}`);

    const response = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Remedy-App",
      },
    });

    if (!response.ok) {
      logger.error(`GitHub API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    logger.info("Successfully fetched GitHub user data");

    return {
      bio: data.bio || null,
      blog: data.blog || null,
      twitter_username: data.twitter_username || null,
      company: data.company || null,
      location: data.location || null,
    };
  } catch (error) {
    logger.error("Error fetching GitHub user data:", error);
    return null;
  }
}
