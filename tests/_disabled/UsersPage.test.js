import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import UsersPage from '../../../src/routes/admin/users/+page.svelte';

describe('Users Page Component', () => {
  const mockUsers = [
    {
      userId: 'user1@test.com',
      email: 'user1@test.com',
      registrationDate: '2025-01-15T10:00:00Z',
      sessionCount: 5,
      messageCount: 23
    },
    {
      userId: 'user2@test.com',
      email: 'user2@test.com',
      registrationDate: '2025-01-10T10:00:00Z',
      sessionCount: 3,
      messageCount: 12
    },
    {
      userId: 'admin@test.com',
      email: 'admin@test.com',
      registrationDate: '2025-01-05T10:00:00Z',
      sessionCount: 10,
      messageCount: 50
    }
  ];

  const mockStatistics = {
    totalUsers: 3,
    totalSessions: 18
  };

  const mockData = {
    user: { id: 'admin', email: 'admin@test.com', type: 'admin' },
    users: mockUsers,
    statistics: mockStatistics
  };

  beforeEach(() => {
    // Clear any previous renders
  });

  it('should render page title and description', () => {
    const { getByText } = render(UsersPage, { props: { data: mockData } });

    expect(getByText('Users')).toBeTruthy();
    expect(getByText('Console')).toBeTruthy();
  });

  it('should display statistics cards', () => {
    const { getByText, getAllByText } = render(UsersPage, { props: { data: mockData } });

    expect(getByText('Total Users')).toBeTruthy();
    // "3" appears in both statistics and table
    expect(getAllByText('3').length).toBeGreaterThan(0);
    expect(getByText('Total Sessions')).toBeTruthy();
    expect(getByText('18')).toBeTruthy();
  });

  it('should render user table with all users', () => {
    const { getAllByText } = render(UsersPage, { props: { data: mockData } });

    // All emails should be present (admin@test.com appears twice - in header and table)
    expect(getAllByText('user1@test.com').length).toBeGreaterThan(0);
    expect(getAllByText('user2@test.com').length).toBeGreaterThan(0);
    expect(getAllByText('admin@test.com').length).toBeGreaterThan(0);
  });

  it('should display user statistics in table', () => {
    const { getByText } = render(UsersPage, { props: { data: mockData } });

    // Check that session and message counts are displayed
    expect(getByText('5')).toBeTruthy(); // user1 sessions
    expect(getByText('23')).toBeTruthy(); // user1 messages
  });

  it('should filter users based on search query', async () => {
    const { getByPlaceholderText, getAllByText, container } = render(UsersPage, {
      props: { data: mockData }
    });

    const searchInput = getByPlaceholderText('Search by email...');

    // Type in search
    await fireEvent.input(searchInput, { target: { value: 'user1' } });

    // Should show user1 in table
    expect(getAllByText('user1@test.com').length).toBeGreaterThan(0);

    // user2 should not be in table
    const tableBody = container.querySelector('tbody');
    expect(tableBody.textContent).not.toContain('user2@test.com');
  });

  it('should show "no results found" message when search has no matches', async () => {
    const { getByPlaceholderText, getByText } = render(UsersPage, { props: { data: mockData } });

    const searchInput = getByPlaceholderText('Search by email...');

    // Type in search with no matches
    await fireEvent.input(searchInput, { target: { value: 'nonexistent' } });

    expect(getByText(/No results found for/)).toBeTruthy();
  });

  it('should show all users when search is cleared', async () => {
    const { getByPlaceholderText, getAllByText } = render(UsersPage, { props: { data: mockData } });

    const searchInput = getByPlaceholderText('Search by email...');

    // Type in search
    await fireEvent.input(searchInput, { target: { value: 'user1' } });

    // Clear search
    await fireEvent.input(searchInput, { target: { value: '' } });

    // All users should be visible again (admin@test.com appears twice - in header and table)
    expect(getAllByText('user1@test.com').length).toBeGreaterThan(0);
    expect(getAllByText('user2@test.com').length).toBeGreaterThan(0);
    expect(getAllByText('admin@test.com').length).toBeGreaterThan(0);
  });

  it('should display error message when error prop is provided', () => {
    const errorData = {
      ...mockData,
      error: 'Failed to load user data'
    };

    const { getByText } = render(UsersPage, { props: { data: errorData } });

    expect(getByText('Failed to load user data')).toBeTruthy();
  });

  it('should show "No users found" when users array is empty', () => {
    const emptyData = {
      user: { id: 'admin', email: 'admin@test.com', type: 'admin' },
      users: [],
      statistics: { totalUsers: 0, totalSessions: 0 }
    };

    const { getByText } = render(UsersPage, { props: { data: emptyData } });

    expect(getByText('No users found.')).toBeTruthy();
  });

  it('should format dates correctly', () => {
    const { container } = render(UsersPage, { props: { data: mockData } });

    // Check that dates are formatted (should contain month name)
    const dateCell = container.querySelector('td:nth-child(2)');
    expect(dateCell.textContent).toMatch(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
  });

  it('should format numbers with commas', () => {
    const largeNumberData = {
      user: { id: 'admin', email: 'admin@test.com', type: 'admin' },
      users: [
        {
          userId: 'user1@test.com',
          email: 'user1@test.com',
          registrationDate: '2025-01-15T10:00:00Z',
          sessionCount: 1000,
          messageCount: 5000
        }
      ],
      statistics: { totalUsers: 1, totalSessions: 1000 }
    };

    const { getAllByText } = render(UsersPage, { props: { data: largeNumberData } });

    // Numbers should be formatted with commas (may appear multiple times)
    expect(getAllByText('1,000').length).toBeGreaterThan(0);
    expect(getAllByText('5,000').length).toBeGreaterThan(0);
  });

  it('should display signed in user email', () => {
    const { getByText, getAllByText } = render(UsersPage, { props: { data: mockData } });

    expect(getByText(/Signed in as/)).toBeTruthy();
    // admin@test.com appears twice - in "Signed in as" and in the table
    expect(getAllByText('admin@test.com').length).toBeGreaterThan(0);
  });
});
