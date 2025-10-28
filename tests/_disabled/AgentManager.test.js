import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/svelte';
import AgentManager from '$lib/modules/subjects/components/AgentManager.svelte';

describe('AgentManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state correctly', () => {
    render(AgentManager, {
      props: {
        agents: [],
        orchestrationAgent: null
      }
    });

    expect(screen.getByText('Agent Management')).toBeInTheDocument();
    expect(screen.getByText('No agents configured yet')).toBeInTheDocument();
    expect(screen.getByText('Add your first agent to get started')).toBeInTheDocument();
  });

  it('displays existing agents', () => {
    const mockAgents = [
      {
        id: 'agent1',
        name: 'Grammar Tutor',
        description: 'Helps with grammar',
        instructions: 'Focus on grammar rules',
        systemPrompt: 'You are a grammar tutor',
        ragEnabled: true,
        communicationStyle: {
          tone: 'professional',
          formality: 'formal',
          responseLength: 'detailed'
        }
      }
    ];

    render(AgentManager, {
      props: {
        agents: mockAgents,
        orchestrationAgent: null
      }
    });

    expect(screen.getByText('Grammar Tutor')).toBeInTheDocument();
    expect(screen.getByText('Helps with grammar')).toBeInTheDocument();
    expect(screen.getByText('RAG Enabled')).toBeInTheDocument();
  });

  it('shows orchestration section when needed', () => {
    const mockAgents = [
      { id: 'agent1', name: 'Agent 1', description: 'First agent' },
      { id: 'agent2', name: 'Agent 2', description: 'Second agent' }
    ];

    const mockOrchestration = {
      id: 'orch1',
      name: 'Orchestration',
      description: 'Coordinates agents',
      pipelineDescription: 'Manages agent workflow'
    };

    render(AgentManager, {
      props: {
        agents: mockAgents,
        orchestrationAgent: mockOrchestration
      }
    });

    expect(screen.getByText('Orchestration Agent')).toBeInTheDocument();
    expect(screen.getByText('Coordinates agents')).toBeInTheDocument();
  });

  it('opens add agent modal', async () => {
    render(AgentManager, {
      props: {
        agents: [],
        orchestrationAgent: null
      }
    });

    const addButton = screen.getByText('Add Agent');
    await fireEvent.click(addButton);

    expect(screen.getByText('Add New Agent')).toBeInTheDocument();
    expect(screen.getByLabelText(/Agent Name/)).toBeInTheDocument();
  });

  it('validates agent form', async () => {
    render(AgentManager, {
      props: {
        agents: [],
        orchestrationAgent: null
      }
    });

    const addButton = screen.getByText('Add Agent');
    await fireEvent.click(addButton);

    const saveButton = screen.getByText('Add Agent');
    await fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Agent name is required')).toBeInTheDocument();
      expect(screen.getByText('Agent description is required')).toBeInTheDocument();
    });
  });

  it('emits add-agent event', async () => {
    const component = render(AgentManager, {
      props: {
        agents: [],
        orchestrationAgent: null
      }
    });

    let addEventData = null;
    component.$on('add-agent', (event) => {
      addEventData = event.detail;
    });

    const addButton = screen.getByText('Add Agent');
    await fireEvent.click(addButton);

    // Fill form
    await fireEvent.input(screen.getByLabelText(/Agent Name/), { target: { value: 'Test Agent' } });
    await fireEvent.input(screen.getByLabelText(/Description/), {
      target: { value: 'Test Description' }
    });
    await fireEvent.input(screen.getByLabelText(/Instructions/), {
      target: { value: 'Test Instructions' }
    });
    await fireEvent.input(screen.getByLabelText(/System Prompt/), {
      target: { value: 'Test Prompt' }
    });

    const saveButton = screen.getByText('Add Agent');
    await fireEvent.click(saveButton);

    expect(addEventData).toBeTruthy();
    expect(addEventData.agent.name).toBe('Test Agent');
    expect(addEventData.agent.description).toBe('Test Description');
  });

  it('emits delete-agent event', async () => {
    const mockAgents = [
      {
        id: 'agent1',
        name: 'Test Agent',
        description: 'Test Description'
      }
    ];

    // Mock window.confirm
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true)
    );

    const component = render(AgentManager, {
      props: {
        agents: mockAgents,
        orchestrationAgent: null
      }
    });

    let deleteEventData = null;
    component.$on('delete-agent', (event) => {
      deleteEventData = event.detail;
    });

    const deleteButton = screen.getByTitle('Delete');
    await fireEvent.click(deleteButton);

    expect(deleteEventData).toBeTruthy();
    expect(deleteEventData.agentId).toBe('agent1');
  });
});
