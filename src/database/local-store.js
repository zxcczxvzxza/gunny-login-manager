import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';

/**
 * Local JSON storage — replaces the former MongoDB layer.
 * One file per collection under the app's userData directory.
 * Single-user, single-process access; writes are atomic (temp + rename).
 */

export function getStorePath(name) {
  return path.join(app.getPath('userData'), `${name}.json`);
}

/**
 * Read a collection. Returns [] when the file is missing or holds non-array JSON.
 */
export async function readCollection(name) {
  try {
    const raw = await fs.readFile(getStorePath(name), 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

/**
 * Overwrite a collection atomically: write to a temp file then rename over the target,
 * so a crash mid-write cannot corrupt the existing file.
 */
export async function writeCollection(name, rows) {
  const file = getStorePath(name);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(rows, null, 2), 'utf8');
  await fs.rename(tmp, file);
}
