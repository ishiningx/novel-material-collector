// Material item stored in the library
export interface MaterialItem {
  id: string;
  content: string;
  category: string;
  source: string;
  date: string;
  note: string;
  // 来源例文 id（从分析编辑器加入时自动带）
  articleId?: string;
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
  { id: 'cat-uncategorized', name: '未分类', isDefault: true, createdAt: '2026-04-24' },
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

// ========== Text Analysis (拆文) Types ==========

// Highlight color preset
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'orange' | 'purple';

// Color mapping for highlights and comments
export const HIGHLIGHT_COLOR_MAP: Record<HighlightColor, { bg: string; text: string; border: string }> = {
  yellow: {
    bg: 'bg-yellow-200/60 dark:bg-yellow-500/20',
    text: 'text-yellow-700 dark:text-yellow-400',
    border: 'border-yellow-400',
  },
  green: {
    bg: 'bg-green-200/60 dark:bg-green-500/20',
    text: 'text-green-700 dark:text-green-400',
    border: 'border-green-400',
  },
  blue: {
    bg: 'bg-blue-200/60 dark:bg-blue-500/20',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-400',
  },
  pink: {
    bg: 'bg-pink-200/60 dark:bg-pink-500/20',
    text: 'text-pink-700 dark:text-pink-400',
    border: 'border-pink-400',
  },
  orange: {
    bg: 'bg-orange-200/60 dark:bg-orange-500/20',
    text: 'text-orange-700 dark:text-orange-400',
    border: 'border-orange-400',
  },
  purple: {
    bg: 'bg-purple-200/60 dark:bg-purple-500/20',
    text: 'text-purple-700 dark:text-purple-400',
    border: 'border-purple-400',
  },
};

// Highlight color circle display colors
export const HIGHLIGHT_COLOR_CIRCLE: Record<HighlightColor, string> = {
  yellow: 'bg-yellow-400',
  green: 'bg-green-400',
  blue: 'bg-blue-400',
  pink: 'bg-pink-400',
  orange: 'bg-orange-400',
  purple: 'bg-purple-400',
};

// Highlight data
export interface Highlight {
  id: string;
  startOffset: number;
  endOffset: number;
  color: HighlightColor;
  isActive: boolean;
}

// Comment data
export interface Comment {
  id: string;
  highlightId: string;
  text: string;
  color: HighlightColor;
}

// Analysis record (拆文记录) - Legacy, 迁移后无新数据写入
export interface AnalysisRecord {
  id: string;
  title: string;
  content: string;
  highlights: Highlight[];
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
}

// ========== Article Types (统一分析 + 例文库) ==========

export type ArticleStatus = 'draft' | 'archived';

// 例文记录：draft = 草稿（未入例文库），archived = 正式例文（已补充元数据）
export interface ArticleRecord {
  id: string;
  title: string;
  content: string;
  highlights: Highlight[];
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
  status: ArticleStatus;
  // 例文元数据（draft 态可全空，archived 态建议至少填分类/平台/核心梗）
  categories?: string[];
  platform?: string;
  author?: string;
  coreGimmick?: string;
  payPoint?: string;
  synopsis?: string;
  highlight?: string;
  isClassic?: boolean;
  archivedAt?: string;
}

// 例文元数据补充入参（archiveArticle 方法使用）
export interface ArticleMetadata {
  categories: string[];
  platform: string;
  author: string;
  coreGimmick: string;
  payPoint: string;
  synopsis: string;
  highlight: string;
  isClassic: boolean;
}

// 例文库筛选期限
export type ArticleDateFilter = 'month' | 'halfYear' | 'all';

// 例文题材分类（与素材分类解耦）：现言 / 古言 / 悬疑 / 爽文 / 虐文 等，支持用户自定义新增
export const DEFAULT_ARTICLE_GENRES: string[] = ['现言', '古言', '悬疑', '爽文', '虐文'];

// 已废弃的题材值，启动时会从 genres 列表及每篇例文的 categories 中清除
export const DEPRECATED_ARTICLE_GENRES: string[] = ['穿越', '重生', '测试'];

// ========== Weekly Report Types ==========

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  analysisCount: number;
  materialCount: number;
  message: string;
  generatedAt: string;
}

export interface EncouragementMessage {
  id: string;
  minCount: number;
  maxCount: number;
  text: string;
}

export const DEFAULT_ENCOURAGEMENT_MESSAGES: EncouragementMessage[] = [
  { id: 'enc-1', minCount: 0, maxCount: 0, text: '新的一周开始了，哪怕只是一小步也是进步 🌱' },
  { id: 'enc-2', minCount: 1, maxCount: 2, text: '已经迈出了第一步，继续加油！' },
  { id: 'enc-3', minCount: 3, maxCount: 5, text: '稳步积累中，量变终会带来质变 ✨' },
  { id: 'enc-4', minCount: 6, maxCount: 9, text: '越来越有感觉了，你的努力看得见！' },
  { id: 'enc-5', minCount: 10, maxCount: 14, text: '这周很棒！拆文能力在快速提升 📈' },
  { id: 'enc-6', minCount: 15, maxCount: 19, text: '优秀的创作者都是这样一步步来的！' },
  { id: 'enc-7', minCount: 20, maxCount: 29, text: '太厉害了！你的勤奋让人佩服 🔥' },
  { id: 'enc-8', minCount: 30, maxCount: 49, text: '这周简直是拆文机器！卡皮巴拉都为你鼓掌 🎉' },
  { id: 'enc-9', minCount: 50, maxCount: 99, text: '传说级别的输出！你就是拆文之王 👑' },
  { id: 'enc-10', minCount: 100, maxCount: 99999, text: '已经超越了卡皮巴拉的理解范围... 🌟' },
];

// ========== Auto Update Types ==========

export type UpdateStatus =
  | 'idle'           // 空闲状态
  | 'checking'       // 检查中
  | 'available'      // 有新版本
  | 'not-available'  // 已是最新
  | 'error';         // 出错

export interface UpdateInfo {
  version: string;
  currentVersion: string;
  date?: string;
  body?: string;
}
