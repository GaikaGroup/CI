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
  it('respects headings and overlap', () => {
    const p1 = Array.from({ length: 10 }, (_, i) => `a${i}`).join(' ');
    const p2 = Array.from({ length: 10 }, (_, i) => `b${i}`).join(' ');
    const md = `# H1\n${p1}\n\n${p2}`;
    const chunks = chunkMarkdown(md, 15, 5);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].heading).toBe('H1');
    expect(chunks[1].text.startsWith(p1)).toBe(true);
    expect(chunks[1].text).toContain(p2);
  });
});
