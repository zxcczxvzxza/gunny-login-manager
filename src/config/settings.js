import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';

/**
 * Runtime settings — a single JSON object under userData/settings.json.
 * Values that were previously hardcoded (game path, window arrange, captcha key…)
 * live here so they are editable via the Config UI without rebuilding.
 *
 * config.js still holds build-time defaults/URLs; settings.js is the runtime override.
 */

export const DEFAULT_SETTINGS = {
  gunnyBrowserPath: 'C:/Program Files (x86)/gunnyclient/GunnyBrowser.exe',
  resourceManifestUrl: 'http://config.gnddt.com/ResourceInfo.xml',
  resourceBaseUrl: 'http://res.gnddt.com/',
  defaultServerId: '',
  defaultPrefix: 'GNLM',
  defaultMaxLength: 14,
  windowArrange: { cols: 2, startX: 30, startY: 30, gapX: 15, gapY: 15 },
  captcha: { retryDelayMs: 1200, minLength: 4 },
  apiNinjaKey: '',
  regPrefix: 'GNLM',
  regCheckEnable: true,
};

let cache = null;

function settingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

// One-level deep merge: nested plain objects (windowArrange, captcha) merge field-by-field,
// everything else is a straight override. Keeps defaults for any missing field.
function mergeDefaults(stored) {
  const out = { ...DEFAULT_SETTINGS };
  for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
    const val = stored?.[key];
    if (val === undefined) continue;
    if (def && typeof def === 'object' && !Array.isArray(def)) {
      out[key] = { ...def, ...val };
    } else {
      out[key] = val;
    }
  }
  return out;
}

function readStored() {
  try {
    return JSON.parse(fs.readFileSync(settingsPath(), 'utf8'));
  } catch {
    return {};
  }
}

/** Load from disk (merged over defaults) and refresh the cache. */
export function loadSettings() {
  cache = mergeDefaults(readStored());
  return cache;
}

/** Cached settings; loads on first access. */
export function getSettings() {
  return cache || loadSettings();
}

/**
 * Merge a partial patch into current settings and persist atomically.
 * Untouched fields are preserved. Returns the merged object.
 */
export async function saveSettings(partial) {
  const merged = mergeDefaults({ ...getSettings(), ...partial });
  const file = settingsPath();
  await fsp.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(merged, null, 2), 'utf8');
  await fsp.rename(tmp, file);
  cache = merged;
  return merged;
}
