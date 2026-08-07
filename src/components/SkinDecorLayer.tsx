import React, { useState } from 'react';
import { useSettingsContext } from '../store/SettingsContext';

/**
 * 皮肤装饰层（非简版皮肤时渲染）：
 * 从 public/skins/<skin>/ 目录加载装饰素材图（由外部生图模型产出）：
 * - top-banner.png  顶部横幅装饰（横条，全宽显示）
 * - corner-tl.png   左上角贴纸
 * - corner-br.png   右下角贴纸
 * 图片不存在时自动隐藏，不影响布局。全部 pointer-events-none，不干扰交互。
 */
export function SkinDecorLayer() {
  const { settings } = useSettingsContext();
  const skin = settings.skin;
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});

  if (skin === 'default') return null;
  const base = `/skins/${skin}`;

  const img = (key: string, extra: string) => (
    <img
      key={key}
      src={`${base}/${key}.png`}
      alt=""
      draggable={false}
      onLoad={() => setLoaded((s) => ({ ...s, [key]: true }))}
      onError={() => setLoaded((s) => ({ ...s, [key]: false }))}
      className={`absolute ${extra} ${loaded[key] === false ? 'hidden' : ''}`}
    />
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-30 select-none overflow-hidden" aria-hidden>
      {/* 横幅避开侧边栏（折叠时 w-14），完整显示整条植物带，半透明不遮挡主要内容 */}
      {img('top-banner', `top-0 ${settings.sidebarCollapsed ? 'left-14' : 'left-56'} right-0 opacity-50`)}
      {img('corner-tl', 'left-4 top-16 w-28')}
      {img('corner-br', 'right-4 bottom-10 w-28')}
    </div>
  );
}
