import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { vi } from 'vitest';
import AdminSessionManager from '$lib/modules/admin/components/AdminSessionManager.svelte';

// Mock the auth stores
vi.mock('$lib/modules/auth/stores.js', () => ({
  user: {
    subscribe: vi.fn((callback) => {
      callback({ id: '1', role: 'admin', name: 'Admin User' });
      return () => {};
    })
  }
}));

// Mock fetch
global.fetch = vi.fn();

describe('Admin Session Management E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful sessions API response
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        sessions: [
          {
            id: 'session1',
            title: 'Test Session 1',
            userId: 'user1',
            isHidden: false,
            mode: 'fun',
            messageCount: 5,
            language: 'en',
            updatedAt: '2024-01-01T00:00:00Z'
          },
          {
            id: 'session2',
            title: 'Hidden Session',
            userId: 'user2',
            isHidden: true,
            mode: 'learn',
            messageCount: 3,
            language: 'es',
            updatedAt: '2024-01-02T00:00:00Z'
          }
        ],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 2,
          limit: 20,
          hasNextPage: false,
          hasPreviousPage: false
        }
      })
    });
  });

  it('should render admin session manager for admin user', async () => {
    render(AdminSessionManager);

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('All Sessions Management')).toBeInTheDocument();
    });

    // Check that filters are present
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
    expect(screen.getByLabelText('Mode')).toBeInTheDocument();
    expect(screen.getByLabelText('Include Hidden')).toBeInTheDocument();
    expect(screen.getByLabelText('Hidden Only')).toBeInTheDocument();
  });

  it('should load and display sessions', async () => {
    render(AdminSessionManager);

    // Wait for sessions to load
    await waitFor(() => {
      expect(screen.getByText('Test Session 1')).toBeInTheDocument();
      expect(screen.getByText('Hidden Session')).toBeInTheDocument();
    });

    // Check session details
    expect(screen.getByText('User: user1')).toBeInTheDocument();
    expect(screen.getByText('User: user2')).toBeInTheDocument();
    expect(screen.getByText('Messages: 5')).toBeInTheDocument();
    expect(screen.getByText('Messages: 3')).toBeInTheDocument();
  });

  it('should show restore button for hidden sessions', async () => {
    render(AdminSessionManager);

    await waitFor(() => {
      expect(screen.getByText('Hidden Session')).toBeInTheDocument();
    });

    // Check that restore button is present for hidden session
    const restoreButtons = screen.getAllByText('Restore');
    expect(restoreButtons).toHaveLength(1);
  });

  it('should handle session restoration', async () => {
    // Mock successful restore API response
    global.fetch.mockImplementation((url, options) => {
      if (url.includes('/restore') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            message: 'Session restored successfully'
          })
        });
      }
      // Return default sessions response for other calls
      return Promise.resolve({
        ok: true,
        json: async () => ({
          sessions: [
            {
              id: 'session1',
              title: 'Test Session 1',
              userId: 'user1',
              isHidden: false,
              mode: 'fun',
              messageCount: 5,
              language: 'en',
              updatedAt: '2024-01-01T00:00:00Z'
            },
            {
              id: 'session2',
              title: 'Hidden Session',
              userId: 'user2',
              isHidden: true,
              mode: 'learn',
              messageCount: 3,
              language: 'es',
              updatedAt: '2024-01-02T00:00:00Z'
            }
          ],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalCount: 2,
            limit: 20
          }
        })
      });
    });

    render(AdminSessionManager);

    await waitFor(() => {
      expect(screen.getByText('Hidden Session')).toBeInTheDocument();
    });

    // Click restore button
    const restoreButton = screen.getByText('Restore');
    fireEvent.click(restoreButton);

    // Wait for confirmation dialog
    await waitFor(() => {
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });

    // Confirm restoration
    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);

    // Wait for API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/sessions/session2/restore', {
        method: 'POST'
      });
    });
  });

  it('should apply filters correctly', async () => {
    render(AdminSessionManager);

    await waitFor(() => {
      expect(screen.getByLabelText('Search')).toBeInTheDocument();
    });

    // Set search filter
    const searchInput = screen.getByLabelText('Search');
    fireEvent.input(searchInput, { target: { value: 'test query' } });

    // Set mode filter
    const modeSelect = screen.getByLabelText('Mode');
    fireEvent.change(modeSelect, { target: { value: 'fun' } });

    // Set hidden only filter
    const hiddenOnlyCheckbox = screen.getByLabelText('Hidden Only');
    fireEvent.click(hiddenOnlyCheckbox);

    // Apply filters
    const applyButton = screen.getByText('Apply Filters');
    fireEvent.click(applyButton);

    // Check that API was called with correct parameters
    await waitFor(() => {
      const lastCall = global.fetch.mock.calls[global.fetch.mock.calls.length - 1];
      const url = new URL(lastCall[0], 'http://localhost');

      expect(url.searchParams.get('search')).toBe('test query');
      expect(url.searchParams.get('mode')).toBe('fun');
      expect(url.searchParams.get('hiddenOnly')).toBe('true');
    });
  });

  it('should handle API errors gracefully', async () => {
    // Mock API error
    global.fetch.mockRejectedValue(new Error('API Error'));

    render(AdminSessionManager);

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });
});
