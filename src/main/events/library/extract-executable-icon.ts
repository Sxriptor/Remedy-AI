import { registerEvent } from "../register-event";
import { exec } from "child_process";
import path from "node:path";
import fs from "node:fs";
import { app } from "electron";
import { promisify } from "util";

const execAsync = promisify(exec);

const extractWindowsIcon = async (executablePath: string): Promise<string | null> => {
  try {
    // Use a PowerShell script to extract the icon
    const iconsDir = path.join(app.getPath("userData"), "extracted-icons");
    await fs.promises.mkdir(iconsDir, { recursive: true });

    const iconFileName = `${path.basename(executablePath, ".exe")}_${Date.now()}.ico`;
    const iconPath = path.join(iconsDir, iconFileName);

    // Using PowerShell to extract icon (Windows only)
    const psScript = `
      Add-Type -AssemblyName System.Drawing
      $icon = [System.Drawing.Icon]::ExtractAssociatedIcon('${executablePath.replace(/'/g, "''")}')
      if ($icon) {
        $stream = [System.IO.File]::Create('${iconPath.replace(/'/g, "''")}')
        $icon.Save($stream)
        $stream.Close()
        Write-Output 'success'
      }
    `;

    await execAsync(`powershell -Command "${psScript.replace(/"/g, '\\"')}"`);

    if (fs.existsSync(iconPath)) {
      // Convert to data URL
      const iconData = await fs.promises.readFile(iconPath);
      const base64 = iconData.toString("base64");
      
      // Clean up the temporary file
      await fs.promises.unlink(iconPath).catch(() => {});
      
      return `data:image/x-icon;base64,${base64}`;
    }

    return null;
  } catch (error) {
    console.error("Error extracting icon:", error);
    return null;
  }
};

const extractLinuxIcon = async (executablePath: string): Promise<string | null> => {
  try {
    // For Linux, we can try to find associated .desktop files
    const fileName = path.basename(executablePath);
    const desktopFilePaths = [
      `/usr/share/applications/${fileName}.desktop`,
      `${process.env.HOME}/.local/share/applications/${fileName}.desktop`,
    ];

    for (const desktopPath of desktopFilePaths) {
      if (fs.existsSync(desktopPath)) {
        const content = await fs.promises.readFile(desktopPath, "utf-8");
        const iconMatch = content.match(/Icon=(.*)/);
        
        if (iconMatch && iconMatch[1]) {
          const iconPath = iconMatch[1];
          
          // If it's an absolute path and exists
          if (path.isAbsolute(iconPath) && fs.existsSync(iconPath)) {
            const iconData = await fs.promises.readFile(iconPath);
            const ext = path.extname(iconPath).slice(1);
            const base64 = iconData.toString("base64");
            return `data:image/${ext};base64,${base64}`;
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error extracting Linux icon:", error);
    return null;
  }
};

const extractExecutableIcon = async (
  _event: Electron.IpcMainInvokeEvent,
  executablePath: string
): Promise<string | null> => {
  if (!fs.existsSync(executablePath)) {
    return null;
  }

  if (process.platform === "win32") {
    return extractWindowsIcon(executablePath);
  } else if (process.platform === "linux") {
    return extractLinuxIcon(executablePath);
  }

  return null;
};

registerEvent("extractExecutableIcon", extractExecutableIcon);

