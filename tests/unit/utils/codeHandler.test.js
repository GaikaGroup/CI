import { describe, it, expect, vi } from 'vitest';
import { handleCode } from '$lib/utils/codeHandler';

describe('codeHandler', () => {
  it('maps numeric codes', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ quickCodes: { 12: 'menu' } }) });
    const action = await handleCode('12', 'abc');
    expect(action).toBe('menu');
  });
});
