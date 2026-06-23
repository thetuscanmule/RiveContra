'use client';

import { useEffect } from 'react';
import { SETTINGS } from '@/lib/game/settings';

const HOVER_SELECTORS = 'a, button, label, select, summary, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])';

export function CustomCursor() {
  useEffect(() => {
    const { default: def, hover } = SETTINGS.cursor;
    if (!def.src) return;

    const rules: string[] = [
      `*, *::before, *::after { cursor: url('${def.src}') ${def.hotspotX} ${def.hotspotY}, auto !important; }`,
    ];

    if (hover.src) {
      rules.push(`${HOVER_SELECTORS} { cursor: url('${hover.src}') ${hover.hotspotX} ${hover.hotspotY}, pointer !important; }`);
    }

    const el = document.createElement('style');
    el.id = 'custom-cursor';
    el.textContent = rules.join('\n');
    document.head.appendChild(el);
    return () => { document.getElementById('custom-cursor')?.remove(); };
  }, []);
  return null;
}
