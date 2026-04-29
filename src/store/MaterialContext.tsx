import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { MaterialItem, Category } from '../types';
import { DEFAULT_CATEGORIES } from '../types';
import {
  loadMaterials,
  saveMaterials,
  loadCategories,
  addCategory as addCategoryToStorage,
  deleteCategory as deleteCategoryFromStorage,
  saveCategories,
} from '../services/storage';

// State shape
interface MaterialState {
  materials: MaterialItem[];
  categories: Category[];
  loading: boolean;
}

// Actions
type MaterialAction =
  | { type: 'SET_MATERIALS'; payload: MaterialItem[] }
  | { type: 'ADD_MATERIAL'; payload: MaterialItem }
  | { type: 'UPDATE_MATERIAL'; payload: MaterialItem }
  | { type: 'DELETE_MATERIAL'; payload: string }
  | { type: 'SET_CATEGORIES'; payload: Category[] }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'DELETE_CATEGORY'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: MaterialState = {
  materials: [],
  categories: [],
  loading: true,
};

function materialReducer(state: MaterialState, action: MaterialAction): MaterialState {
  switch (action.type) {
    case 'SET_MATERIALS':
      return { ...state, materials: action.payload, loading: false };
    case 'ADD_MATERIAL':
      return { ...state, materials: [action.payload, ...state.materials] };
    case 'UPDATE_MATERIAL': {
      const updated = state.materials.map((m) => (m.id === action.payload.id ? action.payload : m));
      return { ...state, materials: updated };
    }
    case 'DELETE_MATERIAL':
      return { ...state, materials: state.materials.filter((m) => m.id !== action.payload) };
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload, loading: false };
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] };
    case 'DELETE_CATEGORY':
      return { ...state, categories: state.categories.filter((c) => c.id !== action.payload) };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

// Payload for batch import (without id; date optional)
export interface MaterialDraft {
  content: string;
  category: string;
  source: string;
  note?: string;
  date?: string;
}

export interface BatchImportResult {
  added: number;
  skipped: number;
}

// Context value
interface MaterialContextValue {
  state: MaterialState;
  addMaterial: (content: string, category: string, source: string, note?: string, date?: string) => Promise<void>;
  addMaterialsBatch: (drafts: MaterialDraft[], dedup?: boolean) => Promise<BatchImportResult>;
  updateMaterial: (item: MaterialItem) => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  deleteCategoryAndMigrateMaterials: (id: string) => Promise<void>;
  getMaterialsByCategory: (category: string) => MaterialItem[];
  getMaterialCountByCategory: (category: string) => number;
  refreshMaterials: () => Promise<void>;
}

const MaterialContext = createContext<MaterialContextValue | null>(null);

export function MaterialProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(materialReducer, initialState);

  // Load data on mount
  useEffect(() => {
    async function init() {
      try {
        console.log('[MaterialContext] Starting init...');
        const materials = await loadMaterials();
        console.log('[MaterialContext] Loaded materials:', materials.length);

        // Always ensure default categories exist
        let categories = await loadCategories();
        console.log('[MaterialContext] Loaded categories:', categories.length, categories);

        // Force reset if empty or mismatched
        const categoryNames = categories.map(c => c.name);
        const expectedNames = DEFAULT_CATEGORIES.map(c => c.name);
        const needsReset = categories.length === 0 || !expectedNames.every(n => categoryNames.includes(n));

        if (needsReset) {
          console.log('[MaterialContext] Resetting categories, missing:', expectedNames.filter(n => !categoryNames.includes(n)));
          // Merge: keep user-added categories, ensure all defaults exist
          const userCategories = categories.filter(c => !c.isDefault);
          const merged = [...DEFAULT_CATEGORIES, ...userCategories];
          await saveCategories(merged);
          categories = merged;
        }

        dispatch({ type: 'SET_CATEGORIES', payload: categories });
        dispatch({ type: 'SET_MATERIALS', payload: materials });
        console.log('[MaterialContext] Init complete');
      } catch (err) {
        console.error('[MaterialContext] Init failed:', err);
        // Fallback: use default categories
        dispatch({ type: 'SET_CATEGORIES', payload: DEFAULT_CATEGORIES });
        dispatch({ type: 'SET_MATERIALS', payload: [] });
      }
    }
    init();
  }, []);

  const addMaterial = async (content: string, category: string, source: string, note = '', date?: string) => {
    try {
      const item: MaterialItem = {
        id: uuidv4(),
        content,
        category,
        source,
        date: date || new Date().toISOString().split('T')[0],
        note,
      };
      console.log('[MaterialContext] Adding material:', item.id, category);
      await saveMaterials([item, ...state.materials]);
      dispatch({ type: 'ADD_MATERIAL', payload: item });
      console.log('[MaterialContext] Material added successfully');
    } catch (err) {
      console.error('[MaterialContext] addMaterial failed:', err);
      throw err;
    }
  };

  // Batch import with optional dedup by (source + content) signature
  const addMaterialsBatch = async (
    drafts: MaterialDraft[],
    dedup = true
  ): Promise<BatchImportResult> => {
    if (!drafts.length) return { added: 0, skipped: 0 };

    const today = new Date().toISOString().split('T')[0];
    const existing = state.materials;

    // Build dedup signature set from existing materials
    const sigOf = (source: string, content: string) =>
      `${source}::${content.trim()}`;
    const existingSig = new Set(existing.map((m) => sigOf(m.source, m.content)));

    const newItems: MaterialItem[] = [];
    let skipped = 0;
    const batchSig = new Set<string>();

    for (const d of drafts) {
      const sig = sigOf(d.source, d.content);
      if (dedup && (existingSig.has(sig) || batchSig.has(sig))) {
        skipped++;
        continue;
      }
      batchSig.add(sig);
      newItems.push({
        id: uuidv4(),
        content: d.content,
        category: d.category,
        source: d.source,
        date: d.date || today,
        note: d.note || '',
      });
    }

    if (!newItems.length) return { added: 0, skipped };

    const merged = [...newItems, ...existing];
    await saveMaterials(merged);
    dispatch({ type: 'SET_MATERIALS', payload: merged });
    return { added: newItems.length, skipped };
  };

  const updateMaterial = async (item: MaterialItem) => {
    const updated = state.materials.map((m) => (m.id === item.id ? item : m));
    await saveMaterials(updated);
    dispatch({ type: 'UPDATE_MATERIAL', payload: item });
  };

  const deleteMaterial = async (id: string) => {
    const filtered = state.materials.filter((m) => m.id !== id);
    await saveMaterials(filtered);
    dispatch({ type: 'DELETE_MATERIAL', payload: id });
  };

  const addCategory = async (name: string) => {
    const category: Category = {
      id: uuidv4(),
      name,
      isDefault: false,
      createdAt: new Date().toISOString().split('T')[0],
    };
    await addCategoryToStorage(category);
    dispatch({ type: 'ADD_CATEGORY', payload: category });
  };

  const deleteCategory = async (id: string) => {
    const remaining = state.categories.filter((c) => c.id !== id);
    await saveCategories(remaining);
    dispatch({ type: 'DELETE_CATEGORY', payload: id });
  };

  const deleteCategoryAndMigrateMaterials = async (id: string) => {
    const category = state.categories.find((c) => c.id === id);
    if (!category) return;

    // 将该分类下素材移至"未分类"
    const updatedMaterials = state.materials.map((m) =>
      m.category === category.name ? { ...m, category: '未分类' } : m
    );
    await saveMaterials(updatedMaterials);

    // 删除分类
    const remaining = state.categories.filter((c) => c.id !== id);
    await saveCategories(remaining);

    // 统一 dispatch
    dispatch({ type: 'SET_MATERIALS', payload: updatedMaterials });
    dispatch({ type: 'DELETE_CATEGORY', payload: id });
  };

  const getMaterialsByCategory = (category: string): MaterialItem[] => {
    return state.materials.filter((m) => m.category === category);
  };

  const getMaterialCountByCategory = (category: string): number => {
    return state.materials.filter((m) => m.category === category).length;
  };

  const refreshMaterials = async () => {
    const materials = await loadMaterials();
    dispatch({ type: 'SET_MATERIALS', payload: materials });
  };

  return (
    <MaterialContext.Provider
      value={{
        state,
        addMaterial,
        addMaterialsBatch,
        updateMaterial,
        deleteMaterial,
        addCategory,
        deleteCategory,
        deleteCategoryAndMigrateMaterials,
        getMaterialsByCategory,
        getMaterialCountByCategory,
        refreshMaterials,
      }}
    >
      {children}
    </MaterialContext.Provider>
  );
}

export function useMaterialContext() {
  const ctx = useContext(MaterialContext);
  if (!ctx) throw new Error('useMaterialContext must be used within MaterialProvider');
  return ctx;
}
