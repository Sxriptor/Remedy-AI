import { useAppSelector, useToast } from "@renderer/hooks";
import type { Badge, UserProfile, UserStats, UserGame } from "@types";

import { createContext, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export interface UserProfileContext {
  userProfile: UserProfile | null;
  heroBackground: string;
  /* Indicates if the current user is viewing their own profile */
  isMe: boolean;
  userStats: UserStats | null;
  getUserProfile: () => Promise<void>;
  getUserLibraryGames: (sortBy?: string) => Promise<void>;
  setSelectedBackgroundImage: React.Dispatch<React.SetStateAction<string>>;
  backgroundImage: string;
  badges: Badge[];
  libraryGames: UserGame[];
  pinnedGames: UserGame[];
}

export const DEFAULT_USER_PROFILE_BACKGROUND = "#151515B3";

export const userProfileContext = createContext<UserProfileContext>({
  userProfile: null,
  heroBackground: DEFAULT_USER_PROFILE_BACKGROUND,
  isMe: false,
  userStats: null,
  getUserProfile: async () => {},
  getUserLibraryGames: async (_sortBy?: string) => {},
  setSelectedBackgroundImage: () => {},
  backgroundImage: "",
  badges: [],
  libraryGames: [],
  pinnedGames: [],
});

const { Provider } = userProfileContext;
export const { Consumer: UserProfileContextConsumer } = userProfileContext;

export interface UserProfileContextProviderProps {
  children: React.ReactNode;
  userId: string;
}

export function UserProfileContextProvider({
  children,
  userId,
}: Readonly<UserProfileContextProviderProps>) {
  const { userDetails } = useAppSelector((state) => state.userDetails);

  const [userStats, setUserStats] = useState<UserStats | null>(null);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [libraryGames, setLibraryGames] = useState<UserGame[]>([]);
  const [pinnedGames, setPinnedGames] = useState<UserGame[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [heroBackground, setHeroBackground] = useState(
    DEFAULT_USER_PROFILE_BACKGROUND
  );
  const [selectedBackgroundImage, setSelectedBackgroundImage] = useState("");

  const isMe = userDetails?.id === userProfile?.id;

  // Hero background removed - no longer fetching from profile images

  const getBackgroundImageUrl = () => {
    if (selectedBackgroundImage && isMe)
      return `local:${selectedBackgroundImage}`;
    if (userProfile?.backgroundImageUrl) return userProfile.backgroundImageUrl;

    return "";
  };

  const { t, i18n } = useTranslation("user_profile");

  const { showErrorToast } = useToast();
  const navigate = useNavigate();

  const getUserStats = useCallback(async () => {
    // User stats removed - no longer using Hydra API
    Promise.resolve(null).then((stats) => {
      setUserStats(stats);
    });
  }, [userId]);

  const getUserLibraryGames = useCallback(
    async (sortBy?: string) => {
      try {
        const params = new URLSearchParams();
        params.append("take", "12");
        params.append("skip", "0");
        if (sortBy) {
          params.append("sortBy", sortBy);
        }

        // User library removed - no longer using Hydra API
        setLibraryGames([]);
        setPinnedGames([]);
      } catch (error) {
        setLibraryGames([]);
        setPinnedGames([]);
      }
    },
    [userId]
  );

  const getUserProfile = useCallback(async () => {
    getUserStats();
    getUserLibraryGames();

    // User profile removed - no longer using Hydra API
    return Promise.resolve(null)
      .then(() => {
        setUserProfile(null);
      })
      .catch(() => {
        showErrorToast(t("user_not_found"));
        navigate(-1);
      });
  }, [navigate, getUserStats, getUserLibraryGames, showErrorToast, userId, t]);

  const getBadges = useCallback(async () => {
    // Badges fetching removed - no longer using Hydra API
    setBadges([]);
  }, [i18n]);

  useEffect(() => {
    setUserProfile(null);
    setLibraryGames([]);
    setPinnedGames([]);
    setHeroBackground(DEFAULT_USER_PROFILE_BACKGROUND);

    getUserProfile();
    getBadges();
  }, [getUserProfile, getBadges]);

  return (
    <Provider
      value={{
        userProfile,
        heroBackground,
        isMe,
        getUserProfile,
        getUserLibraryGames,
        setSelectedBackgroundImage,
        backgroundImage: getBackgroundImageUrl(),
        userStats,
        badges,
        libraryGames,
        pinnedGames,
      }}
    >
      {children}
    </Provider>
  );
}
