import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'node:path';

vi.mock('node:fs', () => ({ existsSync: vi.fn() }));
vi.mock('node:fs/promises', () => ({ default: { rm: vi.fn(), readdir: vi.fn() } }));

import { existsSync } from 'node:fs';
import fsp from 'node:fs/promises';
import { clearGameCache } from './cacheService.js';

const APPDATA = 'C:/Users/Test/AppData/Roaming';
const LOCALAPPDATA = 'C:/Users/Test/AppData/Local';
const flashDir = path.join(APPDATA, 'Macromedia', 'Flash Player');
const cacheParent = path.join(LOCALAPPDATA, 'cache');

beforeEach(() => {
  vi.clearAllMocks();
  process.env.APPDATA = APPDATA;
  process.env.LOCALAPPDATA = LOCALAPPDATA;
  fsp.rm.mockResolvedValue(undefined);
});

const dir = (name) => ({ name, isDirectory: () => true });

describe('clearGameCache', () => {
  it('xoá Flash Player cache và các thư mục qtshadercache*', async () => {
    existsSync.mockReturnValue(true);
    fsp.readdir.mockResolvedValue([
      dir('qtshadercache-i386-little_endian-ilp32'),
      dir('qtshadercache-x86_64-little_endian-llp64'),
    ]);

    const res = await clearGameCache();

    expect(res.success).toBe(true);
    expect(fsp.rm).toHaveBeenCalledWith(flashDir, { recursive: true, force: true });
    expect(fsp.rm).toHaveBeenCalledWith(
      path.join(cacheParent, 'qtshadercache-i386-little_endian-ilp32'),
      { recursive: true, force: true }
    );
    expect(res.data.cleared).toContain(flashDir);
    expect(res.data.cleared).toHaveLength(3);
  });

  it('bỏ qua đường dẫn không tồn tại (không đưa vào cleared)', async () => {
    existsSync.mockReturnValue(false);
    fsp.readdir.mockResolvedValue([dir('qtshadercache-x86_64-little_endian-llp64')]);

    const res = await clearGameCache();

    expect(res.success).toBe(true);
    expect(fsp.rm).not.toHaveBeenCalled();
    expect(res.data.cleared).toHaveLength(0);
  });

  it('KHÔNG xoá thư mục con không phải qtshadercache', async () => {
    existsSync.mockReturnValue(true);
    fsp.readdir.mockResolvedValue([dir('SomeOtherApp'), dir('qtshadercache-abc')]);

    const res = await clearGameCache();

    expect(fsp.rm).not.toHaveBeenCalledWith(
      path.join(cacheParent, 'SomeOtherApp'),
      expect.anything()
    );
    expect(fsp.rm).toHaveBeenCalledWith(path.join(cacheParent, 'qtshadercache-abc'), {
      recursive: true,
      force: true,
    });
  });

  it('vẫn thành công khi thư mục cache không tồn tại (readdir ném lỗi)', async () => {
    existsSync.mockImplementation((p) => p === flashDir);
    fsp.readdir.mockRejectedValue(new Error('ENOENT'));

    const res = await clearGameCache();

    expect(res.success).toBe(true);
    expect(res.data.cleared).toEqual([flashDir]);
  });
});
