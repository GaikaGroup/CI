import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import SecondOpinionMessage from '../../../src/lib/modules/chat/components/SecondOpinionMessage.svelte';

describe('SecondOpinionMessage', () => {
  const mockMessage = {
    id: 'msg-2',
    content: 'This is a second opinion response',
    timestamp: '10:30 AM',
    metadata: {
      opinionId: 'opinion-1'
    }
  };

  const mockPrimaryMessage = {
    id: 'msg-1',
    content: 'This is the primary response'
  };

  it('renders message content', () => {
    const { getByText } = render(SecondOpinionMessage, {
      props: {
        message: mockMessage,
        primaryMessage: mockPrimaryMessage,
        provider: 'ollama',
        model: 'llama3'
      }
    });

    expect(getByText('This is a second opinion response')).toBeTruthy();
  });

  it('displays provider and model information', () => {
    const { getByText } = render(SecondOpinionMessage, {
      props: {
        message: mockMessage,
        primaryMessage: mockPrimaryMessage,
        provider: 'ollama',
        model: 'llama3'
      }
    });

    expect(getByText(/Ollama/)).toBeTruthy();
    expect(getByText(/llama3/)).toBeTruthy();
  });

  it('shows divergence alert when divergence level is medium or high', () => {
    const { container } = render(SecondOpinionMessage, {
      props: {
        message: mockMessage,
        primaryMessage: mockPrimaryMessage,
        provider: 'ollama',
        model: 'llama3',
        divergenceLevel: 'high',
        divergenceData: {
          differences: ['Different approach'],
          suggestedQuestions: ['Can you clarify?']
        }
      }
    });

    expect(container.querySelector('.divergence-container')).toBeTruthy();
  });

  it('does not show divergence alert for low divergence', () => {
    const { container } = render(SecondOpinionMessage, {
      props: {
        message: mockMessage,
        primaryMessage: mockPrimaryMessage,
        provider: 'ollama',
        model: 'llama3',
        divergenceLevel: 'low'
      }
    });

    expect(container.querySelector('.divergence-container')).toBeFalsy();
  });

  it('dispatches feedback event when helpful button clicked', async () => {
    const { component, getByTitle } = render(SecondOpinionMessage, {
      props: {
        message: mockMessage,
        primaryMessage: mockPrimaryMessage,
        provider: 'ollama',
        model: 'llama3'
      }
    });

    const feedbackHandler = vi.fn();
    component.$on('feedback', feedbackHandler);

    const helpfulButton = getByTitle('This was helpful');
    await fireEvent.click(helpfulButton);

    expect(feedbackHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          opinionId: 'opinion-1',
          helpful: true
        })
      })
    );
  });

  it('disables feedback buttons after feedback is given', async () => {
    const { getByTitle } = render(SecondOpinionMessage, {
      props: {
        message: mockMessage,
        primaryMessage: mockPrimaryMessage,
        provider: 'ollama',
        model: 'llama3',
        feedbackSubmitted: true
      }
    });

    const helpfulButton = getByTitle('This was helpful');
    const notHelpfulButton = getByTitle('Not helpful');

    expect(helpfulButton.disabled || notHelpfulButton.disabled).toBe(true);
  });

  it('toggles collapse state when collapse button clicked', async () => {
    const { container, getByLabelText } = render(SecondOpinionMessage, {
      props: {
        message: mockMessage,
        primaryMessage: mockPrimaryMessage,
        provider: 'ollama',
        model: 'llama3'
      }
    });

    const collapseButton = getByLabelText(/Collapse/);
    await fireEvent.click(collapseButton);

    expect(container.querySelector('.collapsed')).toBeTruthy();
  });

  it('handles keyboard navigation for feedback buttons', async () => {
    const { component, getByTitle } = render(SecondOpinionMessage, {
      props: {
        message: mockMessage,
        primaryMessage: mockPrimaryMessage,
        provider: 'ollama',
        model: 'llama3'
      }
    });

    const feedbackHandler = vi.fn();
    component.$on('feedback', feedbackHandler);

    const helpfulButton = getByTitle('This was helpful');
    await fireEvent.keyDown(helpfulButton, { key: 'Enter' });

    expect(feedbackHandler).toHaveBeenCalled();
  });

  it('has proper ARIA labels for accessibility', () => {
    const { getByLabelText } = render(SecondOpinionMessage, {
      props: {
        message: mockMessage,
        primaryMessage: mockPrimaryMessage,
        provider: 'ollama',
        model: 'llama3'
      }
    });

    expect(getByLabelText(/Collapse second opinion/)).toBeTruthy();
    expect(getByLabelText('This was helpful')).toBeTruthy();
    expect(getByLabelText('Not helpful')).toBeTruthy();
  });
});
