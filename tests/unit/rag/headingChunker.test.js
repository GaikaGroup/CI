import { describe, it, expect } from 'vitest';
import { chunkByHeading } from '$lib/modules/rag/chunk';

describe('chunkByHeading', () => {
  it('splits text by markdown headings', () => {
    const md = '# Title\nIntro text\n## Section 1\nContent one\n## Section 2\nContent two';
    const chunks = chunkByHeading(md);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toEqual({ heading: 'Title', text: 'Intro text' });
    expect(chunks[1]).toEqual({ heading: 'Section 1', text: 'Content one' });
  });
});
