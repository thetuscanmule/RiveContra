'use client';

import { useEffect } from 'react';
import { SETTINGS } from '@/lib/game/settings';

const HOVER_SELECTORS = 'a, button, label, select, summary, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])';

export function CustomCursor() {
  useEffect(() => {
    const { default: def, hover } = SETTINGS.cursor;
    if (!def.src) return;

    // Use cursor: inherit on * so children always inherit from their nearest
    // ancestor that sets an explicit cursor — avoids !important cascade wars.
    const rules: string[] = [
      `*, *::before, *::after { cursor: inherit; }`,
      `html { cursor: url('${def.src}') ${def.hotspotX} ${def.hotspotY}, auto; }`,
    ];

    if (hover.src) {
      rules.push(`${HOVER_SELECTORS} { cursor: url('${hover.src}') ${hover.hotspotX} ${hover.hotspotY}, pointer; }`);
    }

    const el = document.createElement('style');
    el.id = 'custom-cursor';
    el.textContent = rules.join('\n');
    document.head.appendChild(el);
    return () => { document.getElementById('custom-cursor')?.remove(); };
  }, []);
  return null;
}
