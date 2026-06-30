'use client';

import { useEffect } from 'react';
import { SETTINGS } from '@/lib/game/settings';

const HOVER_SELECTORS = 'a, button, label, select, summary, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])';

// Re-renders the cursor image onto a scaled canvas, since CSS `cursor: url()`
// has no scale/transform of its own — the image must already be the right size.
function loadScaledCursor(src: string, scale: number): Promise<string> {
  if (scale === 1) return Promise.resolve(src);
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(src); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

export function CustomCursor() {
  useEffect(() => {
    const { default: def, hover } = SETTINGS.cursor;
    if (!def.src) return;
    let cancelled = false;

    (async () => {
      const [defUrl, hoverUrl] = await Promise.all([
        loadScaledCursor(def.src, def.scale ?? 1),
        hover.src ? loadScaledCursor(hover.src, hover.scale ?? 1) : Promise.resolve(''),
      ]);
      if (cancelled) return;

      const defScale = def.scale ?? 1;
      // Use cursor: inherit on * so children always inherit from their nearest
      // ancestor that sets an explicit cursor — avoids !important cascade wars.
      const rules: string[] = [
        `*, *::before, *::after { cursor: inherit; }`,
        `html { cursor: url('${defUrl}') ${Math.round(def.hotspotX * defScale)} ${Math.round(def.hotspotY * defScale)}, auto; }`,
      ];

      if (hoverUrl) {
        const hoverScale = hover.scale ?? 1;
        rules.push(`${HOVER_SELECTORS} { cursor: url('${hoverUrl}') ${Math.round(hover.hotspotX * hoverScale)} ${Math.round(hover.hotspotY * hoverScale)}, pointer; }`);
      }

      const el = document.createElement('style');
      el.id = 'custom-cursor';
      el.textContent = rules.join('\n');
      document.head.appendChild(el);
    })();

    return () => { cancelled = true; document.getElementById('custom-cursor')?.remove(); };
  }, []);
  return null;
}
