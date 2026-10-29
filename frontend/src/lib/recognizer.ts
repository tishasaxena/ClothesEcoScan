/** Human-readable name for the recognizer that produced a scan. */
export function recognizerLabel(name: string): string {
  if (name.startsWith('claude')) return 'Claude vision';
  if (name.startsWith('gemini')) return 'Gemini vision';
  if (name.startsWith('openai')) return 'GPT-4o vision';
  if (name === 'mock (fallback)') return 'a rough guess (AI unavailable)';
  return 'sample matching (not AI)';
}
