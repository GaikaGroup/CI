import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/svelte';
import TypewriterMessage from '../../../src/lib/modules/chat/components/TypewriterMessage.svelte';

describe('TypewriterMessage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders unicode integral input as KaTeX after animation completes', async () => {
    const { container } = render(TypewriterMessage, {
      props: {
        text: '∫ 2x dz = x^(2) + C',
        animate: true,
        speed: 1
      }
    });

    await vi.runAllTimersAsync();

    await waitFor(() => {
      expect(container.querySelector('.katex')).toBeTruthy();
    });

    expect(container.querySelector('.katex-display')).toBeTruthy();
  });
});
