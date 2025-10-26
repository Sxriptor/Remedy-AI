import { registerEvent } from "../register-event";

/**
 * Hydra Debrid service has been removed.
 * This function now returns an empty availability object.
 */
const checkDebridAvailability = async (
  _event: Electron.IpcMainInvokeEvent,
  magnets: string[]
) => {
  // Stub: Return empty availability - no magnets are cached
  const availability: Record<string, boolean> = {};
  magnets.forEach((magnet) => {
    availability[magnet] = false;
  });
  return availability;
};

registerEvent("checkDebridAvailability", checkDebridAvailability);
