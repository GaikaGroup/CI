import { render, fireEvent } from '@testing-library/svelte';
import { get } from 'svelte/store';
import { describe, it, expect, vi } from 'vitest';
import ModeSelector from '$lib/components/ModeSelector.svelte';
import ChatTypeToggle from '$lib/components/ChatTypeToggle.svelte';
import { mode, chatType, setSubject } from '$lib/stores/ui';
import { messages, addMessage } from '$lib/modules/chat/stores';
import MessageList from '$lib/modules/chat/components/MessageList.svelte';
import { sendMessage } from '$lib/modules/chat/services';

// Test mode selector updates store
describe('UI components', () => {
  it('ModeSelector updates mode store', async () => {
    const { getByRole } = render(ModeSelector);
    const funButton = getByRole('tab', { name: /Fun/i });
    await fireEvent.click(funButton);
    expect(get(mode)).toBe('fun');
    expect(funButton.className).toContain('bg-accent');
  });

  // Test subject selection adds system message without wiping history
  it('setSubject adds system banner without clearing messages', () => {
    messages.set([]);
    addMessage('user', 'hello');
    setSubject('math');
    const msgs = get(messages);
    expect(msgs.length).toBe(2);
    expect(msgs[1].type).toBe('system');
  });

  // ChatType toggle updates chatType store
  it('ChatTypeToggle switches chat type', async () => {
    const { getByRole } = render(ChatTypeToggle);
    const voiceButton = getByRole('tab', { name: /Voice chat/i });
    await fireEvent.click(voiceButton);
    expect(get(chatType)).toBe('voice');
  });

  // sendMessage includes meta and system fields
  it('sendMessage sends meta and system', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ response: 'ok', provider: { name: 'ollama' } })
      });
    global.fetch = fetchMock;
    await sendMessage('hi');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.meta).toBeTruthy();
    expect(body.system).toBeTruthy();
  });

  // Provider info renders in MessageList
  it('MessageList shows provider info', () => {
    messages.set([]);
    addMessage('tutor', 'hi', [], null, { provider: { name: 'ollama', model: 'test' } });
    const { getByText } = render(MessageList);
    getByText(/ollama/i);
    getByText(/test/i);
  });
});
