import { unwrapPersistedPayload } from "../music/appPatternRouteStaffCore.jsx";

export function buildConfigExportFilename(date = new Date()) {
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}_${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}${String(date.getSeconds()).padStart(2, "0")}`;
  return `mastil_interactivo_config_${stamp}.json`;
}

export function buildImportedPayload(parsed, { uiConfigVersion, appVersion }) {
  const payload = unwrapPersistedPayload(parsed);
  return {
    version: uiConfigVersion,
    appVersion,
    config: payload.config || {},
  };
}

export function parseImportedConfigText(raw, options) {
  return buildImportedPayload(JSON.parse(String(raw || "")), options);
}
