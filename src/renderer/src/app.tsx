import { useCallback, useEffect, useRef, useState } from "react";
import achievementSound from "@renderer/assets/audio/achievement.wav";
import { Sidebar, BottomPanel, Header, Toast } from "@renderer/components";

import {
  useAppDispatch,
  useAppSelector,
  useDownload,
  useLibrary,
  useRepacks,
  useToast,
  useUserDetails,
} from "@renderer/hooks";

import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  setUserPreferences,
  toggleDraggingDisabled,
  closeToast,
  setUserDetails,
  setProfileBackground,
  setGameRunning,
  setIsImportingSources,
} from "@renderer/features";
import { useTranslation } from "react-i18next";
import { UserFriendModal } from "./pages/shared-modals/user-friend-modal";
import { useSubscription } from "./hooks/use-subscription";
import { HydraCloudModal } from "./pages/shared-modals/hydra-cloud/hydra-cloud-modal";

import { injectCustomCss, removeCustomCss } from "./helpers";
import "./app.scss";

export interface AppProps {
  children: React.ReactNode;
}

export function App() {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { updateLibrary, library } = useLibrary();

  const { t } = useTranslation("app");

  const { updateRepacks } = useRepacks();

  const { clearDownload, setLastPacket } = useDownload();

  const {
    userDetails,
    hasActiveSubscription,
    isFriendsModalVisible,
    friendRequetsModalTab,
    friendModalUserId,
    hideFriendsModal,
    fetchUserDetails,
    updateUserDetails,
    clearUserDetails,
  } = useUserDetails();

  const { hideHydraCloudModal, isHydraCloudModalVisible, hydraCloudFeature } =
    useSubscription();

  const dispatch = useAppDispatch();

  const draggingDisabled = useAppSelector(
    (state) => state.window.draggingDisabled
  );

  const toast = useAppSelector((state) => state.toast);

  const { showSuccessToast } = useToast();

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await window.electron.getSupabaseSession();
        const authenticated = !!session?.user;
        setIsAuthenticated(authenticated);

        if (
          !authenticated &&
          !location.pathname.startsWith("/auth") &&
          location.pathname !== "/login"
        ) {
          navigate("/login");
        }
      } catch (err) {
        console.error("Error checking auth:", err);
        setIsAuthenticated(false);
        navigate("/login");
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [navigate, location.pathname]);

  // Listen for Supabase auth success
  useEffect(() => {
    const unsubscribe = window.electron.onSupabaseAuthSuccess(() => {
      setIsAuthenticated(true);
      navigate("/");
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    // Only load preferences if authenticated
    if (!isAuthenticated) return;

    Promise.all([window.electron.getUserPreferences(), updateLibrary()]).then(
      ([preferences]) => {
        dispatch(setUserPreferences(preferences));
      }
    );
  }, [navigate, location.pathname, dispatch, updateLibrary, isAuthenticated]);

  useEffect(() => {
    const unsubscribe = window.electron.onDownloadProgress(
      (downloadProgress) => {
        if (downloadProgress?.progress === 1) {
          clearDownload();
          updateLibrary();
          return;
        }

        setLastPacket(downloadProgress);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [clearDownload, setLastPacket, updateLibrary]);

  useEffect(() => {
    const unsubscribe = window.electron.onHardDelete(() => {
      updateLibrary();
    });

    return () => unsubscribe();
  }, [updateLibrary]);

  useEffect(() => {
    // Only fetch user details if authenticated
    if (!isAuthenticated) return;

    const cachedUserDetails = window.localStorage.getItem("userDetails");

    if (cachedUserDetails) {
      const { profileBackground, ...userDetails } =
        JSON.parse(cachedUserDetails);

      dispatch(setUserDetails(userDetails));
      dispatch(setProfileBackground(profileBackground));
    }

    fetchUserDetails()
      .then((response) => {
        if (response) {
          updateUserDetails(response);
          window.electron.syncFriendRequests();
        }
      })
      .finally(() => {
        if (document.getElementById("external-resources")) return;

        const $script = document.createElement("script");
        $script.id = "external-resources";
        $script.src = `${import.meta.env.RENDERER_VITE_EXTERNAL_RESOURCES_URL}/bundle.js?t=${Date.now()}`;
        document.head.appendChild($script);
      });
  }, [fetchUserDetails, updateUserDetails, dispatch, isAuthenticated]);

  const onSignIn = useCallback(() => {
    fetchUserDetails().then((response) => {
      if (response) {
        updateUserDetails(response);
        window.electron.syncFriendRequests();
        showSuccessToast(t("successfully_signed_in"));
      }
    });
  }, [fetchUserDetails, t, showSuccessToast, updateUserDetails]);

  useEffect(() => {
    const unsubscribe = window.electron.onGamesRunning((gamesRunning) => {
      if (gamesRunning.length) {
        const lastGame = gamesRunning[gamesRunning.length - 1];
        const libraryGame = library.find(
          (library) => library.id === lastGame.id
        );

        if (libraryGame) {
          dispatch(
            setGameRunning({
              ...libraryGame,
              sessionDurationInMillis: lastGame.sessionDurationInMillis,
            })
          );
          return;
        }
      }
      dispatch(setGameRunning(null));
    });

    return () => {
      unsubscribe();
    };
  }, [dispatch, library]);

  useEffect(() => {
    const listeners = [
      window.electron.onSignIn(onSignIn),
      window.electron.onLibraryBatchComplete(() => {
        updateLibrary();
      }),
      window.electron.onSignOut(() => clearUserDetails()),
    ];

    return () => {
      listeners.forEach((unsubscribe) => unsubscribe());
    };
  }, [onSignIn, updateLibrary, clearUserDetails]);

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [location.pathname, location.search]);

  useEffect(() => {
    new MutationObserver(() => {
      const modal = document.body.querySelector("[data-hydra-dialog]");

      dispatch(toggleDraggingDisabled(Boolean(modal)));
    }).observe(document.body, {
      attributes: false,
      childList: true,
    });
  }, [dispatch, draggingDisabled]);

  useEffect(() => {
    (async () => {
      dispatch(setIsImportingSources(true));

      try {
        // Initial repacks load
        await updateRepacks();

        // Sync all local sources (check for updates)
        const newRepacksCount = await window.electron.syncDownloadSources();

        if (newRepacksCount > 0) {
          window.electron.publishNewRepacksNotification(newRepacksCount);
        }

        // Update fingerprints for sources that don't have them
        await window.electron.updateMissingFingerprints();

        // Update repacks AFTER all syncing and fingerprint updates are complete
        await updateRepacks();
      } catch (error) {
        console.error("Error syncing download sources:", error);
        // Still update repacks even if sync fails
        await updateRepacks();
      } finally {
        dispatch(setIsImportingSources(false));
      }
    })();
  }, [updateRepacks, dispatch]);

  const loadAndApplyTheme = useCallback(async () => {
    const activeTheme = await window.electron.getActiveCustomTheme();
    if (activeTheme?.code) {
      injectCustomCss(activeTheme.code);
    } else {
      removeCustomCss();
    }
  }, []);

  useEffect(() => {
    loadAndApplyTheme();
  }, [loadAndApplyTheme]);

  useEffect(() => {
    const unsubscribe = window.electron.onCustomThemeUpdated(() => {
      loadAndApplyTheme();
    });

    return () => unsubscribe();
  }, [loadAndApplyTheme]);

  const playAudio = useCallback(() => {
    const audio = new Audio(achievementSound);
    audio.volume = 0.2;
    audio.play();
  }, []);

  useEffect(() => {
    const unsubscribe = window.electron.onAchievementUnlocked(() => {
      playAudio();
    });

    return () => {
      unsubscribe();
    };
  }, [playAudio]);

  const handleToastClose = useCallback(() => {
    dispatch(closeToast());
  }, [dispatch]);

  // Show loading spinner while checking auth
  if (checkingAuth) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "linear-gradient(135deg, #1c1c1c 0%, #2d2d2d 100%)",
        }}
      >
        <div
          style={{
            textAlign: "center",
            color: "#fff",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              margin: "0 auto 1rem",
              border: "4px solid rgba(255, 255, 255, 0.1)",
              borderTopColor: "#fff",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <p>Loading Remedy...</p>
        </div>
      </div>
    );
  }

  // Don't show main app if not authenticated
  if (
    !isAuthenticated &&
    !location.pathname.startsWith("/auth") &&
    location.pathname !== "/login"
  ) {
    return null;
  }

  return (
    <>
      {window.electron.platform === "win32" && (
        <div className="title-bar">
          <h4>
            Remedy
            {hasActiveSubscription && (
              <span className="title-bar__cloud-text"> Cloud</span>
            )}
          </h4>
        </div>
      )}

      <Toast
        visible={toast.visible}
        title={toast.title}
        message={toast.message}
        type={toast.type}
        onClose={handleToastClose}
        duration={toast.duration}
      />

      <HydraCloudModal
        visible={isHydraCloudModalVisible}
        onClose={hideHydraCloudModal}
        feature={hydraCloudFeature}
      />

      {userDetails && (
        <UserFriendModal
          visible={isFriendsModalVisible}
          initialTab={friendRequetsModalTab}
          onClose={hideFriendsModal}
          userId={friendModalUserId}
        />
      )}

      <main>
        <Sidebar />

        <article className="container">
          <Header />

          <section ref={contentRef} className="container__content">
            <Outlet />
          </section>
        </article>
      </main>

      <BottomPanel />
    </>
  );
}
