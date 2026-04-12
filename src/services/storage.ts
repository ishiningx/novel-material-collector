import { BaseDirectory, readTextFile, writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs';
import type { MaterialItem, Category, AppSettings, AnalysisRecord, WeeklyReport, EncouragementMessage } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, DEFAULT_ENCOURAGEMENT_MESSAGES } from '../types';

const DATA_DIR = 'novel-material-collector';
const MATERIALS_FILE = 'materials.json';
const CATEGORIES_FILE = 'categories.json';
const SETTINGS_FILE = 'settings.json';
const ANALYSES_FILE = 'analyses.json';
const WEEKLY_REPORTS_FILE = 'weekly-reports.json';
const ENCOURAGEMENT_FILE = 'encouragement-messages.txt';

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

// === Analyses CRUD ===

export async function loadAnalyses(): Promise<AnalysisRecord[]> {
  try {
    await ensureDataDir();
    const content = await readTextFile(`${DATA_DIR}/${ANALYSES_FILE}`, { baseDir: BaseDirectory.AppData });
    return JSON.parse(content);
  } catch {
    return [];
  }
}

export async function saveAnalyses(analyses: AnalysisRecord[]): Promise<void> {
  try {
    await ensureDataDir();
    await writeTextFile(`${DATA_DIR}/${ANALYSES_FILE}`, JSON.stringify(analyses, null, 2), { baseDir: BaseDirectory.AppData });
  } catch (err) {
    console.error('[Storage] saveAnalyses failed:', err);
    throw err;
  }
}

// === Weekly Reports CRUD ===

export async function loadWeeklyReports(): Promise<WeeklyReport[]> {
  try {
    await ensureDataDir();
    const content = await readTextFile(`${DATA_DIR}/${WEEKLY_REPORTS_FILE}`, { baseDir: BaseDirectory.AppData });
    return JSON.parse(content);
  } catch {
    return [];
  }
}

export async function saveWeeklyReports(reports: WeeklyReport[]): Promise<void> {
  try {
    await ensureDataDir();
    await writeTextFile(`${DATA_DIR}/${WEEKLY_REPORTS_FILE}`, JSON.stringify(reports, null, 2), { baseDir: BaseDirectory.AppData });
  } catch (err) {
    console.error('[Storage] saveWeeklyReports failed:', err);
    throw err;
  }
}

// === Encouragement Messages (from txt config file) ===
// Format: each line is "minCount-maxCount:message text"
// Lines starting with # are comments, empty lines are ignored
// Example:
//   0-0:新的一周开始了，哪怕只是一小步也是进步
//   1-2:已经迈出了第一步，继续加油！

export async function loadEncouragementMessages(): Promise<EncouragementMessage[]> {
  try {
    await ensureDataDir();
    const filePath = `${DATA_DIR}/${ENCOURAGEMENT_FILE}`;
    const fileExists = await exists(filePath, { baseDir: BaseDirectory.AppData });

    if (!fileExists) {
      // Create default encouragement messages file
      const defaultContent = generateDefaultEncouragementFile();
      await writeTextFile(filePath, defaultContent, { baseDir: BaseDirectory.AppData });
      return DEFAULT_ENCOURAGEMENT_MESSAGES;
    }

    const content = await readTextFile(filePath, { baseDir: BaseDirectory.AppData });
    return parseEncouragementFile(content);
  } catch {
    return DEFAULT_ENCOURAGEMENT_MESSAGES;
  }
}

function generateDefaultEncouragementFile(): string {
  return `# 鼓励语配置文件
# 格式：最小数量-最大数量:鼓励语内容
# 数量 = 本周拆文数 + 素材数
# 修改后重启应用生效

0-0:新的一周开始了，哪怕只是一小步也是进步
1-2:已经迈出了第一步，继续加油！
3-5:稳步积累中，量变终会带来质变
6-9:越来越有感觉了，你的努力看得见！
10-14:这周很棒！拆文能力在快速提升
15-19:优秀的创作者都是这样一步步来的！
20-29:太厉害了！你的勤奋让人佩服
30-49:这周简直是拆文机器！卡皮巴拉都为你鼓掌
50-99:传说级别的输出！你就是拆文之王
100-99999:已经超越了卡皮巴拉的理解范围...
`;
}

function parseEncouragementFile(content: string): EncouragementMessage[] {
  const lines = content.split('\n');
  const messages: EncouragementMessage[] = [];
  let idCounter = 1;

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Parse format: minCount-maxCount:message
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) {
      // Treat as plain message with default range 0-99999
      messages.push({
        id: `enc-${idCounter++}`,
        minCount: 0,
        maxCount: 99999,
        text: trimmed,
      });
      continue;
    }

    const rangePart = trimmed.substring(0, colonIndex);
    const textPart = trimmed.substring(colonIndex + 1);
    const rangeMatch = rangePart.match(/^(\d+)-(\d+)$/);

    if (rangeMatch) {
      messages.push({
        id: `enc-${idCounter++}`,
        minCount: parseInt(rangeMatch[1]),
        maxCount: parseInt(rangeMatch[2]),
        text: textPart,
      });
    } else {
      // If range format is invalid, treat as plain message
      messages.push({
        id: `enc-${idCounter++}`,
        minCount: 0,
        maxCount: 99999,
        text: trimmed,
      });
    }
  }

  // If no valid messages found, fall back to defaults
  if (messages.length === 0) {
    return DEFAULT_ENCOURAGEMENT_MESSAGES;
  }

  return messages;
}
