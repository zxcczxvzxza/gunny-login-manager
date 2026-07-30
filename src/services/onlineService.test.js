import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the two collaborators at the module boundary.
vi.mock('./apiService.js', () => ({ getLoginToken: vi.fn() }));
vi.mock('./resetMarkService.js', () => ({ getMarkItem: vi.fn() }));

import { getLoginToken } from './apiService.js';
import { getMarkItem } from './resetMarkService.js';
import { checkAccountOnline } from './onlineService.js';

describe('checkAccountOnline', () => {
  const account = { username: 'contho', password: 'secret' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('trả status "online" khi server từ chối với msg "đang online"', async () => {
    getLoginToken.mockResolvedValue({ token: 't', userId: 429868, serverId: 1 });
    getMarkItem.mockResolvedValue({
      result: false,
      msg: 'Nhân vật đang online không thể thực hiện !',
    });

    const res = await checkAccountOnline(account);

    expect(res).toMatchObject({ success: true, status: 'online' });
    expect(getMarkItem).toHaveBeenCalledWith('t', 429868, 1, 1);
  });

  it('trả status "offline" khi GetMarkItem trả về dữ liệu bình thường', async () => {
    getLoginToken.mockResolvedValue({ token: 't', userId: 1, serverId: 1 });
    getMarkItem.mockResolvedValue({ result: true, items: [], pageModel: { totalPage: 1 } });

    const res = await checkAccountOnline(account);

    expect(res.success).toBe(true);
    expect(res.status).toBe('offline');
  });

  it('trả status "unknown" khi login thất bại (không có token)', async () => {
    getLoginToken.mockResolvedValue(null);

    const res = await checkAccountOnline(account);

    expect(res).toMatchObject({ success: false, status: 'unknown' });
    expect(getMarkItem).not.toHaveBeenCalled();
  });

  it('trả status "unknown" khi GetMarkItem ném lỗi', async () => {
    getLoginToken.mockResolvedValue({ token: 't', userId: 1, serverId: 1 });
    getMarkItem.mockRejectedValue(new Error('network down'));

    const res = await checkAccountOnline(account);

    expect(res.success).toBe(false);
    expect(res.status).toBe('unknown');
  });

  it('chuyển tiếp checkStop xuống getLoginToken', async () => {
    const checkStop = vi.fn(() => false);
    getLoginToken.mockResolvedValue({ token: 't', userId: 1, serverId: 1 });
    getMarkItem.mockResolvedValue({ result: true });

    await checkAccountOnline(account, checkStop);

    expect(getLoginToken).toHaveBeenCalledWith('contho', 'secret', checkStop);
  });
});
