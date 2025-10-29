import { useTranslation } from "react-i18next";

import { useDownload, useLibrary } from "@renderer/hooks";

import { useEffect, useMemo, useRef, useState } from "react";
import { BinaryNotFoundModal } from "../shared-modals/binary-not-found-modal";
import "./downloads.scss";
import { DeleteGameModal } from "./delete-game-modal";
import { DownloadGroup } from "./download-group";
import type { GameShop, LibraryGame, SeedingStatus } from "@types";
import { orderBy } from "lodash-es";
import {
  ArrowDownIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@primer/octicons-react";

export default function Downloads() {
  const { library, updateLibrary } = useLibrary();

  const { t } = useTranslation("downloads");

  const gameToBeDeleted = useRef<[GameShop, string] | null>(null);

  const [showBinaryNotFoundModal, setShowBinaryNotFoundModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [extensionsCollapsed, setExtensionsCollapsed] = useState(true);

  const { removeGameInstaller } = useDownload();

  const handleDeleteGame = async () => {
    if (gameToBeDeleted.current) {
      const [shop, objectId] = gameToBeDeleted.current;

      // Seeding removed - torrents no longer supported
      await removeGameInstaller(shop, objectId);
    }
  };

  const { lastPacket } = useDownload();

  const [seedingStatus, setSeedingStatus] = useState<SeedingStatus[]>([]);

  useEffect(() => {
    window.electron.onSeedingStatus((value) => setSeedingStatus(value));

    const unsubscribe = window.electron.onExtractionComplete(() => {
      updateLibrary();
    });

    return () => unsubscribe();
  }, [updateLibrary]);

  const handleOpenGameInstaller = (shop: GameShop, objectId: string) =>
    window.electron.openGameInstaller(shop, objectId).then((isBinaryInPath) => {
      if (!isBinaryInPath) setShowBinaryNotFoundModal(true);
      updateLibrary();
    });

  const handleOpenDeleteGameModal = (shop: GameShop, objectId: string) => {
    gameToBeDeleted.current = [shop, objectId];
    setShowDeleteModal(true);
  };

  const isExtensionOrPlugin = (game: LibraryGame): boolean => {
    const title = game.title.toLowerCase();
    const executablePath = game.executablePath?.toLowerCase() || "";

    const extensionKeywords = [
      "plugin",
      "extension",
      "addon",
      "add-on",
      "helper",
      "updater",
      "launcher",
      "installer",
      "uninstall",
      "setup",
      "config",
      "settings",
    ];

    // Check if title or path contains extension keywords
    const hasExtensionKeyword = extensionKeywords.some(
      (keyword) => title.includes(keyword) || executablePath.includes(keyword)
    );

    // Common subdirectory names for extensions/plugins
    const extensionSubdirs = [
      "\\scripts\\",
      "\\bin\\",
      "\\tools\\",
      "\\lib\\",
      "\\plugins\\",
      "\\addons\\",
      "\\utilities\\",
      "\\helpers\\",
      "/scripts/",
      "/bin/",
      "/tools/",
      "/lib/",
      "/plugins/",
      "/addons/",
      "/utilities/",
      "/helpers/",
    ];

    // Check if exe is in a subdirectory that typically contains extensions
    const isInExtensionSubdir = extensionSubdirs.some((subdir) =>
      executablePath.includes(subdir)
    );

    return hasExtensionKeyword || isInExtensionSubdir;
  };

  const libraryGroup: Record<string, LibraryGame[]> = useMemo(() => {
    const initialValue: Record<string, LibraryGame[]> = {
      downloading: [],
      queued: [],
      complete: [],
      applications: [],
      extensions: [],
    };

    const result = orderBy(
      library,
      (game) => game.download?.timestamp,
      "desc"
    ).reduce((prev, next) => {
      /* Game has been manually added to the library */
      if (!next.download) {
        if (isExtensionOrPlugin(next)) {
          return { ...prev, extensions: [...prev.extensions, next] };
        }
        return { ...prev, applications: [...prev.applications, next] };
      }

      /* Is downloading */
      if (lastPacket?.gameId === next.id || next.download.extracting)
        return { ...prev, downloading: [...prev.downloading, next] };

      /* Is either queued or paused */
      if (next.download.queued || next.download?.status === "paused")
        return { ...prev, queued: [...prev.queued, next] };

      return { ...prev, complete: [...prev.complete, next] };
    }, initialValue);

    const queued = orderBy(result.queued, (game) => game.download?.timestamp, [
      "desc",
    ]);

    const complete = orderBy(result.complete, (game) =>
      game.download?.progress === 1 ? 0 : 1
    );

    const applications = orderBy(result.applications, ["title"], ["asc"]);
    const extensions = orderBy(result.extensions, ["title"], ["asc"]);

    return {
      ...result,
      queued,
      complete,
      applications,
      extensions,
    };
  }, [library, lastPacket?.gameId, isExtensionOrPlugin]);

  const downloadGroups = [
    {
      title: t("download_in_progress"),
      library: libraryGroup.downloading,
    },
    {
      title: t("queued_downloads"),
      library: libraryGroup.queued,
    },
    {
      title: t("downloads_completed"),
      library: libraryGroup.complete,
    },
  ];

  const libraryGroups = [
    {
      title: t("applications"),
      library: libraryGroup.applications,
      collapsible: false,
    },
    {
      title: t("extensions_plugins"),
      library: libraryGroup.extensions,
      collapsible: true,
      collapsed: extensionsCollapsed,
      onToggle: () => setExtensionsCollapsed(!extensionsCollapsed),
    },
  ];

  const hasItemsInLibrary = useMemo(() => {
    return Object.values(libraryGroup).some((group) => group.length > 0);
  }, [libraryGroup]);

  return (
    <>
      <BinaryNotFoundModal
        visible={showBinaryNotFoundModal}
        onClose={() => setShowBinaryNotFoundModal(false)}
      />

      <DeleteGameModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        deleteGame={handleDeleteGame}
      />

      {hasItemsInLibrary ? (
        <section className="downloads__container">
          <div className="downloads__groups">
            {/* Downloads Section */}
            {downloadGroups.map((group) => (
              <DownloadGroup
                key={group.title}
                title={group.title}
                library={orderBy(group.library, ["updatedAt"], ["desc"])}
                openDeleteGameModal={handleOpenDeleteGameModal}
                openGameInstaller={handleOpenGameInstaller}
                seedingStatus={seedingStatus}
              />
            ))}

            {/* Library Section - Applications and Extensions/Plugins */}
            {libraryGroups.map((group) => {
              if (!group.library.length) return null;

              return (
                <div key={group.title} className="download-group">
                  <div
                    className={`download-group__header ${group.collapsible ? "download-group__header--collapsible" : ""}`}
                    onClick={group.collapsible ? group.onToggle : undefined}
                    style={{
                      cursor: group.collapsible ? "pointer" : "default",
                    }}
                  >
                    {group.collapsible && (
                      <span className="download-group__chevron">
                        {group.collapsed ? (
                          <ChevronRightIcon />
                        ) : (
                          <ChevronDownIcon />
                        )}
                      </span>
                    )}
                    <h2>{group.title}</h2>
                    <div className="download-group__header-divider" />
                    <h3 className="download-group__header-count">
                      {group.library.length}
                    </h3>
                  </div>

                  {(!group.collapsible || !group.collapsed) && (
                    <DownloadGroup
                      title=""
                      library={group.library}
                      openDeleteGameModal={handleOpenDeleteGameModal}
                      openGameInstaller={handleOpenGameInstaller}
                      seedingStatus={seedingStatus}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="downloads__no-downloads">
          <div className="downloads__arrow-icon">
            <ArrowDownIcon size={24} />
          </div>
          <h2>{t("no_downloads_title")}</h2>
          <p>{t("no_downloads_description")}</p>
        </div>
      )}
    </>
  );
}
