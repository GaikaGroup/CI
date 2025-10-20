/**
 * Agent Management Module
 *
 * This module provides utilities for managing AI agents within courses,
 * including validation, configuration, and orchestration requirements.
 */

import { validateAgent } from './types.js';

/**
 * Agent types enumeration
 */
export const AGENT_TYPES = {
  COURSE: 'course',
  ORCHESTRATION: 'orchestration'
};

/**
 * Default agent configuration
 */
export const DEFAULT_AGENT_CONFIG = {
  model: 'gpt-4-turbo',
  temperature: 0.7,
  maxTokens: 4000
};

/**
 * Create a new agent with default values
 * @param {Object} agentData - Agent data
 * @returns {Object} Complete agent object
 */
export function createAgent(agentData) {
  return {
    id: agentData.id || generateAgentId(),
    name: agentData.name || '',
    type: agentData.type || AGENT_TYPES.COURSE,
    instructions: agentData.instructions || '',
    courseId: agentData.courseId || '',
    assignedMaterials: agentData.assignedMaterials || [],
    configuration: {
      ...DEFAULT_AGENT_CONFIG,
      ...agentData.configuration
    },
    metadata: {
      createdAt: agentData.metadata?.createdAt || new Date(),
      updatedAt: agentData.metadata?.updatedAt || new Date()
    }
  };
}

/**
 * Check if a course requires an orchestration agent
 * @param {Object[]} agents - Array of agents
 * @returns {boolean} True if orchestration agent is required
 */
export function requiresOrchestrationAgent(agents) {
  if (!Array.isArray(agents)) {
    return false;
  }

  const courseAgents = agents.filter((agent) => agent.type === AGENT_TYPES.COURSE);
  return courseAgents.length > 1;
}

/**
 * Check if agents array has an orchestration agent
 * @param {Object[]} agents - Array of agents
 * @returns {boolean} True if orchestration agent exists
 */
export function hasOrchestrationAgent(agents) {
  if (!Array.isArray(agents)) {
    return false;
  }

  return agents.some((agent) => agent.type === AGENT_TYPES.ORCHESTRATION);
}

/**
 * Validate agent configuration for a course
 * @param {Object[]} agents - Array of agents
 * @param {Object} orchestrationAgent - Optional orchestration agent
 * @returns {Object} Validation result
 */
export function validateAgentConfiguration(agents, orchestrationAgent = null) {
  const errors = [];

  if (!Array.isArray(agents)) {
    return {
      isValid: false,
      errors: ['Agents must be an array']
    };
  }

  // Validate each agent
  agents.forEach((agent, index) => {
    const validation = validateAgent(agent);
    if (!validation.isValid) {
      errors.push(`Agent ${index + 1}: ${validation.errors.join(', ')}`);
    }
  });

  // Check orchestration requirements
  const courseAgents = agents.filter((agent) => agent.type === AGENT_TYPES.COURSE);
  const orchestrationAgents = agents.filter((agent) => agent.type === AGENT_TYPES.ORCHESTRATION);

  if (courseAgents.length > 1) {
    const totalOrchestrationAgents = orchestrationAgents.length + (orchestrationAgent ? 1 : 0);
    if (totalOrchestrationAgents === 0) {
      errors.push('Courses with multiple agents require an orchestration agent');
    } else if (totalOrchestrationAgents > 1) {
      errors.push('Only one orchestration agent is allowed per course');
    }
  }

  // Validate orchestration agent if provided
  if (orchestrationAgent) {
    const orchestrationValidation = validateAgent(orchestrationAgent);
    if (!orchestrationValidation.isValid) {
      errors.push(`Orchestration agent: ${orchestrationValidation.errors.join(', ')}`);
    }

    if (orchestrationAgent.type !== AGENT_TYPES.ORCHESTRATION) {
      errors.push('Orchestration agent must have type "orchestration"');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get agent by ID from an array of agents
 * @param {Object[]} agents - Array of agents
 * @param {string} agentId - Agent ID to find
 * @returns {Object|null} Found agent or null
 */
export function getAgentById(agents, agentId) {
  if (!Array.isArray(agents)) {
    return null;
  }

  return agents.find((agent) => agent.id === agentId) || null;
}

/**
 * Get agents by type
 * @param {Object[]} agents - Array of agents
 * @param {string} type - Agent type to filter by
 * @returns {Object[]} Filtered agents
 */
export function getAgentsByType(agents, type) {
  if (!Array.isArray(agents)) {
    return [];
  }

  return agents.filter((agent) => agent.type === type);
}

/**
 * Update agent in array
 * @param {Object[]} agents - Array of agents
 * @param {string} agentId - ID of agent to update
 * @param {Object} updates - Updates to apply
 * @returns {Object[]} Updated agents array
 */
export function updateAgent(agents, agentId, updates) {
  if (!Array.isArray(agents)) {
    return [];
  }

  return agents.map((agent) => {
    if (agent.id === agentId) {
      return {
        ...agent,
        ...updates,
        metadata: {
          ...agent.metadata,
          updatedAt: new Date()
        }
      };
    }
    return agent;
  });
}

/**
 * Remove agent from array
 * @param {Object[]} agents - Array of agents
 * @param {string} agentId - ID of agent to remove
 * @returns {Object[]} Updated agents array
 */
export function removeAgent(agents, agentId) {
  if (!Array.isArray(agents)) {
    return [];
  }

  return agents.filter((agent) => agent.id !== agentId);
}

/**
 * Create orchestration instructions template
 * @param {Object[]} courseAgents - Array of course agents
 * @returns {string} Template instructions for orchestration
 */
export function createOrchestrationInstructions(courseAgents) {
  if (!Array.isArray(courseAgents) || courseAgents.length === 0) {
    return 'You are an orchestration agent responsible for coordinating responses between multiple specialized agents.';
  }

  const agentDescriptions = courseAgents
    .map(
      (agent, index) =>
        `Agent ${index + 1} (${agent.name}): ${agent.instructions.substring(0, 100)}...`
    )
    .join('\n');

  return `You are an orchestration agent responsible for coordinating responses between ${courseAgents.length} specialized agents:

${agentDescriptions}

Your role is to:
1. Analyze user questions and determine which agent(s) should respond
2. Route questions to the appropriate agents
3. Coordinate multi-agent responses when needed
4. Ensure coherent and comprehensive answers
5. Manage conversation flow between agents

Always consider the expertise of each agent and route questions accordingly. For complex questions that span multiple domains, coordinate responses from multiple agents and synthesize them into a coherent answer.`;
}

/**
 * Generate unique agent ID
 * @returns {string} Unique agent identifier
 */
function generateAgentId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Legacy exports for backward compatibility
export const SUBJECT_TYPES = AGENT_TYPES; // For backward compatibility
