import { BaseDirectory, readTextFile, writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs';
import type { MaterialItem, Category, AppSettings } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from '../types';

const DATA_DIR = 'novel-material-collector';
const MATERIALS_FILE = 'materials.json';
const CATEGORIES_FILE = 'categories.json';
const SETTINGS_FILE = 'settings.json';

// Ensure data directory exists
async function ensureDataDir(): Promise<void> {
  try {
    const dirExists = await exists(DATA_DIR, { baseDir: BaseDirectory.AppData });
    if (!dirExists) {
      await mkdir(DATA_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
    }
  } catch (err) {
    console.error('[Storage] ensureDataDir failed:', err);
    throw err;
  }
}

// === Materials CRUD ===

export async function loadMaterials(): Promise<MaterialItem[]> {
  try {
    await ensureDataDir();
    const content = await readTextFile(`${DATA_DIR}/${MATERIALS_FILE}`, { baseDir: BaseDirectory.AppData });
    return JSON.parse(content);
  } catch {
    return [];
  }
}

export async function saveMaterials(materials: MaterialItem[]): Promise<void> {
  try {
    await ensureDataDir();
    await writeTextFile(`${DATA_DIR}/${MATERIALS_FILE}`, JSON.stringify(materials, null, 2), { baseDir: BaseDirectory.AppData });
  } catch (err) {
    console.error('[Storage] saveMaterials failed:', err);
    throw err;
  }
}

export async function addMaterial(item: MaterialItem): Promise<void> {
  const materials = await loadMaterials();
  materials.unshift(item);
  await saveMaterials(materials);
}

export async function updateMaterial(updated: MaterialItem): Promise<void> {
  const materials = await loadMaterials();
  const index = materials.findIndex((m) => m.id === updated.id);
  if (index !== -1) {
    materials[index] = updated;
    await saveMaterials(materials);
  }
}

export async function deleteMaterial(id: string): Promise<void> {
  const materials = await loadMaterials();
  const filtered = materials.filter((m) => m.id !== id);
  await saveMaterials(filtered);
}

// === Categories CRUD ===

export async function loadCategories(): Promise<Category[]> {
  try {
    await ensureDataDir();
    const content = await readTextFile(`${DATA_DIR}/${CATEGORIES_FILE}`, { baseDir: BaseDirectory.AppData });
    return JSON.parse(content);
  } catch {
    // Initialize with defaults on first run
    await saveCategories(DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES;
  }
}

export async function saveCategories(categories: Category[]): Promise<void> {
  try {
    await ensureDataDir();
    await writeTextFile(`${DATA_DIR}/${CATEGORIES_FILE}`, JSON.stringify(categories, null, 2), { baseDir: BaseDirectory.AppData });
  } catch (err) {
    console.error('[Storage] saveCategories failed:', err);
    throw err;
  }
}

export async function addCategory(category: Category): Promise<void> {
  const categories = await loadCategories();
  categories.push(category);
  await saveCategories(categories);
}

export async function deleteCategory(id: string): Promise<void> {
  const categories = await loadCategories();
  const filtered = categories.filter((c) => c.id !== id);
  await saveCategories(filtered);
}

// === Settings ===

export async function loadSettings(): Promise<AppSettings> {
  try {
    await ensureDataDir();
    const content = await readTextFile(`${DATA_DIR}/${SETTINGS_FILE}`, { baseDir: BaseDirectory.AppData });
    return JSON.parse(content);
  } catch {
    await saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await ensureDataDir();
    await writeTextFile(`${DATA_DIR}/${SETTINGS_FILE}`, JSON.stringify(settings, null, 2), { baseDir: BaseDirectory.AppData });
  } catch (err) {
    console.error('[Storage] saveSettings failed:', err);
    throw err;
  }
}
