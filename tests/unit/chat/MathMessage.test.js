import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import MathMessage from '../../../src/lib/modules/chat/components/MathMessage.svelte';

describe('MathMessage', () => {
  it('normalizes unicode integrals into KaTeX-renderable math', () => {
    const { container } = render(MathMessage, {
      props: {
        content: '∫ 2x dz = x^(2) + C'
      }
    });

    const katexNode = container.querySelector('.katex');
    expect(katexNode).toBeTruthy();
    expect(container.querySelector('.katex-display')).toBeTruthy();

    const annotation = katexNode!.querySelector('annotation');
    const annotationText = annotation?.textContent ?? '';
    expect(annotationText).toContain('\\int 2x');
    expect(annotationText).toContain('\\, dz');
    expect(annotationText).toContain('x^{2}');
  });
});
