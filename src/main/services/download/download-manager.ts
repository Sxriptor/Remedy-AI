import type { Download } from "@types";
import { logger } from "../logger";

export class DownloadManager {
  private static downloadingGameId: string | null = null;

  public static async startRPC(
    _download?: Download,
    _downloadsToSeed?: Download[]
  ) {
    // Python RPC removed - downloads now handled differently
    // TODO: Implement direct download management without Python
    logger.warn("startRPC not implemented - Python RPC removed");
  }


  public static async watchDownloads() {
    // Python RPC removed - download watching disabled
    // TODO: Implement simple HTTP download progress tracking if needed
    return;
  }

  public static async getSeedStatus() {
    // Python RPC removed - seeding status unavailable
    return;
  }

  static async pauseDownload(_downloadKey = this.downloadingGameId) {
    // Python RPC removed - pause functionality unavailable
    logger.warn("pauseDownload not implemented - Python RPC removed");
  }

  static async resumeDownload(download: Download) {
    return this.startDownload(download);
  }

  static async cancelDownload(_downloadKey = this.downloadingGameId) {
    // Python RPC removed - cancel functionality unavailable
    logger.warn("cancelDownload not implemented - Python RPC removed");
  }

  // Python RPC and complex download payload removed
  // TODO: For simple HTTP downloads, use Node.js https/axios with streams:
  // Example: axios.get(url, { responseType: 'stream' }).then(response => response.data.pipe(fs.createWriteStream(path)))

  static async startDownload(_download: Download) {
    // Python RPC removed - start download functionality unavailable
    logger.warn("startDownload not implemented - Python RPC removed");
  }
}
