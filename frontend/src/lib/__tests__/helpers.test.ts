import { describe, expect, it } from 'vitest';
import { recognizerLabel } from '../recognizer';
import { urlToBlob } from '../samples';

describe('recognizerLabel', () => {
  it('names each recognizer in plain words', () => {
    expect(recognizerLabel('claude:claude-opus-5-5')).toBe('Claude vision');
    expect(recognizerLabel('openai:gpt-4o')).toBe('GPT-4o vision');
    expect(recognizerLabel('mock (fallback)')).toMatch(/AI unavailable/);
    expect(recognizerLabel('mock')).toMatch(/not AI/);
  });
});

describe('urlToBlob', () => {
  it('decodes base64 data URLs without a network request', async () => {
    const blob = await urlToBlob('data:image/png;base64,' + btoa('hello'));
    expect(blob.type).toBe('image/png');
    expect(await blob.text()).toBe('hello');
  });
});
