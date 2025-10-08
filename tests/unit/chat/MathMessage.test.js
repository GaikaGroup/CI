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

    const annotation = katexNode?.querySelector('annotation');
    const annotationText = annotation?.textContent ?? '';
    expect(annotationText).toContain('\\int 2x');
    expect(annotationText).toContain('\\, dz');
    expect(annotationText).toContain('x^{2}');
  });

  it('renders integrals with limits from plain unicode text', () => {
    const content = '∫_{0}^{3} 2x dx = [x^(2)]_{0}^{3}';
    const { container } = render(MathMessage, { props: { content } });

    const katexDisplay = container.querySelector('.katex-display');
    expect(katexDisplay).toBeTruthy();

    const annotation = katexDisplay?.querySelector('annotation');
    const annotationText = annotation?.textContent ?? '';
    expect(annotationText).toContain('\\int_{0}^{3} 2x');
    expect(annotationText).toContain('\\, dx');
    expect(annotationText).toContain('[x^{2}]_{0}^{3}');
  });
});
