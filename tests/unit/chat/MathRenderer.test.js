import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import MathRenderer from '../../../src/lib/modules/chat/components/MathRenderer.svelte';

describe('MathRenderer', () => {
  it('renders plain text without math expressions', () => {
    const { container } = render(MathRenderer, {
      props: { content: 'This is plain text without any math.' }
    });

    expect(container.textContent).toContain('This is plain text without any math.');
  });

  it('renders mathematical expressions with KaTeX', () => {
    const { container } = render(MathRenderer, {
      props: { content: 'The formula is $x^2 + y^2 = z^2$.' }
    });

    // Should contain KaTeX rendered elements
    expect(container.querySelector('.katex')).toBeTruthy();
  });

  it('handles Pythagorean theorem example', () => {
    const content = `Для решения задачи используем теорему Пифагора: c^2 = a^2 + b^2
    
Подставляем значения: c^2 = 5^2 + 12^2 = 25 + 144 = 169
Следовательно: c = √169 = 13`;

    const { container } = render(MathRenderer, {
      props: { content }
    });

    // Should render mathematical expressions
    expect(container.innerHTML).toContain('katex');
  });

  it('handles fractions and square roots', () => {
    const { container } = render(MathRenderer, {
      props: { content: 'Area formula: S = (a * b) / 2 and √169 = 13' }
    });

    // Should contain rendered math
    expect(container.querySelector('.katex')).toBeTruthy();
  });

  it('applies custom CSS classes', () => {
    const { container } = render(MathRenderer, {
      props: {
        content: 'Test content',
        className: 'custom-class'
      }
    });

    expect(container.querySelector('.custom-class')).toBeTruthy();
  });
});
