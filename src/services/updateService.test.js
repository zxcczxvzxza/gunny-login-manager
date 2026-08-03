import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'node:path';
import { createHash } from 'node:crypto';

vi.mock('axios', () => ({ default: { get: vi.fn() } }));
vi.mock('node:fs/promises', () => ({
  default: { readFile: vi.fn(), writeFile: vi.fn(), mkdir: vi.fn() },
}));
vi.mock('../config/settings.js', () => ({ getSettings: vi.fn() }));

import axios from 'axios';
import fsp from 'node:fs/promises';
import { getSettings } from '../config/settings.js';
import { updateGameResources } from './updateService.js';

const md5 = (s) => createHash('md5').update(Buffer.from(s)).digest('hex');
const dashHash = (s) => md5(s).match(/../g).join('-'); // định dạng manifest "aa-bb-.."

const RES_DIR = path.join('C:/game', 'resource');
const MANIFEST_URL = 'http://config.gnddt.com/ResourceInfo.xml';
const BASE_URL = 'http://res.gnddt.com/';

// item1 khác hash -> cần tải; item2 trùng hash -> bỏ qua.
const manifestXml = `<Result>
  <Item FileName="flash\\1.png" Hash="${dashHash('NEW-1')}" />
  <Item FileName="flash\\2.png" Hash="${dashHash('SAME-2')}" />
</Result>`;

beforeEach(() => {
  vi.clearAllMocks();
  getSettings.mockReturnValue({
    gunnyBrowserPath: 'C:/game/GunnyBrowser.exe',
    resourceManifestUrl: MANIFEST_URL,
    resourceBaseUrl: BASE_URL,
  });
  fsp.mkdir.mockResolvedValue(undefined);
  fsp.writeFile.mockResolvedValue(undefined);
  // local: 1.png nội dung cũ (khác manifest), 2.png trùng manifest.
  fsp.readFile.mockImplementation((p) => {
    if (String(p).endsWith('1.png')) return Promise.resolve(Buffer.from('OLD-1'));
    if (String(p).endsWith('2.png')) return Promise.resolve(Buffer.from('SAME-2'));
    return Promise.reject(new Error('ENOENT'));
  });
  axios.get.mockImplementation((url) => {
    if (url === MANIFEST_URL) return Promise.resolve({ data: manifestXml });
    return Promise.resolve({ data: Buffer.from('downloaded-bytes') });
  });
});

describe('updateGameResources', () => {
  it('chỉ tải file khác hash, bỏ qua file trùng', async () => {
    const res = await updateGameResources();

    expect(res.success).toBe(true);
    expect(res.data.downloaded).toBe(1);
    expect(fsp.writeFile).toHaveBeenCalledTimes(1);
    expect(fsp.writeFile).toHaveBeenCalledWith(
      path.join(RES_DIR, 'flash\\1.png'),
      expect.any(Buffer)
    );
    // tải từ URL đúng (đổi \ -> /)
    expect(axios.get).toHaveBeenCalledWith(BASE_URL + 'flash/1.png', expect.any(Object));
  });

  it('không tải gì khi mọi file đã khớp hash', async () => {
    fsp.readFile.mockImplementation((p) => {
      if (String(p).endsWith('1.png')) return Promise.resolve(Buffer.from('NEW-1'));
      return Promise.resolve(Buffer.from('SAME-2'));
    });

    const res = await updateGameResources();

    expect(res.success).toBe(true);
    expect(res.data.downloaded).toBe(0);
    expect(fsp.writeFile).not.toHaveBeenCalled();
  });

  it('trả success:false khi tải manifest lỗi', async () => {
    axios.get.mockRejectedValueOnce(new Error('network down'));

    const res = await updateGameResources();

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/danh sách/i);
  });

  it('dừng giữa chừng khi checkStop trả true', async () => {
    const res = await updateGameResources(
      () => {},
      () => true
    );

    expect(res.success).toBe(false);
    expect(res.error).toBe('Đã dừng.');
    expect(fsp.writeFile).not.toHaveBeenCalled();
  });

  it('phát onProgress với accCurrent/accTotal khi tải', async () => {
    const onProgress = vi.fn();

    await updateGameResources(onProgress);

    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ accTotal: 1, message: expect.stringContaining('flash/1.png') })
    );
  });
});
