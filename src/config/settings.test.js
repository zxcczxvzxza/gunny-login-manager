import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

let tmpDir;
vi.mock('electron', () => ({
  app: { getPath: () => tmpDir },
}));

import {
  DEFAULT_SETTINGS,
  loadSettings,
  getSettings,
  saveSettings,
} from './settings.js';

beforeEach(() => {
  tmpDir = path.join(os.tmpdir(), `gln-settings-${process.pid}-${Math.floor(performance.now())}`);
  fs.mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('settings', () => {
  it('returns defaults when no file exists', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('merges stored values over defaults, keeping missing fields', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'settings.json'),
      JSON.stringify({ gunnyBrowserPath: 'D:/game.exe', apiNinjaKey: 'k' }),
      'utf8'
    );
    const s = loadSettings();
    expect(s.gunnyBrowserPath).toBe('D:/game.exe');
    expect(s.apiNinjaKey).toBe('k');
    expect(s.defaultMaxLength).toBe(DEFAULT_SETTINGS.defaultMaxLength);
  });

  it('deep-merges nested objects (windowArrange) field-by-field', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'settings.json'),
      JSON.stringify({ windowArrange: { cols: 3 } }),
      'utf8'
    );
    const s = loadSettings();
    expect(s.windowArrange.cols).toBe(3);
    expect(s.windowArrange.gapX).toBe(DEFAULT_SETTINGS.windowArrange.gapX);
  });

  it('save then load round-trips and does not clobber untouched fields', async () => {
    loadSettings();
    await saveSettings({ apiNinjaKey: 'secret', defaultMaxLength: 20 });
    const reread = loadSettings();
    expect(reread.apiNinjaKey).toBe('secret');
    expect(reread.defaultMaxLength).toBe(20);
    expect(reread.gunnyBrowserPath).toBe(DEFAULT_SETTINGS.gunnyBrowserPath);
  });

  it('saveSettings returns merged object and updates the cache', async () => {
    loadSettings();
    const merged = await saveSettings({ regPrefix: 'ABCD' });
    expect(merged.regPrefix).toBe('ABCD');
    expect(getSettings().regPrefix).toBe('ABCD');
  });

  it('does not leave a .tmp file after save', async () => {
    loadSettings();
    await saveSettings({ apiNinjaKey: 'x' });
    expect(fs.readdirSync(tmpDir).some((f) => f.endsWith('.tmp'))).toBe(false);
  });
});
