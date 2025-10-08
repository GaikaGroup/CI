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

  it('converts legacy inline delimiters to KaTeX markup', () => {
    const content = String.raw`Функция записана как \( y = x^{2} \) и имеет минимум.`;
    const { container } = render(MathMessage, { props: { content } });

    const katexInline = container.querySelector('.katex');
    expect(katexInline).toBeTruthy();

    const rawText = container.textContent ?? '';
    expect(rawText).not.toContain(String.raw`\(`);
    expect(rawText).not.toContain(String.raw`\)`);

    const annotationTexts = Array.from(container.querySelectorAll('annotation')).map(
      (node) => node.textContent ?? ''
    );
    expect(annotationTexts.some((text) => text.includes('y = x^{2}'))).toBe(true);
  });

  it('handles legacy display delimiters without leaving raw markup', () => {
    const content = String.raw`\[ S = ∫_{0}^{1} x^{2} dx \]\nОтвет: S = 1/3`;
    const { container } = render(MathMessage, { props: { content } });

    const katexDisplays = container.querySelectorAll('.katex-display');
    expect(katexDisplays.length).toBeGreaterThan(0);

    const combinedText = container.textContent ?? '';
    expect(combinedText).not.toContain(String.raw`\[`);
    expect(combinedText).not.toContain(String.raw`\]`);

    const annotationTexts = Array.from(container.querySelectorAll('annotation')).map(
      (node) => node.textContent ?? ''
    );
    const displayMatch = annotationTexts.find((text) => text.includes('S = \\int_{0}^{1} x^{2}'));
    expect(displayMatch).toBeTruthy();
    expect(displayMatch).toContain('\\, dx');
  });

  it('leaves auto-wrapping disabled when currency introduces an unmatched dollar', () => {
    const content = 'Цена $5 и уравнение a=b';
    const { container } = render(MathMessage, { props: { content } });

    expect(container.querySelector('.katex')).toBeNull();

    const text = container.textContent ?? '';
    expect(text).toContain('Цена $5');
    expect(text).toContain('a=b');
  });

  it('does not let currency consume inline math that already has delimiters', () => {
    const content = 'Цена $5, а формула $a=b$ и все хорошо';
    const { container } = render(MathMessage, { props: { content } });

    const katexNodes = container.querySelectorAll('.katex');
    expect(katexNodes.length).toBe(1);

    const annotation = katexNodes[0]?.querySelector('annotation');
    expect(annotation?.textContent).toContain('a=b');

    const text = container.textContent ?? '';
    expect(text).toContain('Цена $5, а формула ');
    expect(text.endsWith('и все хорошо')).toBe(true);
  });

  it('still auto-wraps equations when currency appears after the math', () => {
    const content = 'a=b и стоимость $5';
    const { container } = render(MathMessage, { props: { content } });

    const katexNode = container.querySelector('.katex');
    expect(katexNode).toBeTruthy();

    const annotation = katexNode?.querySelector('annotation');
    expect(annotation?.textContent).toContain('a=b');

    const text = container.textContent ?? '';
    expect(text).toContain('стоимость $5');
  });
});
