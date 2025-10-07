/**
 * SessionPreview Component Tests
 * Tests for the SessionPreview.svelte component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import SessionPreview from '../../../src/lib/modules/session/components/SessionPreview.svelte';
import { sessionStore } from '../../../src/lib/modules/session/stores/sessionStore.js';

// Mock the navigation
vi.mock('$app/navigation', () => ({
  goto: vi.fn()
}));

// Mock the sessionStore
vi.mock('../../../src/lib/modules/session/stores/sessionStore.js', () => ({
  sessionStore: {
    updateSession: vi.fn(),
    deleteSession: vi.fn()
  }
}));

describe('SessionPreview Component', () => {
  const mockSession = {
    id: 'session-123',
    userId: 'user-456',
    title: 'Test Session',
    preview: 'This is a preview of the last conversation',
    mode: 'fun',
    language: 'en',
    messageCount: 15,
    createdAt: new Date('2024-01-01T10:00:00Z').toISOString(),
    updatedAt: new Date('2024-01-15T14:30:00Z').toISOString()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Empty State', () => {
    it('should display empty state when no session is provided', () => {
      render(SessionPreview, { props: { session: null } });

      expect(screen.getByText('No Session Selected')).toBeInTheDocument();
      expect(screen.getByText(/Choose a session from the sidebar/i)).toBeInTheDocument();
    });

    it('should show helpful tip in empty state', () => {
      render(SessionPreview, { props: { session: null } });

      expect(screen.getByText(/💡 Tip:/i)).toBeInTheDocument();
      expect(screen.getByText(/create a new session or search/i)).toBeInTheDocument();
    });

    it('should display MessageSquare icon in empty state', () => {
      const { container } = render(SessionPreview, { props: { session: null } });

      // Check for SVG icon
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Session Details Display', () => {
    it('should display session title', () => {
      render(SessionPreview, { props: { session: mockSession } });

      expect(screen.getByText('Test Session')).toBeInTheDocument();
    });

    it('should display mode badge for fun mode', () => {
      render(SessionPreview, { props: { session: mockSession } });

      expect(screen.getByText('Fun Mode')).toBeInTheDocument();
    });

    it('should display mode badge for learn mode', () => {
      const learnSession = { ...mockSession, mode: 'learn' };
      render(SessionPreview, { props: { session: learnSession } });

      expect(screen.getByText('Learn Mode')).toBeInTheDocument();
    });

    it('should display language badge', () => {
      render(SessionPreview, { props: { session: mockSession } });

      expect(screen.getByText('English')).toBeInTheDocument();
    });

    it('should display language badge for other languages', () => {
      const spanishSession = { ...mockSession, language: 'es' };
      render(SessionPreview, { props: { session: spanishSession } });

      expect(screen.getByText('Español')).toBeInTheDocument();
    });

    it('should display preview text when available', () => {
      render(SessionPreview, { props: { session: mockSession } });

      expect(screen.getByText('This is a preview of the last conversation')).toBeInTheDocument();
    });

    it('should not display preview section when preview is null', () => {
      const sessionWithoutPreview = { ...mockSession, preview: null };
      render(SessionPreview, { props: { session: sessionWithoutPreview } });

      expect(screen.queryByText('Last Conversation')).not.toBeInTheDocument();
    });
  });

  describe('Session Statistics', () => {
    it('should display message count', () => {
      render(SessionPreview, { props: { session: mockSession } });

      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('Messages')).toBeInTheDocument();
    });

    it('should display singular "Message" for count of 1', () => {
      const singleMessageSession = { ...mockSession, messageCount: 1 };
      render(SessionPreview, { props: { session: singleMessageSession } });

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('Message')).toBeInTheDocument();
    });

    it('should display last activity time', () => {
      render(SessionPreview, { props: { session: mockSession } });

      expect(screen.getByText('Last activity')).toBeInTheDocument();
    });

    it('should display session created date', () => {
      render(SessionPreview, { props: { session: mockSession } });

      expect(screen.getByText('Session created')).toBeInTheDocument();
    });

    it('should display statistics section header', () => {
      render(SessionPreview, { props: { session: mockSession } });

      expect(screen.getByText('Session Statistics')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should display Continue Session button', () => {
      render(SessionPreview, { props: { session: mockSession } });

      expect(screen.getByRole('button', { name: /Continue Session/i })).toBeInTheDocument();
    });

    it('should display View History button', () => {
      render(SessionPreview, { props: { session: mockSession } });

      expect(screen.getByRole('button', { name: /View History/i })).toBeInTheDocument();
    });

    it('should display Edit button', () => {
      render(SessionPreview, { props: { session: mockSession } });

      const editButton = screen.getByLabelText('Edit session title');
      expect(editButton).toBeInTheDocument();
    });

    it('should display Delete button', () => {
      render(SessionPreview, { props: { session: mockSession } });

      const deleteButton = screen.getByLabelText('Delete session');
      expect(deleteButton).toBeInTheDocument();
    });
  });

  describe('Continue Session Action', () => {
    it('should emit continue event when Continue Session is clicked', async () => {
      const { component } = render(SessionPreview, { props: { session: mockSession } });

      const continueHandler = vi.fn();
      component.$on('continue', continueHandler);

      const continueButton = screen.getByRole('button', { name: /Continue Session/i });
      await fireEvent.click(continueButton);

      expect(continueHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { sessionId: 'session-123' }
        })
      );
    });

    it('should navigate to session chat when Continue Session is clicked', async () => {
      const { goto } = await import('$app/navigation');
      render(SessionPreview, { props: { session: mockSession } });

      const continueButton = screen.getByRole('button', { name: /Continue Session/i });
      await fireEvent.click(continueButton);

      expect(goto).toHaveBeenCalledWith('/sessions/session-123');
    });
  });

  describe('View History Action', () => {
    it('should emit viewHistory event when View History is clicked', async () => {
      const { component } = render(SessionPreview, { props: { session: mockSession } });

      const historyHandler = vi.fn();
      component.$on('viewHistory', historyHandler);

      const historyButton = screen.getByRole('button', { name: /View History/i });
      await fireEvent.click(historyButton);

      expect(historyHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { sessionId: 'session-123' }
        })
      );
    });

    it('should navigate to history view when View History is clicked', async () => {
      const { goto } = await import('$app/navigation');
      render(SessionPreview, { props: { session: mockSession } });

      const historyButton = screen.getByRole('button', { name: /View History/i });
      await fireEvent.click(historyButton);

      expect(goto).toHaveBeenCalledWith('/sessions/session-123/history');
    });
  });

  describe('Edit Title Functionality', () => {
    it('should open edit modal when edit button is clicked', async () => {
      render(SessionPreview, { props: { session: mockSession } });

      const editButton = screen.getByLabelText('Edit session title');
      await fireEvent.click(editButton);
      await tick();

      expect(screen.getByText('Edit Session Title')).toBeInTheDocument();
    });

    it('should populate input with current title in edit modal', async () => {
      render(SessionPreview, { props: { session: mockSession } });

      const editButton = screen.getByLabelText('Edit session title');
      await fireEvent.click(editButton);
      await tick();

      const input = screen.getByLabelText('Session Title');
      expect(input).toHaveValue('Test Session');
    });

    it('should close edit modal when Cancel is clicked', async () => {
      render(SessionPreview, { props: { session: mockSession } });

      const editButton = screen.getByLabelText('Edit session title');
      await fireEvent.click(editButton);
      await tick();

      expect(screen.getByText('Edit Session Title')).toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await fireEvent.click(cancelButton);
      await tick();

      expect(screen.queryByText('Edit Session Title')).not.toBeInTheDocument();
    });

    it('should call updateSession when Save Changes is clicked', async () => {
      sessionStore.updateSession.mockResolvedValue({
        ...mockSession,
        title: 'Updated Title'
      });

      render(SessionPreview, { props: { session: mockSession } });

      const editButton = screen.getByLabelText('Edit session title');
      await fireEvent.click(editButton);
      await tick();

      const input = screen.getByLabelText('Session Title');
      await fireEvent.input(input, { target: { value: 'Updated Title' } });
      await tick();

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      await fireEvent.click(saveButton);
      await tick();

      expect(sessionStore.updateSession).toHaveBeenCalledWith('session-123', {
        title: 'Updated Title'
      });
    });

    it('should emit updated event after successful title update', async () => {
      sessionStore.updateSession.mockResolvedValue({
        ...mockSession,
        title: 'Updated Title'
      });

      const { component } = render(SessionPreview, { props: { session: mockSession } });

      const updatedHandler = vi.fn();
      component.$on('updated', updatedHandler);

      const editButton = screen.getByLabelText('Edit session title');
      await fireEvent.click(editButton);
      await tick();

      const input = screen.getByLabelText('Session Title');
      await fireEvent.input(input, { target: { value: 'Updated Title' } });
      await tick();

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      await fireEvent.click(saveButton);
      await tick();

      expect(updatedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { sessionId: 'session-123' }
        })
      );
    });

    it('should disable Save button when title is empty', async () => {
      render(SessionPreview, { props: { session: mockSession } });

      const editButton = screen.getByLabelText('Edit session title');
      await fireEvent.click(editButton);
      await tick();

      const input = screen.getByLabelText('Session Title');
      await fireEvent.input(input, { target: { value: '' } });
      await tick();

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      expect(saveButton).toBeDisabled();
    });

    it('should disable Save button when title is unchanged', async () => {
      render(SessionPreview, { props: { session: mockSession } });

      const editButton = screen.getByLabelText('Edit session title');
      await fireEvent.click(editButton);
      await tick();

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      expect(saveButton).toBeDisabled();
    });

    it('should show character count in edit modal', async () => {
      render(SessionPreview, { props: { session: mockSession } });

      const editButton = screen.getByLabelText('Edit session title');
      await fireEvent.click(editButton);
      await tick();

      expect(screen.getByText(/12\/500 characters/i)).toBeInTheDocument();
    });
  });

  describe('Delete Session Functionality', () => {
    it('should open delete confirmation modal when delete button is clicked', async () => {
      render(SessionPreview, { props: { session: mockSession } });

      const deleteButton = screen.getByLabelText('Delete session');
      await fireEvent.click(deleteButton);
      await tick();

      // Modal title should be present
      expect(screen.getByRole('heading', { name: 'Delete Session' })).toBeInTheDocument();
    });

    it('should display warning message in delete modal', async () => {
      render(SessionPreview, { props: { session: mockSession } });

      const deleteButton = screen.getByLabelText('Delete session');
      await fireEvent.click(deleteButton);
      await tick();

      expect(screen.getByText(/⚠️ Warning: This action cannot be undone/i)).toBeInTheDocument();
    });

    it('should display session details in delete confirmation', async () => {
      render(SessionPreview, { props: { session: mockSession } });

      const deleteButton = screen.getByLabelText('Delete session');
      await fireEvent.click(deleteButton);
      await tick();

      // Title appears twice - once in main view, once in modal
      const titles = screen.getAllByText('Test Session');
      expect(titles.length).toBeGreaterThan(0);
      expect(screen.getByText(/15 messages/i)).toBeInTheDocument();
    });

    it('should close delete modal when Cancel is clicked', async () => {
      render(SessionPreview, { props: { session: mockSession } });

      const deleteButton = screen.getByLabelText('Delete session');
      await fireEvent.click(deleteButton);
      await tick();

      expect(screen.getAllByText('Delete Session').length).toBeGreaterThan(0);

      const cancelButtons = screen.getAllByRole('button', { name: /Cancel/i });
      await fireEvent.click(cancelButtons[0]);
      await tick();

      // Modal title should not be present after closing
      expect(screen.queryByRole('heading', { name: 'Delete Session' })).not.toBeInTheDocument();
    });

    it('should call deleteSession when Delete Session is clicked', async () => {
      sessionStore.deleteSession.mockResolvedValue(true);

      render(SessionPreview, { props: { session: mockSession } });

      const deleteButton = screen.getByLabelText('Delete session');
      await fireEvent.click(deleteButton);
      await tick();

      const confirmButtons = screen.getAllByRole('button', { name: /Delete Session/i });
      // The second button is the one in the modal
      await fireEvent.click(confirmButtons[confirmButtons.length - 1]);
      await tick();

      expect(sessionStore.deleteSession).toHaveBeenCalledWith('session-123');
    });

    it('should emit deleted event after successful deletion', async () => {
      sessionStore.deleteSession.mockResolvedValue(true);

      const { component } = render(SessionPreview, { props: { session: mockSession } });

      const deletedHandler = vi.fn();
      component.$on('deleted', deletedHandler);

      const deleteButton = screen.getByLabelText('Delete session');
      await fireEvent.click(deleteButton);
      await tick();

      const confirmButtons = screen.getAllByRole('button', { name: /Delete Session/i });
      // The second button is the one in the modal
      await fireEvent.click(confirmButtons[confirmButtons.length - 1]);
      await tick();

      expect(deletedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { sessionId: 'session-123' }
        })
      );
    });

    it('should show loading state during deletion', async () => {
      let resolveDelete;
      sessionStore.deleteSession.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveDelete = resolve;
          })
      );

      render(SessionPreview, { props: { session: mockSession } });

      const deleteButton = screen.getByLabelText('Delete session');
      await fireEvent.click(deleteButton);
      await tick();

      const confirmButtons = screen.getAllByRole('button', { name: /Delete Session/i });
      // The second button is the one in the modal
      await fireEvent.click(confirmButtons[confirmButtons.length - 1]);
      await tick();

      expect(screen.getByText('Deleting...')).toBeInTheDocument();

      // Clean up
      resolveDelete(true);
      await tick();
    });
  });

  describe('Date Formatting', () => {
    it('should format recent dates as relative time', () => {
      const recentSession = {
        ...mockSession,
        updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes ago
      };

      render(SessionPreview, { props: { session: recentSession } });

      expect(screen.getByText(/30 minutes ago/i)).toBeInTheDocument();
    });

    it('should format dates from hours ago', () => {
      const hoursAgoSession = {
        ...mockSession,
        updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() // 5 hours ago
      };

      render(SessionPreview, { props: { session: hoursAgoSession } });

      expect(screen.getByText(/5 hours ago/i)).toBeInTheDocument();
    });

    it('should format dates from days ago', () => {
      const daysAgoSession = {
        ...mockSession,
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
      };

      render(SessionPreview, { props: { session: daysAgoSession } });

      expect(screen.getByText(/3 days ago/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for action buttons', () => {
      render(SessionPreview, { props: { session: mockSession } });

      expect(screen.getByLabelText('Edit session title')).toBeInTheDocument();
      expect(screen.getByLabelText('Delete session')).toBeInTheDocument();
    });

    it('should have proper button roles', () => {
      render(SessionPreview, { props: { session: mockSession } });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should have autofocus on input in edit modal', async () => {
      render(SessionPreview, { props: { session: mockSession } });

      const editButton = screen.getByLabelText('Edit session title');
      await fireEvent.click(editButton);
      await tick();

      const input = screen.getByLabelText('Session Title');
      expect(input).toHaveAttribute('autofocus');
    });
  });
});
