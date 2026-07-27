import crypto from 'node:crypto';
import { readCollection, writeCollection } from '../database/local-store.js';

const COLLECTION = 'accounts';

/**
 * Get all accounts, sorted by type -> server -> username (natural order).
 */
export async function getAccounts() {
  try {
    const accounts = await readCollection(COLLECTION);

    accounts.sort((a, b) => {
      if (a.accountType !== b.accountType) {
        return a.accountType - b.accountType;
      }
      if (a.server !== b.server) {
        return a.server - b.server;
      }
      return a.username.localeCompare(b.username, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    });

    return { success: true, data: accounts };
  } catch (error) {
    console.error('[AccountService] getAccounts error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Create a new account.
 * accountType = 1: acc chính, 2: acc clone (0/empty defaults to clone).
 */
export async function createAccount(data) {
  try {
    const doc = {
      _id: crypto.randomUUID(),
      username: data.username,
      password: data.password,
      server: parseInt(data.server, 10),
      accountType: parseInt(data.accountType, 10) || 2,
      note: data.note || '',
    };

    const accounts = await readCollection(COLLECTION);
    accounts.push(doc);
    await writeCollection(COLLECTION, accounts);

    return { success: true, data: doc };
  } catch (error) {
    console.error('[AccountService] createAccount error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Update an existing account by _id.
 */
export async function updateAccount(id, data) {
  try {
    const accounts = await readCollection(COLLECTION);
    const idx = accounts.findIndex((a) => a._id === id);
    if (idx === -1) {
      return { success: false, error: 'Account không tồn tại.' };
    }

    const updateFields = {};
    if (data.username !== undefined) updateFields.username = data.username;
    if (data.password !== undefined) updateFields.password = data.password;
    if (data.server !== undefined) updateFields.server = parseInt(data.server, 10);
    if (data.accountType !== undefined) updateFields.accountType = parseInt(data.accountType, 10);
    if (data.note !== undefined) updateFields.note = data.note;

    Object.assign(accounts[idx], updateFields);
    await writeCollection(COLLECTION, accounts);

    return { success: true, data: accounts[idx] };
  } catch (error) {
    console.error('[AccountService] updateAccount error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Delete an account by _id.
 */
export async function deleteAccount(id) {
  try {
    const accounts = await readCollection(COLLECTION);
    const next = accounts.filter((a) => a._id !== id);
    if (next.length === accounts.length) {
      return { success: false, error: 'Account không tồn tại.' };
    }

    await writeCollection(COLLECTION, next);
    return { success: true };
  } catch (error) {
    console.error('[AccountService] deleteAccount error:', error.message);
    return { success: false, error: error.message };
  }
}
