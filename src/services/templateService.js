import crypto from 'node:crypto';
import { readCollection, writeCollection } from '../database/local-store.js';

const COLLECTION = 'templates';

/**
 * Get all templates, sorted by name.
 */
export async function getTemplates() {
  try {
    const templates = await readCollection(COLLECTION);
    templates.sort((a, b) => a.name.localeCompare(b.name));
    return { success: true, data: templates };
  } catch (error) {
    console.error('[TemplateService] getTemplates error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Create a new template. accountIds is an array of account _id strings.
 */
export async function createTemplate(data) {
  try {
    if (!Array.isArray(data.accountIds)) throw new Error('accountIds must be an array');

    const doc = {
      _id: crypto.randomUUID(),
      name: data.name,
      accountIds: [...data.accountIds],
      createdAt: new Date().toISOString(),
    };

    const templates = await readCollection(COLLECTION);
    templates.push(doc);
    await writeCollection(COLLECTION, templates);

    return { success: true, data: doc };
  } catch (error) {
    console.error('[TemplateService] createTemplate error:', error.stack || error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Update a template by _id.
 */
export async function updateTemplate(id, data) {
  try {
    const templates = await readCollection(COLLECTION);
    const idx = templates.findIndex((t) => t._id === id);
    if (idx === -1) {
      return { success: false, error: 'Template không tồn tại.' };
    }

    const updateFields = {};
    if (data.name !== undefined) updateFields.name = data.name;
    if (data.accountIds !== undefined) updateFields.accountIds = [...data.accountIds];

    Object.assign(templates[idx], updateFields);
    await writeCollection(COLLECTION, templates);

    return { success: true, data: templates[idx] };
  } catch (error) {
    console.error('[TemplateService] updateTemplate error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a template by _id.
 */
export async function deleteTemplate(id) {
  try {
    const templates = await readCollection(COLLECTION);
    const next = templates.filter((t) => t._id !== id);
    if (next.length === templates.length) {
      return { success: false, error: 'Template không tồn tại.' };
    }

    await writeCollection(COLLECTION, next);
    return { success: true };
  } catch (error) {
    console.error('[TemplateService] deleteTemplate error:', error.message);
    return { success: false, error: error.message };
  }
}
