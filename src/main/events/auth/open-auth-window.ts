import i18next from "i18next";
import { registerEvent } from "../register-event";
import { WindowManager } from "@main/services";
import { AuthPage } from "@shared";

const openAuthWindow = async (
  _event: Electron.IpcMainInvokeEvent,
  page: AuthPage
) => {
  const searchParams = new URLSearchParams({
    lng: i18next.language,
  });

  if ([AuthPage.UpdateEmail, AuthPage.UpdatePassword].includes(page)) {
    try {
      // Token refresh not implemented yet - configure your auth backend
      const accessToken = "";
      searchParams.set("token", accessToken);
    } catch (err) {
      // Handle auth error
    }
  }

  WindowManager.openAuthWindow(page, searchParams);
};

registerEvent("openAuthWindow", openAuthWindow);
