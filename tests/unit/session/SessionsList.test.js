/**
 * SessionsList Component Tests
 * Tests for the SessionsList.svelte component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import SessionsList from '../../../src/lib/modules/session/components/SessionsList.svelte';
import { sessionStore } from '../../../src/lib/modules/session/stores/sessionStore.js';
import { user, isAuthenticated } from '../../../src/lib/modules/auth/stores.js';
import { goto } from '$app/navigation';

// Mock dependencies
vi.mock('$app/navigation', () => ({
  goto: vi.fn()
}));

vi.mock('../../../src/lib/modules/session/stores/sessionStore.js', () => {
  const { writable } = require('svelte/store');

  const mockStore = writable({
    sessions: [],
    currentSession: null,
    loading: false,
    error: null,
    searchQuery: '',
    selectedSessionId: null,
    pagination: {
      currentPage: 1,
      totalPages: 0,
      totalCount: 0,
      limit: 20,
      hasNextPage: false,
      hasPreviousPage: false
    }
  });

  return {
    sessionStore: {
      subscribe: mockStore.subscribe,
      initialize: vi.fn(),
      loadSessions: vi.fn(),
      createSession: vi.fn(),
      updateSession: vi.fn(),
      deleteSession: vi.fn(),
      searchSessions: vi.fn(),
      selectSession: vi.fn(),
      loadNextPage: vi.fn(),
      loadPreviousPage: vi.fn()
    },
    isSessionLoading: writable(false),
    sessionError: writable(null)
  };
});

describe('SessionsList Component', () => {
  beforeEach(() => {
    // Set up authenticated user
    user.set({ id: 'test-user-1', name: 'Test User' });
    isAuthenticated.set(true);

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Requirement 1.1: Display sessions sidebar', () => {
    it('should render the sessions sidebar with header', () => {
      render(SessionsList);

      expect(screen.getByText('Sessions')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search sessions...')).toBeInTheDocument();
    });

    it('should initialize session store on mount', async () => {
      render(SessionsList);

      await waitFor(() => {
        expect(sessionStore.initialize).toHaveBeenCalled();
      });
    });
  });

  describe('Requirement 1.2: Real-time search with debouncing', () => {
    it('should render search input', () => {
      render(SessionsList);

      const searchInput = screen.getByPlaceholderText('Search sessions...');
      expect(searchInput).toBeInTheDocument();
    });

    it('should debounce search input and call searchSessions', async () => {
      vi.useFakeTimers();
      render(SessionsList);

      const searchInput = screen.getByPlaceholderText('Search sessions...');

      await fireEvent.input(searchInput, { target: { value: 'test query' } });

      // Should not call immediately
      expect(sessionStore.searchSessions).not.toHaveBeenCalled();

      // Fast-forward time by 300ms (debounce delay)
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(sessionStore.searchSessions).toHaveBeenCalledWith('test query');
      });

      vi.useRealTimers();
    });

    it('should load regular sessions when search is cleared', async () => {
      vi.useFakeTimers();
      render(SessionsList);

      const searchInput = screen.getByPlaceholderText('Search sessions...');

      await fireEvent.input(searchInput, { target: { value: '' } });

      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(sessionStore.loadSessions).toHaveBeenCalled();
      });

      vi.useRealTimers();
    });
  });

  describe('Requirement 1.3: Session selection and highlighting', () => {
    it('should highlight selected session', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          title: 'Test Session 1',
          mode: 'fun',
          language: 'en',
          messageCount: 5,
          updatedAt: new Date().toISOString()
        },
        {
          id: 'session-2',
          title: 'Test Session 2',
          mode: 'learn',
          language: 'es',
          messageCount: 3,
          updatedAt: new Date().toISOString()
        }
      ];

      sessionStore.subscribe = vi.fn((callback) => {
        callback({
          sessions: mockSessions,
          loading: false,
          error: null,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false
          }
        });
        return () => {};
      });

      const { container } = render(SessionsList, { props: { selectedSessionId: 'session-1' } });

      // Check if the selected session has the highlight class
      const selectedButton = container.querySelector('.bg-amber-50');
      expect(selectedButton).toBeInTheDocument();
    });

    it('should call selectSession when a session is clicked', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          title: 'Test Session 1',
          mode: 'fun',
          language: 'en',
          messageCount: 5,
          updatedAt: new Date().toISOString()
        }
      ];

      sessionStore.subscribe = vi.fn((callback) => {
        callback({
          sessions: mockSessions,
          loading: false,
          error: null,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false
          }
        });
        return () => {};
      });

      render(SessionsList);

      const sessionButton = screen.getByText('Test Session 1').closest('button');
      await fireEvent.click(sessionButton);

      expect(sessionStore.selectSession).toHaveBeenCalledWith('session-1');
    });
  });

  describe('Requirement 1.4: Empty state handling', () => {
    it('should display empty state when no sessions exist', () => {
      sessionStore.subscribe = vi.fn((callback) => {
        callback({
          sessions: [],
          loading: false,
          error: null,
          pagination: {
            currentPage: 1,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false
          }
        });
        return () => {};
      });

      render(SessionsList);

      expect(screen.getByText('No sessions yet')).toBeInTheDocument();
      expect(screen.getByText('Create your first session to get started!')).toBeInTheDocument();
    });

    it('should display empty search state when search returns no results', () => {
      sessionStore.subscribe = vi.fn((callback) => {
        callback({
          sessions: [],
          loading: false,
          error: null,
          searchQuery: 'nonexistent',
          pagination: {
            currentPage: 1,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false
          }
        });
        return () => {};
      });

      const { container } = render(SessionsList);

      // Simulate search
      const searchInput = screen.getByPlaceholderText('Search sessions...');
      fireEvent.input(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('No sessions match your search.')).toBeInTheDocument();
    });
  });

  describe('Requirement 1.5 & 2.1: New Session button and modal', () => {
    it('should render New Session button', () => {
      render(SessionsList);

      const newSessionButton = screen.getByLabelText('New Session');
      expect(newSessionButton).toBeInTheDocument();
    });

    it('should open new session modal when button is clicked', async () => {
      render(SessionsList);

      const newSessionButton = screen.getByLabelText('New Session');
      await fireEvent.click(newSessionButton);

      expect(screen.getByText('Create New Session')).toBeInTheDocument();
      expect(screen.getByLabelText('Session Title')).toBeInTheDocument();
    });

    it('should allow mode selection in new session modal', async () => {
      render(SessionsList);

      const newSessionButton = screen.getByLabelText('New Session');
      await fireEvent.click(newSessionButton);

      expect(screen.getByText('Fun Mode')).toBeInTheDocument();
      expect(screen.getByText('Learn Mode')).toBeInTheDocument();
    });

    it('should allow language selection in new session modal', async () => {
      render(SessionsList);

      const newSessionButton = screen.getByLabelText('New Session');
      await fireEvent.click(newSessionButton);

      const languageSelect = screen.getByLabelText('Language');
      expect(languageSelect).toBeInTheDocument();
      expect(languageSelect.querySelector('option[value="en"]')).toBeInTheDocument();
      expect(languageSelect.querySelector('option[value="ru"]')).toBeInTheDocument();
      expect(languageSelect.querySelector('option[value="es"]')).toBeInTheDocument();
    });

    it('should create session and navigate when form is submitted', async () => {
      const mockSession = {
        id: 'new-session-id',
        title: 'New Test Session',
        mode: 'fun',
        language: 'en'
      };

      sessionStore.createSession.mockResolvedValue(mockSession);

      render(SessionsList);

      const newSessionButton = screen.getByLabelText('New Session');
      await fireEvent.click(newSessionButton);

      const titleInput = screen.getByLabelText('Session Title');
      await fireEvent.input(titleInput, { target: { value: 'New Test Session' } });

      const createButton = screen.getByText('Create Session');
      await fireEvent.click(createButton);

      await waitFor(() => {
        expect(sessionStore.createSession).toHaveBeenCalledWith('New Test Session', 'fun', 'en');
        expect(goto).toHaveBeenCalledWith('/sessions/new-session-id');
      });
    });
  });

  describe('Session metadata display', () => {
    it('should display session title, preview, date, mode, and language', () => {
      const mockSessions = [
        {
          id: 'session-1',
          title: 'Math Practice',
          preview: 'Working on algebra problems',
          mode: 'learn',
          language: 'en',
          messageCount: 10,
          updatedAt: new Date().toISOString()
        }
      ];

      sessionStore.subscribe = vi.fn((callback) => {
        callback({
          sessions: mockSessions,
          loading: false,
          error: null,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false
          }
        });
        return () => {};
      });

      render(SessionsList);

      expect(screen.getByText('Math Practice')).toBeInTheDocument();
      expect(screen.getByText('Working on algebra problems')).toBeInTheDocument();
      expect(screen.getByText('learn')).toBeInTheDocument();
      expect(screen.getByText('EN')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });
  });

  describe('Session management actions', () => {
    it('should allow editing session title', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          title: 'Original Title',
          mode: 'fun',
          language: 'en',
          messageCount: 5,
          updatedAt: new Date().toISOString()
        }
      ];

      sessionStore.subscribe = vi.fn((callback) => {
        callback({
          sessions: mockSessions,
          loading: false,
          error: null,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false
          }
        });
        return () => {};
      });

      render(SessionsList);

      const editButton = screen.getByLabelText('Edit title');
      await fireEvent.click(editButton);

      const titleInput = screen.getByDisplayValue('Original Title');
      expect(titleInput).toBeInTheDocument();

      await fireEvent.input(titleInput, { target: { value: 'Updated Title' } });
      await fireEvent.blur(titleInput);

      await waitFor(() => {
        expect(sessionStore.updateSession).toHaveBeenCalledWith('session-1', {
          title: 'Updated Title'
        });
      });
    });

    it('should show delete confirmation modal', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          title: 'Test Session',
          mode: 'fun',
          language: 'en',
          messageCount: 5,
          updatedAt: new Date().toISOString()
        }
      ];

      sessionStore.subscribe = vi.fn((callback) => {
        callback({
          sessions: mockSessions,
          loading: false,
          error: null,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false
          }
        });
        return () => {};
      });

      render(SessionsList);

      const deleteButton = screen.getByLabelText('Delete session');
      await fireEvent.click(deleteButton);

      expect(screen.getByText('Delete Session')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete this session/)).toBeInTheDocument();
    });

    it('should delete session when confirmed', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          title: 'Test Session',
          mode: 'fun',
          language: 'en',
          messageCount: 5,
          updatedAt: new Date().toISOString()
        }
      ];

      sessionStore.subscribe = vi.fn((callback) => {
        callback({
          sessions: mockSessions,
          loading: false,
          error: null,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false
          }
        });
        return () => {};
      });

      sessionStore.deleteSession.mockResolvedValue(true);

      render(SessionsList);

      const deleteButton = screen.getByLabelText('Delete session');
      await fireEvent.click(deleteButton);

      const confirmButton = screen.getAllByText('Delete').find((el) => el.tagName === 'BUTTON');
      await fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(sessionStore.deleteSession).toHaveBeenCalledWith('session-1');
      });
    });
  });

  describe('Loading and error states', () => {
    it('should display loading skeleton when loading', () => {
      sessionStore.subscribe = vi.fn((callback) => {
        callback({
          sessions: [],
          loading: true,
          error: null,
          pagination: {
            currentPage: 1,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false
          }
        });
        return () => {};
      });

      const { container } = render(SessionsList);

      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should display error message when error occurs', () => {
      sessionStore.subscribe = vi.fn((callback) => {
        callback({
          sessions: [],
          loading: false,
          error: 'Failed to load sessions',
          pagination: {
            currentPage: 1,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false
          }
        });
        return () => {};
      });

      render(SessionsList);

      expect(screen.getByText('Failed to load sessions')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should display pagination controls when multiple pages exist', () => {
      const mockSessions = [
        {
          id: 'session-1',
          title: 'Test Session 1',
          mode: 'fun',
          language: 'en',
          messageCount: 5,
          updatedAt: new Date().toISOString()
        }
      ];

      sessionStore.subscribe = vi.fn((callback) => {
        callback({
          sessions: mockSessions,
          loading: false,
          error: null,
          pagination: {
            currentPage: 1,
            totalPages: 3,
            hasNextPage: true,
            hasPreviousPage: false
          }
        });
        return () => {};
      });

      render(SessionsList);

      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    });

    it('should call loadNextPage when Next is clicked', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          title: 'Test Session 1',
          mode: 'fun',
          language: 'en',
          messageCount: 5,
          updatedAt: new Date().toISOString()
        }
      ];

      sessionStore.subscribe = vi.fn((callback) => {
        callback({
          sessions: mockSessions,
          loading: false,
          error: null,
          pagination: {
            currentPage: 1,
            totalPages: 3,
            hasNextPage: true,
            hasPreviousPage: false
          }
        });
        return () => {};
      });

      render(SessionsList);

      const nextButton = screen.getByText('Next');
      await fireEvent.click(nextButton);

      expect(sessionStore.loadNextPage).toHaveBeenCalled();
    });
  });
});
