import { describe, it, expect } from 'vitest';
import { chunkByHeading, chunkMarkdown } from '$lib/modules/rag/chunk';

describe('chunkByHeading', () => {
  it('splits text by markdown headings', () => {
    const md = '# Title\nIntro text\n## Section 1\nContent one\n## Section 2\nContent two';
    const chunks = chunkByHeading(md);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toEqual({ heading: 'Title', text: 'Intro text' });
    expect(chunks[1]).toEqual({ heading: 'Section 1', text: 'Content one' });
  });
});

describe('chunkMarkdown', () => {
  it('preserves headings in all chunks', () => {
    const p1 = Array.from({ length: 150 }, () => 'a').join(' ');
    const p2 = Array.from({ length: 150 }, () => 'b').join(' ');
    const md = `# H1\n${p1}\n\n${p2}`;
    const chunks = chunkMarkdown(md, 200, 50);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.heading === 'H1')).toBe(true);
  });

  it('maintains 50 token overlap', () => {
    const p1 = Array.from({ length: 150 }, () => 'a').join(' ');
    const p2 = Array.from({ length: 150 }, () => 'b').join(' ');
    const md = `# H1\n${p1}\n\n${p2}`;
    const chunks = chunkMarkdown(md, 200, 50);
    const firstWords = chunks[0].text.trim().split(/\s+/);
    const secondWords = chunks[1].text.trim().split(/\s+/);
    expect(firstWords.slice(-50)).toEqual(secondWords.slice(0, 50));
  });
});
