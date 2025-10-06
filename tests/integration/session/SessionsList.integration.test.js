/**
 * SessionsList Component Integration Tests
 * Tests the SessionsList component with real store interactions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import SessionsList from '../../../src/lib/modules/session/components/SessionsList.svelte';

describe('SessionsList Component Integration', () => {
  it('should render the component successfully', () => {
    const { container } = render(SessionsList);
    
    // Check that the component renders
    expect(container).toBeTruthy();
    expect(container.querySelector('.flex')).toBeTruthy();
  });

  it('should display the Sessions header', () => {
    render(SessionsList);
    
    const header = screen.getByText('Sessions');
    expect(header).toBeTruthy();
  });

  it('should display search input', () => {
    render(SessionsList);
    
    const searchInput = screen.getByPlaceholderText('Search sessions...');
    expect(searchInput).toBeTruthy();
  });

  it('should display New Session button', () => {
    render(SessionsList);
    
    const newButton = screen.getByLabelText('New Session');
    expect(newButton).toBeTruthy();
  });

  it('should display empty state by default', () => {
    render(SessionsList);
    
    const emptyMessage = screen.getByText('No sessions yet');
    expect(emptyMessage).toBeTruthy();
  });
});
