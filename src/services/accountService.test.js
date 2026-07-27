import { describe, it, expect, beforeEach, vi } from 'vitest';

// In-memory backing store shared with the mock.
let store = {};
vi.mock('../database/local-store.js', () => ({
  readCollection: vi.fn(async (name) => structuredClone(store[name] || [])),
  writeCollection: vi.fn(async (name, rows) => {
    store[name] = structuredClone(rows);
  }),
}));

import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from './accountService.js';

beforeEach(() => {
  store = {};
});

describe('accountService', () => {
  it('createAccount assigns a uuid _id, no keyId, and returns {success,data}', async () => {
    const res = await createAccount({ username: 'foo', password: 'p', server: '3', accountType: '1' });
    expect(res.success).toBe(true);
    expect(res.data._id).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.data).not.toHaveProperty('keyId');
    expect(res.data.server).toBe(3);
    expect(res.data.accountType).toBe(1);
    expect(store.accounts).toHaveLength(1);
  });

  it('createAccount defaults falsy accountType to clone (2)', async () => {
    const res = await createAccount({ username: 'c', password: 'p', server: '1', accountType: '0' });
    expect(res.data.accountType).toBe(2);
  });

  it('getAccounts sorts by type, then server, then natural username order', async () => {
    await createAccount({ username: 'b2', password: 'p', server: '2', accountType: '1' });
    await createAccount({ username: 'a10', password: 'p', server: '1', accountType: '1' });
    await createAccount({ username: 'a2', password: 'p', server: '1', accountType: '1' });
    await createAccount({ username: 'z', password: 'p', server: '1', accountType: '2' });

    const res = await getAccounts();
    expect(res.success).toBe(true);
    expect(res.data.map((a) => a.username)).toEqual(['a2', 'a10', 'b2', 'z']);
  });

  it('updateAccount mutates matching record and coerces server', async () => {
    const { data } = await createAccount({ username: 'u', password: 'p', server: '1', accountType: '1' });
    const res = await updateAccount(data._id, { note: 'hello', server: '9' });
    expect(res.success).toBe(true);
    expect(res.data.note).toBe('hello');
    expect(res.data.server).toBe(9);
    expect(res.data.username).toBe('u');
  });

  it('updateAccount returns error for unknown id', async () => {
    const res = await updateAccount('nope', { note: 'x' });
    expect(res).toEqual({ success: false, error: 'Account không tồn tại.' });
  });

  it('deleteAccount removes the record; unknown id errors', async () => {
    const { data } = await createAccount({ username: 'u', password: 'p', server: '1', accountType: '1' });
    expect(await deleteAccount(data._id)).toEqual({ success: true });
    expect(store.accounts).toHaveLength(0);
    expect((await deleteAccount(data._id)).success).toBe(false);
  });
});
