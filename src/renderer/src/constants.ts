import { Downloader } from "@shared";

export const VERSION_CODENAME = "Supernova";

export const DOWNLOADER_NAME = {
  [Downloader.RealDebrid]: "Real-Debrid",
  [Downloader.Gofile]: "Gofile",
  [Downloader.PixelDrain]: "PixelDrain",
  [Downloader.Qiwi]: "Qiwi",
  [Downloader.Datanodes]: "Datanodes",
  [Downloader.Mediafire]: "Mediafire",
  [Downloader.TorBox]: "TorBox",
};

export const MAX_MINUTES_TO_SHOW_IN_PLAYTIME = 120;

// Theme store URL removed - no longer using Hydra theme store
export const THEME_WEB_STORE_URL = "";
