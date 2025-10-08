import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/svelte';
import TypewriterMessage from '../../../src/lib/modules/chat/components/TypewriterMessage.svelte';

const integralMessage = `Решение:\n∫_{0}^{3} 2x dx = [x^(2)]_{0}^{3}`;

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
});
