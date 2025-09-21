import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import SubjectEditMode from '$lib/modules/subjects/components/SubjectEditMode.svelte';

// Mock stores
vi.mock('$modules/auth/stores', () => ({
  user: {
    subscribe: vi.fn((callback) => {
      callback({ id: 'user1', role: 'user' });
      return () => {};
    })
  }
}));

describe('SubjectEditMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create mode correctly', () => {
    render(SubjectEditMode, {
      props: {
        subject: null,
        isNew: true
      }
    });

    expect(screen.getByText('Create New Subject')).toBeInTheDocument();
    expect(
      screen.getByText('Create a new learning subject with custom agents and materials')
    ).toBeInTheDocument();
  });

  it('renders edit mode correctly', () => {
    const mockSubject = {
      id: 'subject1',
      name: 'Test Subject',
      description: 'Test Description',
      language: 'English',
      level: 'B2',
      skills: ['reading', 'writing'],
      practice: {
        summary: 'Practice summary',
        instructions: 'Practice instructions',
        minWords: 100
      },
      exam: {
        summary: 'Exam summary',
        instructions: 'Exam instructions',
        minWords: 200
      },
      agents: [],
      materials: []
    };

    render(SubjectEditMode, {
      props: {
        subject: mockSubject,
        isNew: false
      }
    });

    expect(screen.getByText('Edit Test Subject')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Subject')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(SubjectEditMode, {
      props: {
        subject: null,
        isNew: true
      }
    });

    const saveButton = screen.getByText('Create Subject');
    await fireEvent.click(saveButton);

    expect(screen.getByText('Subject name is required')).toBeInTheDocument();
    expect(screen.getByText('Description is required')).toBeInTheDocument();
    expect(screen.getByText('Language is required')).toBeInTheDocument();
  });

  it('handles skill management', async () => {
    render(SubjectEditMode, {
      props: {
        subject: null,
        isNew: true
      }
    });

    const skillInput = screen.getByPlaceholderText('Add a skill...');
    const addButton = screen.getByText('Add');

    await fireEvent.input(skillInput, { target: { value: 'reading' } });
    await fireEvent.click(addButton);

    expect(screen.getByText('reading')).toBeInTheDocument();
  });

  it('emits save event with correct data', async () => {
    const component = render(SubjectEditMode, {
      props: {
        subject: null,
        isNew: true
      }
    });

    let saveEventData = null;
    component.$on('save', (event) => {
      saveEventData = event.detail;
    });

    // Fill required fields
    await fireEvent.input(screen.getByLabelText(/Subject Name/), {
      target: { value: 'Test Subject' }
    });
    await fireEvent.input(screen.getByLabelText(/Description/), {
      target: { value: 'Test Description' }
    });
    await fireEvent.input(screen.getByLabelText(/Language/), { target: { value: 'English' } });
    await fireEvent.input(screen.getByLabelText(/Summary.*Practice/), {
      target: { value: 'Practice summary' }
    });
    await fireEvent.input(screen.getByLabelText(/Instructions.*Practice/), {
      target: { value: 'Practice instructions' }
    });
    await fireEvent.input(screen.getByLabelText(/Summary.*Exam/), {
      target: { value: 'Exam summary' }
    });
    await fireEvent.input(screen.getByLabelText(/Instructions.*Exam/), {
      target: { value: 'Exam instructions' }
    });

    const saveButton = screen.getByText('Create Subject');
    await fireEvent.click(saveButton);

    expect(saveEventData).toBeTruthy();
    expect(saveEventData.subject.name).toBe('Test Subject');
    expect(saveEventData.subject.description).toBe('Test Description');
    expect(saveEventData.isNew).toBe(true);
  });

  it('emits cancel event', async () => {
    const component = render(SubjectEditMode, {
      props: {
        subject: null,
        isNew: true
      }
    });

    let cancelEmitted = false;
    component.$on('cancel', () => {
      cancelEmitted = true;
    });

    const cancelButton = screen.getByText('Cancel');
    await fireEvent.click(cancelButton);

    expect(cancelEmitted).toBe(true);
  });
});
