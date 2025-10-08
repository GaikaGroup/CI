import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/svelte';
import TypewriterMessage from '../../../src/lib/modules/chat/components/TypewriterMessage.svelte';

const integralMessage = `Решение:\n∫_{0}^{3} 2x dx = [x^(2)]_{0}^{3}`;
const legacyDelimitersMessage = String.raw`Пример: \( y = x^{2} \)\n\[ S = ∫_{0}^{1} x^{2} dx \]`;
const currencyMessage = 'Цена $5 и уравнение a=b';
const legacyDelimitersMessage = String.raw`Пример: \( y = x^{2} \)
\[ S = ∫_{0}^{1} x^{2} dx \]`;

describe('Math rendering integration', () => {
  it('renders KaTeX output inside typewriter messages', async () => {
    const { container } = render(TypewriterMessage, {
      props: {
        text: integralMessage,
        animate: false
      }
    });

    await waitFor(() => {
      expect(container.querySelector('.katex')).toBeTruthy();
    });

    const katexAnnotation = container.querySelector('annotation');
    expect(katexAnnotation?.textContent).toContain('\\int_{0}^{3} 2x');
  });

  it('supports legacy inline and display delimiters', async () => {
    const { container } = render(TypewriterMessage, {
      props: {
        text: legacyDelimitersMessage,
        animate: false
      }
    });

    await waitFor(() => {
      expect(container.querySelectorAll('.katex').length).toBeGreaterThan(1);
    });

    expect(container.textContent).not.toContain(String.raw`\(`);
    expect(container.textContent).not.toContain(String.raw`\)`);
    expect(container.textContent).not.toContain(String.raw`\[`);
    expect(container.textContent).not.toContain(String.raw`\]`);

    const annotationTexts = Array.from(container.querySelectorAll('annotation')).map(
      (node) => node.textContent ?? ''
    );
    expect(annotationTexts.some((text) => text.includes('S = \\int_{0}^{1} x^{2}'))).toBe(true);
  });

  it('keeps currency and bare equations as plain text', async () => {
    const { container } = render(TypewriterMessage, {
      props: {
        text: currencyMessage,
        animate: false
      }
    });

    await waitFor(() => {
      expect(container.querySelector('.katex')).toBeNull();
    });

    expect(container.textContent).toContain('Цена $5');
    expect(container.textContent).toContain('a=b');
  });
});
