import { registerEvent } from "../register-event";
import { loadScanFilter } from "./scan-installed-apps";

const getScanFilter = async () => {
  return loadScanFilter();
};

registerEvent("getScanFilter", getScanFilter);

