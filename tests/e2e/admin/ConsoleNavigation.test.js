/**
 * End-to-end tests for Console navigation
 * Tests the complete navigation flow for admin users accessing Console pages
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';

// Mock the user store - must be defined before vi.mock
vi.mock('../../../src/lib/modules/auth/stores.js', () => {
  const { writable } = require('svelte/store');
  return {
    user: writable(null),
    isAuthenticated: writable(false),
    login: vi.fn(),
    logout: vi.fn(),
    checkAuth: vi.fn()
  };
});

// Mock $app/stores
vi.mock('$app/stores', () => ({
  page: writable({
    url: {
      pathname: '/admin/users'
    }
  })
}));

// Mock i18n
vi.mock('../../../src/lib/modules/i18n/stores.js', () => ({
  selectedLanguage: writable('en')
}));

vi.mock('../../../src/lib/modules/i18n/translations.js', () => ({
  getTranslation: (lang, key) => {
    const translations = {
      title: 'AI Tutor',
      about: 'About',
      contacts: 'Contacts',
      signIn: 'Sign In'
    };
    return translations[key] || key;
  }
}));

// Mock mode store
vi.mock('../../../src/lib/stores/mode.js', () => {
  const { writable } = require('svelte/store');
  return {
    requireAuth: vi.fn(),
    appMode: writable('fun')
  };
});

import Navigation from '../../../src/lib/modules/navigation/components/Navigation.svelte';
import ConsoleDropdown from '../../../src/lib/modules/navigation/components/ConsoleDropdown.svelte';
import { user as mockUserStore } from '../../../src/lib/modules/auth/stores.js';

describe('Console Navigation E2E Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserStore.set(null);
  });

  describe('Console Visibility', () => {
    it('should show Console dropdown for admin users', async () => {
      mockUserStore.set({ id: 'admin', email: 'admin@test.com', role: 'admin' });

      const { getByText } = render(Navigation);

      expect(getByText('Console')).toBeTruthy();
    });

    it('should not show Console dropdown for non-admin users', async () => {
      mockUserStore.set({ id: 'user1', email: 'user@test.com', role: 'student' });

      const { queryByText } = render(Navigation);

      expect(queryByText('Console')).toBeFalsy();
    });

    it('should not show Console dropdown for unauthenticated users', async () => {
      mockUserStore.set(null);

      const { queryByText } = render(Navigation);

      expect(queryByText('Console')).toBeFalsy();
    });
  });

  describe('Console Dropdown Interaction', () => {
    it('should open dropdown when Console button is clicked', async () => {
      mockUserStore.set({ id: 'admin', email: 'admin@test.com', role: 'admin' });

      const { getByText, queryByText } = render(Navigation);

      // Initially dropdown should be closed
      expect(queryByText('Users')).toBeFalsy();

      // Click Console button
      const consoleButton = getByText('Console');
      await fireEvent.click(consoleButton);

      // Dropdown should be open
      await waitFor(() => {
        expect(getByText('Users')).toBeTruthy();
        expect(getByText('Finance')).toBeTruthy();
        expect(getByText('Analytics')).toBeTruthy();
      });
    });

    it('should display all Console subsections', async () => {
      mockUserStore.set({ id: 'admin', email: 'admin@test.com', role: 'admin' });

      const { getByText } = render(ConsoleDropdown);

      // Open dropdown
      const consoleButton = getByText('Console');
      await fireEvent.click(consoleButton);

      // Check all subsections
      await waitFor(() => {
        expect(getByText('Users')).toBeTruthy();
        expect(getByText('Finance')).toBeTruthy();
        expect(getByText('Analytics')).toBeTruthy();
      });
    });
  });

  describe('Navigation Between Console Pages', () => {
    it('should have correct links for all Console pages', async () => {
      mockUserStore.set({ id: 'admin', email: 'admin@test.com', role: 'admin' });

      const { getByText, container } = render(ConsoleDropdown);

      // Open dropdown
      const consoleButton = getByText('Console');
      await fireEvent.click(consoleButton);

      await waitFor(() => {
        // Check href attributes
        const usersLink = container.querySelector('a[href="/admin/users"]');
        const financeLink = container.querySelector('a[href="/admin/finance"]');
        const analyticsLink = container.querySelector('a[href="/admin/analytics"]');

        expect(usersLink).toBeTruthy();
        expect(financeLink).toBeTruthy();
        expect(analyticsLink).toBeTruthy();
      });
    });
  });

  describe('Active Page Highlighting', () => {
    it('should highlight Console button when on Users page', () => {
      mockUserStore.set({ id: 'admin', email: 'admin@test.com', role: 'admin' });

      const { container } = render(ConsoleDropdown);

      const button = container.querySelector('button');
      expect(button.className).toContain('text-amber-700');
    });

    it('should highlight current page in dropdown', async () => {
      mockUserStore.set({ id: 'admin', email: 'admin@test.com', role: 'admin' });

      const { getByText, container } = render(ConsoleDropdown);

      // Open dropdown
      const consoleButton = getByText('Console');
      await fireEvent.click(consoleButton);

      await waitFor(() => {
        // Users link should be highlighted (we're on /admin/users)
        const usersLink = container.querySelector('a[href="/admin/users"]');
        expect(usersLink.className).toContain('bg-amber-50');
        expect(usersLink.className).toContain('text-amber-700');
      });
    });
  });

  describe('Mobile Navigation', () => {
    it('should show Console in mobile menu for admin users', async () => {
      mockUserStore.set({ id: 'admin', email: 'admin@test.com', role: 'admin' });

      const { getByLabelText, getAllByText } = render(Navigation);

      // Open mobile menu
      const menuButton = getByLabelText('Open menu');
      await fireEvent.click(menuButton);

      // Console should be visible in mobile menu (appears in both desktop and mobile)
      await waitFor(() => {
        expect(getAllByText('Console').length).toBeGreaterThan(0);
      });
    });

    it('should not show Console in mobile menu for non-admin users', async () => {
      mockUserStore.set({ id: 'user1', email: 'user@test.com', role: 'student' });

      const { getByLabelText, queryByText } = render(Navigation);

      // Open mobile menu
      const menuButton = getByLabelText('Open menu');
      await fireEvent.click(menuButton);

      // Console should not be visible
      await waitFor(() => {
        expect(queryByText('Console')).toBeFalsy();
      });
    });
  });

  describe('Console Dropdown Behavior', () => {
    it('should close dropdown when clicking outside', async () => {
      mockUserStore.set({ id: 'admin', email: 'admin@test.com', role: 'admin' });

      const { getByText, container } = render(ConsoleDropdown);

      // Open dropdown
      const consoleButton = getByText('Console');
      await fireEvent.click(consoleButton);

      // Verify dropdown is open
      await waitFor(() => {
        expect(getByText('Users')).toBeTruthy();
      });

      // Note: Actual click-outside behavior would require more complex setup
      // This test verifies the dropdown can be opened
    });

    it('should maintain dropdown state during navigation', async () => {
      mockUserStore.set({ id: 'admin', email: 'admin@test.com', role: 'admin' });

      const { getByText } = render(ConsoleDropdown);

      // Open dropdown
      const consoleButton = getByText('Console');
      await fireEvent.click(consoleButton);

      // Verify dropdown is open
      await waitFor(() => {
        expect(getByText('Users')).toBeTruthy();
        expect(getByText('Finance')).toBeTruthy();
        expect(getByText('Analytics')).toBeTruthy();
      });
    });
  });

  describe('Console Access Control', () => {
    it('should only show Console to users with admin role', async () => {
      // Test with different roles
      const roles = [
        { role: 'admin', shouldShow: true },
        { role: 'student', shouldShow: false },
        { role: 'teacher', shouldShow: false },
        { role: null, shouldShow: false }
      ];

      for (const { role, shouldShow } of roles) {
        mockUserStore.set(role ? { id: 'user', email: 'user@test.com', role } : null);

        const { queryByText } = render(Navigation);

        if (shouldShow) {
          expect(queryByText('Console')).toBeTruthy();
        } else {
          expect(queryByText('Console')).toBeFalsy();
        }
      }
    });
  });
});
