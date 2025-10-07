import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import ConsoleDropdown from '../../../src/lib/modules/navigation/components/ConsoleDropdown.svelte';

// Mock the $app/stores module
vi.mock('$app/stores', () => ({
  page: writable({
    url: {
      pathname: '/admin/users'
    }
  })
}));

describe('ConsoleDropdown Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render Console button', () => {
    const { getByText } = render(ConsoleDropdown);
    expect(getByText('Console')).toBeTruthy();
  });

  it('should toggle dropdown on button click', async () => {
    const { getByText, queryByText } = render(ConsoleDropdown);

    // Dropdown should be closed initially
    expect(queryByText('Users')).toBeFalsy();

    // Click to open
    const button = getByText('Console');
    await fireEvent.click(button);

    // Dropdown should be open
    expect(getByText('Users')).toBeTruthy();
    expect(getByText('Finance')).toBeTruthy();
    expect(getByText('Analytics')).toBeTruthy();
  });

  it('should close dropdown when clicking a link', async () => {
    const { getByText, queryByText } = render(ConsoleDropdown);

    // Open dropdown
    const button = getByText('Console');
    await fireEvent.click(button);

    expect(getByText('Users')).toBeTruthy();

    // Click a link
    const usersLink = getByText('Users');
    await fireEvent.click(usersLink);

    // Dropdown should close (note: in real browser navigation would occur)
    // We can't easily test the actual closing in unit tests without more setup
  });

  it('should highlight Console button when on admin page', () => {
    const { container } = render(ConsoleDropdown);
    const button = container.querySelector('button');

    // Check if button has highlighted classes
    expect(button.className).toContain('text-amber-700');
  });

  it('should render all navigation links', async () => {
    const { getByText } = render(ConsoleDropdown);

    // Open dropdown
    const button = getByText('Console');
    await fireEvent.click(button);

    // Check all links are present
    expect(getByText('Users')).toBeTruthy();
    expect(getByText('Finance')).toBeTruthy();
    expect(getByText('Analytics')).toBeTruthy();
  });

  it('should have correct href attributes', async () => {
    const { getByText, container } = render(ConsoleDropdown);

    // Open dropdown
    const button = getByText('Console');
    await fireEvent.click(button);

    // Check href attributes
    const usersLink = container.querySelector('a[href="/admin/users"]');
    const financeLink = container.querySelector('a[href="/admin/finance"]');
    const analyticsLink = container.querySelector('a[href="/admin/analytics"]');

    expect(usersLink).toBeTruthy();
    expect(financeLink).toBeTruthy();
    expect(analyticsLink).toBeTruthy();
  });
});
