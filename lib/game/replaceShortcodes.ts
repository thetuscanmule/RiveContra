const FALLBACK = 'adventurer';

export function replaceShortcodes(text: string, playerName: string): string {
  const name = playerName.trim() || FALLBACK;
  return text.replace(/\[player\]/gi, name);
}
