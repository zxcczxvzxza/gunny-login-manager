import { describe, it, expect, beforeEach, vi } from 'vitest';

let store = {};
vi.mock('../database/local-store.js', () => ({
  readCollection: vi.fn(async (name) => structuredClone(store[name] || [])),
  writeCollection: vi.fn(async (name, rows) => {
    store[name] = structuredClone(rows);
  }),
}));

import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from './templateService.js';

beforeEach(() => {
  store = {};
});

describe('templateService', () => {
  it('createTemplate assigns uuid _id, keeps accountIds, no keyId', async () => {
    const res = await createTemplate({ name: 't1', accountIds: ['a', 'b'] });
    expect(res.success).toBe(true);
    expect(res.data._id).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.data).not.toHaveProperty('keyId');
    expect(res.data.accountIds).toEqual(['a', 'b']);
    expect(typeof res.data.createdAt).toBe('string');
  });

  it('createTemplate rejects a non-array accountIds', async () => {
    const res = await createTemplate({ name: 'bad', accountIds: 'x' });
    expect(res.success).toBe(false);
  });

  it('getTemplates returns sorted-by-name list', async () => {
    await createTemplate({ name: 'zed', accountIds: [] });
    await createTemplate({ name: 'alpha', accountIds: [] });
    const res = await getTemplates();
    expect(res.data.map((t) => t.name)).toEqual(['alpha', 'zed']);
  });

  it('updateTemplate changes name/accountIds; unknown id errors', async () => {
    const { data } = await createTemplate({ name: 't', accountIds: ['a'] });
    const ok = await updateTemplate(data._id, { name: 'renamed', accountIds: ['x', 'y'] });
    expect(ok.data.name).toBe('renamed');
    expect(ok.data.accountIds).toEqual(['x', 'y']);
    expect((await updateTemplate('nope', { name: 'z' })).success).toBe(false);
  });

  it('deleteTemplate removes the record; unknown id errors', async () => {
    const { data } = await createTemplate({ name: 't', accountIds: [] });
    expect(await deleteTemplate(data._id)).toEqual({ success: true });
    expect((await deleteTemplate(data._id)).success).toBe(false);
  });
});
