// Material item stored in the library
export interface MaterialItem {
  id: string;
  content: string;
  category: string;
  source: string;
  date: string;
  note: string;
}

// Category for organizing materials
export interface Category {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

// Application settings
export interface AppSettings {
  fontFamily: string;
  fontSize: number;
  lastOpenedFile: string | null;
  theme: 'light' | 'dark' | 'system';
}

// Default categories
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: '经典导语', isDefault: true, createdAt: '2026-04-02' },
  { id: 'cat-2', name: '噱头', isDefault: true, createdAt: '2026-04-02' },
  { id: 'cat-3', name: '情节', isDefault: true, createdAt: '2026-04-02' },
  { id: 'cat-4', name: '情绪描写', isDefault: true, createdAt: '2026-04-02' },
  { id: 'cat-5', name: '人设塑造', isDefault: true, createdAt: '2026-04-02' },
  { id: 'cat-6', name: '付费点设计', isDefault: true, createdAt: '2026-04-02' },
];

// Default settings
export const DEFAULT_SETTINGS: AppSettings = {
  fontFamily: 'PingFang SC',
  fontSize: 18,
  lastOpenedFile: null,
  theme: 'system',
};

// Available fonts for macOS
export const AVAILABLE_FONTS = [
  'PingFang SC',
  'Songti SC',
  'Kaiti SC',
  'Heiti SC',
  'STSong',
  'STKaiti',
  'STHeiti',
  'Microsoft YaHei',
  'SimSun',
  'KaiTi',
];

// Font size options
export const FONT_SIZES = [12, 14, 16, 18, 20, 22, 24, 28, 32];
