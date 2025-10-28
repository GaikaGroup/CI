import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import SecondOpinionButton from '../../../src/lib/modules/chat/components/SecondOpinionButton.svelte';

describe('SecondOpinionButton', () => {
  it('renders button with correct text', () => {
    const { getByText } = render(SecondOpinionButton, {
      props: {
        messageId: 'msg-1',
        primaryProvider: 'openai',
        availableProviders: ['ollama']
      }
    });

    expect(getByText('Get Second Opinion')).toBeTruthy();
  });

  it('dispatches request event when clicked', async () => {
    const { component, getByRole } = render(SecondOpinionButton, {
      props: {
        messageId: 'msg-1',
        primaryProvider: 'openai',
        availableProviders: ['ollama']
      }
    });

    const requestHandler = vi.fn();
    component.$on('request', requestHandler);

    const button = getByRole('button');
    await fireEvent.click(button);

    expect(requestHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          messageId: 'msg-1'
        })
      })
    );
  });

  it('shows loading state when loading prop is true', () => {
    const { container } = render(SecondOpinionButton, {
      props: {
        messageId: 'msg-1',
        primaryProvider: 'openai',
        availableProviders: ['ollama'],
        loading: true
      }
    });

    expect(container.querySelector('.loading')).toBeTruthy();
  });

  it('disables button when no alternative providers available', () => {
    const { getByRole } = render(SecondOpinionButton, {
      props: {
        messageId: 'msg-1',
        primaryProvider: 'openai',
        availableProviders: []
      }
    });

    const button = getByRole('button');
    expect(button.disabled).toBe(true);
  });

  it('shows opinion count when opinions exist', () => {
    const { getByText } = render(SecondOpinionButton, {
      props: {
        messageId: 'msg-1',
        primaryProvider: 'openai',
        availableProviders: ['ollama'],
        opinionCount: 2
      }
    });

    expect(getByText('2 Opinions')).toBeTruthy();
  });

  it('handles keyboard navigation with Enter key', async () => {
    const { component, getByRole } = render(SecondOpinionButton, {
      props: {
        messageId: 'msg-1',
        primaryProvider: 'openai',
        availableProviders: ['ollama']
      }
    });

    const requestHandler = vi.fn();
    component.$on('request', requestHandler);

    const button = getByRole('button');
    await fireEvent.keyDown(button, { key: 'Enter' });

    expect(requestHandler).toHaveBeenCalled();
  });

  it('has proper ARIA label for accessibility', () => {
    const { getByRole } = render(SecondOpinionButton, {
      props: {
        messageId: 'msg-1',
        primaryProvider: 'openai',
        availableProviders: ['ollama']
      }
    });

    const button = getByRole('button');
    expect(button.getAttribute('aria-label')).toBeTruthy();
  });
});
