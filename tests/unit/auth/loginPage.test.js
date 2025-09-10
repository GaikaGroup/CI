import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$modules/auth/services', () => ({
  login: vi.fn()
}));

vi.mock('$app/navigation', () => ({
  goto: vi.fn()
}));

import LoginPage from '../../../src/routes/login/+page.svelte';
import { login } from '$modules/auth/services';
import { goto } from '$app/navigation';

describe('LoginPage', () => {
  beforeEach(() => {
    login.mockReset();
    goto.mockReset();
  });

  it('logs in and redirects on success', async () => {
    login.mockResolvedValue({ email: 'admin@example.com' });

    const { getByPlaceholderText, getByRole } = render(LoginPage);

    await fireEvent.input(getByPlaceholderText('Email'), {
      target: { value: 'admin@example.com' }
    });
    await fireEvent.input(getByPlaceholderText('Password'), {
      target: { value: 'password' }
    });
    await fireEvent.click(getByRole('button', { name: /Sign In/i }));

    expect(login).toHaveBeenCalledWith('admin@example.com', 'password');
    await waitFor(() => {
      expect(goto).toHaveBeenCalledWith('/');
    });
  });
});
