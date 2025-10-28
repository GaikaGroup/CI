import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import ModelSelector from '../../../src/lib/modules/chat/components/ModelSelector.svelte';

// Mock fetch
global.fetch = vi.fn();

describe('ModelSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockProviders = [
    {
      name: 'ollama',
      displayName: 'Ollama',
      available: true,
      models: [
        {
          id: 'llama3',
          name: 'Llama 3',
          description: 'Fast and efficient',
          capabilities: ['chat', 'reasoning']
        }
      ]
    },
    {
      name: 'openai',
      displayName: 'OpenAI',
      available: true,
      models: [
        {
          id: 'gpt-4',
          name: 'GPT-4',
          description: 'Most capable model',
          capabilities: ['chat', 'vision']
        }
      ]
    }
  ];

  it('shows loading state initially', () => {
    global.fetch.mockImplementation(() => new Promise(() => {}));

    const { getByText } = render(ModelSelector, {
      props: {
        availableProviders: [],
        excludeProvider: 'openai'
      }
    });

    expect(getByText('Loading models...')).toBeTruthy();
  });

  it('fetches and displays available providers', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: { providers: mockProviders }
      })
    });

    const { getByText } = render(ModelSelector, {
      props: {
        availableProviders: [],
        excludeProvider: 'openai'
      }
    });

    await waitFor(() => {
      expect(getByText('Ollama')).toBeTruthy();
      expect(getByText('Llama 3')).toBeTruthy();
    });
  });

  it('displays error state when fetch fails', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    const { getByText } = render(ModelSelector, {
      props: {
        availableProviders: [],
        excludeProvider: 'openai'
      }
    });

    await waitFor(() => {
      expect(getByText(/Network error/)).toBeTruthy();
    });
  });

  it('dispatches select event when model is clicked', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: { providers: mockProviders }
      })
    });

    const { component, getByText } = render(ModelSelector, {
      props: {
        availableProviders: [],
        excludeProvider: 'openai'
      }
    });

    const selectHandler = vi.fn();
    component.$on('select', selectHandler);

    await waitFor(() => {
      expect(getByText('Llama 3')).toBeTruthy();
    });

    const modelButton = getByText('Llama 3').closest('button');
    await fireEvent.click(modelButton);

    expect(selectHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          provider: 'ollama',
          model: 'llama3'
        })
      })
    );
  });

  it('filters providers based on search query', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: { providers: mockProviders }
      })
    });

    const { getByPlaceholderText, getByText, queryByText } = render(ModelSelector, {
      props: {
        availableProviders: [],
        excludeProvider: ''
      }
    });

    await waitFor(() => {
      expect(getByText('Ollama')).toBeTruthy();
    });

    const searchInput = getByPlaceholderText('Search models...');
    await fireEvent.input(searchInput, { target: { value: 'GPT' } });

    await waitFor(() => {
      expect(getByText('OpenAI')).toBeTruthy();
      expect(queryByText('Ollama')).toBeFalsy();
    });
  });

  it('dispatches close event when close button clicked', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: { providers: mockProviders }
      })
    });

    const { component, getByLabelText } = render(ModelSelector, {
      props: {
        availableProviders: [],
        excludeProvider: 'openai'
      }
    });

    const closeHandler = vi.fn();
    component.$on('close', closeHandler);

    await waitFor(() => {
      expect(getByLabelText('Close model selector')).toBeTruthy();
    });

    const closeButton = getByLabelText('Close model selector');
    await fireEvent.click(closeButton);

    expect(closeHandler).toHaveBeenCalled();
  });

  it('handles keyboard navigation with Escape key', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: { providers: mockProviders }
      })
    });

    const { component, getByLabelText } = render(ModelSelector, {
      props: {
        availableProviders: [],
        excludeProvider: 'openai'
      }
    });

    const closeHandler = vi.fn();
    component.$on('close', closeHandler);

    await waitFor(() => {
      expect(getByLabelText('Close model selector')).toBeTruthy();
    });

    const closeButton = getByLabelText('Close model selector');
    await fireEvent.keyDown(closeButton, { key: 'Escape' });

    expect(closeHandler).toHaveBeenCalled();
  });

  it('shows unavailable badge for unavailable providers', async () => {
    const providersWithUnavailable = [
      {
        ...mockProviders[0],
        available: false
      }
    ];

    global.fetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: { providers: providersWithUnavailable }
      })
    });

    const { getByText } = render(ModelSelector, {
      props: {
        availableProviders: [],
        excludeProvider: 'openai'
      }
    });

    await waitFor(
      () => {
        expect(getByText('Unavailable')).toBeTruthy();
      },
      { timeout: 3000 }
    );
  });

  it('disables model selection for unavailable providers', async () => {
    const providersWithUnavailable = [
      {
        ...mockProviders[0],
        available: false
      }
    ];

    global.fetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: { providers: providersWithUnavailable }
      })
    });

    const { container } = render(ModelSelector, {
      props: {
        availableProviders: [],
        excludeProvider: 'openai'
      }
    });

    await waitFor(
      () => {
        const disabledButtons = container.querySelectorAll('button.disabled');
        expect(disabledButtons.length).toBeGreaterThan(0);
      },
      { timeout: 3000 }
    );
  });

  it('displays model capabilities', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: { providers: mockProviders }
      })
    });

    const { container } = render(ModelSelector, {
      props: {
        availableProviders: [],
        excludeProvider: 'openai'
      }
    });

    await waitFor(
      () => {
        const capabilities = container.querySelectorAll('.capability-badge');
        expect(capabilities.length).toBeGreaterThan(0);
      },
      { timeout: 3000 }
    );
  });

  it('has proper ARIA labels for accessibility', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: { providers: mockProviders }
      })
    });

    const { getByLabelText } = render(ModelSelector, {
      props: {
        availableProviders: [],
        excludeProvider: 'openai'
      }
    });

    await waitFor(() => {
      expect(getByLabelText('Close model selector')).toBeTruthy();
      expect(getByLabelText('Search models')).toBeTruthy();
    });
  });
});
