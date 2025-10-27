import { Button } from "@renderer/components";
import { useTranslation } from "react-i18next";
import { SettingsGeneral } from "./settings-general";
import { SettingsBehavior } from "./settings-behavior";
import { SettingsDownloadSources } from "./settings-download-sources";
import {
  SettingsContextConsumer,
  SettingsContextProvider,
} from "@renderer/context";
import { SettingsAccount } from "./settings-account";
import { useUserDetails, useToast } from "@renderer/hooks";
import { useMemo, useState, useCallback } from "react";
import "./settings.scss";
import { SettingsAppearance } from "./aparence/settings-appearance";
import { SettingsDebrid } from "./settings-debrid";

export default function Settings() {
  const { t } = useTranslation("settings");

  const { userDetails } = useUserDetails();
  const { showSuccessToast } = useToast();
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = useCallback(async () => {
    setIsScanning(true);

    try {
      const result = await window.electron.scanInstalledApps();

      if (result.success && result.addedCount > 0) {
        showSuccessToast(t("scan_complete", { count: result.addedCount }));
      } else if (result.success) {
        showSuccessToast(t("scan_complete_no_apps"));
      }
    } catch (error) {
      console.error("Scan error:", error);
    } finally {
      setIsScanning(false);
    }
  }, [t, showSuccessToast]);

  const categories = useMemo(() => {
    const categories = [
      { tabLabel: t("general"), contentTitle: t("general") },
      { tabLabel: t("behavior"), contentTitle: t("behavior") },
      { tabLabel: t("download_sources"), contentTitle: t("download_sources") },
      {
        tabLabel: t("appearance"),
        contentTitle: t("appearance"),
      },
      { tabLabel: t("debrid"), contentTitle: t("debrid") },
    ];

    if (userDetails)
      return [
        ...categories,
        { tabLabel: t("account"), contentTitle: t("account") },
      ];
    return categories;
  }, [userDetails, t]);

  return (
    <SettingsContextProvider>
      <SettingsContextConsumer>
        {({ currentCategoryIndex, setCurrentCategoryIndex, appearance }) => {
          const renderCategory = () => {
            if (currentCategoryIndex === 0) {
              return <SettingsGeneral />;
            }

            if (currentCategoryIndex === 1) {
              return <SettingsBehavior />;
            }

            if (currentCategoryIndex === 2) {
              return <SettingsDownloadSources />;
            }

            if (currentCategoryIndex === 3) {
              return <SettingsAppearance appearance={appearance} />;
            }

            if (currentCategoryIndex === 4) {
              return <SettingsDebrid />;
            }

            return <SettingsAccount />;
          };

          return (
            <section className="settings__container">
              <div className="settings__content">
                <section className="settings__categories">
                  {categories.map((category, index) => (
                    <Button
                      key={category.contentTitle}
                      theme={
                        currentCategoryIndex === index ? "primary" : "outline"
                      }
                      onClick={() => setCurrentCategoryIndex(index)}
                    >
                      {category.tabLabel}
                    </Button>
                  ))}
                  <Button
                    theme="blue"
                    onClick={handleScan}
                    disabled={isScanning}
                  >
                    {isScanning ? t("scanning") : t("scan")}
                  </Button>
                </section>

                <h2>{categories[currentCategoryIndex].contentTitle}</h2>
                {renderCategory()}
              </div>
            </section>
          );
        }}
      </SettingsContextConsumer>
    </SettingsContextProvider>
  );
}
