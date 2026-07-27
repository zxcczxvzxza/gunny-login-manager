import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

// Mock electron's app.getPath('userData') to point at a throwaway temp dir.
let tmpDir;
vi.mock('electron', () => ({
  app: {
    getPath: () => tmpDir,
  },
}));

import { getStorePath, readCollection, writeCollection } from './local-store.js';

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `gln-store-test-${process.pid}-${Math.floor(performance.now())}`);
  await fs.mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('local-store', () => {
  it('getStorePath resolves under userData with a .json extension', () => {
    expect(getStorePath('accounts')).toBe(path.join(tmpDir, 'accounts.json'));
  });

  it('reads an empty array when the file does not exist', async () => {
    expect(await readCollection('accounts')).toEqual([]);
  });

  it('round-trips written data', async () => {
    const rows = [{ _id: 'a1', username: 'foo' }];
    await writeCollection('accounts', rows);
    expect(await readCollection('accounts')).toEqual(rows);
  });

  it('overwrites atomically without leaving a temp file', async () => {
    await writeCollection('accounts', [{ _id: '1' }]);
    await writeCollection('accounts', [{ _id: '2' }]);
    expect(await readCollection('accounts')).toEqual([{ _id: '2' }]);

    const entries = await fs.readdir(tmpDir);
    expect(entries.some((e) => e.endsWith('.tmp'))).toBe(false);
  });

  it('returns [] when the stored JSON is not an array', async () => {
    await fs.writeFile(getStorePath('accounts'), JSON.stringify({ not: 'an array' }), 'utf8');
    expect(await readCollection('accounts')).toEqual([]);
  });
});
