import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/svelte';
import { goto } from '$app/navigation';
import CataloguePage from '$routes/catalogue/+page.svelte';

// Mock dependencies
vi.mock('$app/navigation', () => ({
  goto: vi.fn()
}));

vi.mock('$app/environment', () => ({
  browser: true
}));

vi.mock('$modules/auth/stores', () => ({
  user: {
    subscribe: vi.fn((callback) => {
      callback({ id: 'user1', role: 'user' });
      return () => {};
    })
  },
  checkAuth: vi.fn(),
  isAuthenticated: {
    subscribe: vi.fn((callback) => {
      callback(true);
      return () => {};
    })
  }
}));

vi.mock('$lib/stores/subjects', () => ({
  subjectsStore: {
    subscribe: vi.fn((callback) => {
      callback([
        {
          id: 'subject1',
          name: 'Spanish B2',
          description: 'Advanced Spanish course',
          language: 'Spanish',
          level: 'B2',
          skills: ['reading', 'writing'],
          creatorId: 'user1',
          creatorRole: 'user',
          agents: [],
          materials: []
        }
      ]);
      return () => {};
    }),
    initialise: vi.fn()
  }
}));

vi.mock('$lib/stores/examProfile', () => ({
  examProfile: {
    subscribe: vi.fn((callback) => {
      callback(null);
      return () => {};
    })
  },
  initialiseExamProfile: vi.fn(),
  setExamProfile: vi.fn(),
  clearExamProfile: vi.fn()
}));

vi.mock('$lib/stores/mode', () => ({
  setMode: vi.fn()
}));

vi.mock('$lib/shared/di/container', () => ({
  container: {
    has: vi.fn(() => false),
    resolve: vi.fn()
  }
}));

describe('Catalogue Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders catalogue page with subjects', async () => {
    render(CataloguePage);

    await waitFor(() => {
      expect(screen.getByText('Subject Catalog')).toBeInTheDocument();
      expect(screen.getByText('Spanish B2')).toBeInTheDocument();
      expect(screen.getByText('Advanced Spanish course')).toBeInTheDocument();
    });
  });

  it('shows edit icon for subject creator', async () => {
    render(CataloguePage);

    await waitFor(() => {
      expect(screen.getByTitle('Edit subject')).toBeInTheDocument();
    });
  });

  it('shows join button', async () => {
    render(CataloguePage);

    await waitFor(() => {
      expect(screen.getByText('Join')).toBeInTheDocument();
    });
  });

  it('navigates to edit page when edit icon is clicked', async () => {
    render(CataloguePage);

    await waitFor(() => {
      const editButton = screen.getByTitle('Edit subject');
      fireEvent.click(editButton);
    });

    expect(goto).toHaveBeenCalledWith('/catalogue/edit?id=subject1');
  });

  it('navigates to create page when create button is clicked', async () => {
    render(CataloguePage);

    await waitFor(() => {
      const createButton = screen.getByText('Create Subject');
      fireEvent.click(createButton);
    });

    expect(goto).toHaveBeenCalledWith('/catalogue/edit?new=true');
  });

  it('handles subject join', async () => {
    const { setExamProfile } = await import('$lib/stores/examProfile');

    render(CataloguePage);

    await waitFor(() => {
      const joinButton = screen.getByText('Join');
      fireEvent.click(joinButton);
    });

    expect(setExamProfile).toHaveBeenCalled();
  });

  it('filters subjects by search', async () => {
    render(CataloguePage);

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search subjects...');
      fireEvent.input(searchInput, { target: { value: 'French' } });
    });

    // Subject should be filtered out
    expect(screen.queryByText('Spanish B2')).not.toBeInTheDocument();
  });

  it('filters subjects by language', async () => {
    render(CataloguePage);

    await waitFor(() => {
      const languageSelect = screen.getByLabelText('Language');
      fireEvent.change(languageSelect, { target: { value: 'French' } });
    });

    // Subject should be filtered out
    expect(screen.queryByText('Spanish B2')).not.toBeInTheDocument();
  });

  it('shows report modal when report button is clicked', async () => {
    render(CataloguePage);

    await waitFor(() => {
      const reportButton = screen.getByTitle('Report inappropriate content');
      fireEvent.click(reportButton);
    });

    expect(screen.getByText('Report Subject')).toBeInTheDocument();
    expect(screen.getByText('You are reporting: Spanish B2')).toBeInTheDocument();
  });
});
