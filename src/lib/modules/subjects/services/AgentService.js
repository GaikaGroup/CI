/**
 * Agent Service
 *
 * This service handles CRUD operations for agents within courses,
 * including validation and orchestration requirement management.
 */

import {
  createAgent,
  validateAgentConfiguration,
  requiresOrchestrationAgent,
  hasOrchestrationAgent,
  createOrchestrationInstructions,
  AGENT_TYPES,
  getAgentById,
  updateAgent,
  removeAgent
} from '../agents.js';
import { validateAgent } from '../types.js';

/**
 * Agent Service class
 */
export class AgentService {
  constructor(courseService) {
    this.courseService = courseService;
  }

  /**
   * Create a new agent for a subject
   * @param {Object} agentData - Agent data
   * @param {string} subjectId - Subject ID
   * @returns {Promise<Object>} Created agent or error
   */
  async createAgent(agentData, subjectId) {
    try {
      // Get the course
      const courseResult = await this.courseService.getCourse(subjectId);
      if (!courseResult.success) {
        throw new Error('Subject not found');
      }

      const subject = courseResult.subject;

      // Create agent with subject ID
      const agent = createAgent({
        ...agentData,
        subjectId
      });

      // Validate agent
      const validation = validateAgent(agent);
      if (!validation.isValid) {
        throw new Error(`Agent validation failed: ${validation.errors.join(', ')}`);
      }

      // Add agent to subject
      const updatedAgents = [...subject.agents, agent];

      // Check if orchestration agent is needed
      const needsOrchestration = requiresOrchestrationAgent(updatedAgents);
      const hasOrchestration = hasOrchestrationAgent(updatedAgents) || subject.orchestrationAgent;

      if (needsOrchestration && !hasOrchestration) {
        throw new Error(
          'Adding this agent requires an orchestration agent. Please create an orchestration agent first.'
        );
      }

      // Update subject with new agent
      const updateResult = await this.subjectService.updateSubject(
        subjectId,
        { agents: updatedAgents },
        subject.creatorId,
        subject.creatorRole
      );

      if (!updateResult.success) {
        throw new Error(updateResult.error);
      }

      return {
        success: true,
        agent,
        message: 'Agent created successfully'
      };
    } catch (error) {
      console.error('Error creating agent:', error);
      return {
        success: false,
        error: error.message,
        agent: null
      };
    }
  }

  /**
   * Update an existing agent
   * @param {string} agentId - Agent ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Update result
   */
  async updateAgent(agentId, updates) {
    try {
      // Find the subject containing this agent
      const subjectResult = await this.findSubjectByAgentId(agentId);
      if (!subjectResult.success) {
        throw new Error('Agent not found');
      }

      const { subject } = subjectResult;

      // Update agent in subject's agents array
      const updatedAgents = updateAgent(subject.agents, agentId, updates);

      // Validate agent configuration
      const agentValidation = validateAgentConfiguration(updatedAgents, subject.orchestrationAgent);
      if (!agentValidation.isValid) {
        throw new Error(`Agent configuration invalid: ${agentValidation.errors.join(', ')}`);
      }

      // Get the updated agent for return
      const updatedAgent = updatedAgents.find((a) => a.id === agentId);

      // Update subject
      const updateResult = await this.subjectService.updateSubject(
        subject.id,
        { agents: updatedAgents },
        subject.creatorId,
        subject.creatorRole
      );

      if (!updateResult.success) {
        throw new Error(updateResult.error);
      }

      return {
        success: true,
        agent: updatedAgent,
        message: 'Agent updated successfully'
      };
    } catch (error) {
      console.error('Error updating agent:', error);
      return {
        success: false,
        error: error.message,
        agent: null
      };
    }
  }

  /**
   * Delete an agent
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteAgent(agentId) {
    try {
      // Find the subject containing this agent
      const subjectResult = await this.findSubjectByAgentId(agentId);
      if (!subjectResult.success) {
        throw new Error('Agent not found');
      }

      const { subject } = subjectResult;

      // Remove agent from subject's agents array
      const updatedAgents = removeAgent(subject.agents, agentId);

      // If we're removing the last subject agent and there's an orchestration agent, remove it too
      const subjectAgents = updatedAgents.filter((a) => a.type === AGENT_TYPES.SUBJECT);
      let orchestrationAgent = subject.orchestrationAgent;

      if (subjectAgents.length <= 1 && orchestrationAgent) {
        orchestrationAgent = null;
      }

      // Update subject
      const updateResult = await this.subjectService.updateSubject(
        subject.id,
        {
          agents: updatedAgents,
          orchestrationAgent
        },
        subject.creatorId,
        subject.creatorRole
      );

      if (!updateResult.success) {
        throw new Error(updateResult.error);
      }

      return {
        success: true,
        message: 'Agent deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting agent:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate agent configuration for a subject
   * @param {Object} agentData - Agent data to validate
   * @returns {Object} Validation result
   */
  validateAgentConfiguration(agentData) {
    return validateAgent(agentData);
  }

  /**
   * Check orchestration requirement for a subject
   * @param {string} subjectId - Subject ID
   * @returns {Promise<Object>} Orchestration requirement result
   */
  async checkOrchestrationRequirement(subjectId) {
    try {
      const subjectResult = await this.subjectService.getSubject(subjectId);
      if (!subjectResult.success) {
        throw new Error('Subject not found');
      }

      const subject = subjectResult.subject;
      const needsOrchestration = requiresOrchestrationAgent(subject.agents);
      const hasOrchestration = hasOrchestrationAgent(subject.agents) || subject.orchestrationAgent;

      return {
        success: true,
        needsOrchestration,
        hasOrchestration,
        isValid: !needsOrchestration || hasOrchestration
      };
    } catch (error) {
      console.error('Error checking orchestration requirement:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create an orchestration agent for a subject
   * @param {string} subjectId - Subject ID
   * @param {Object} orchestrationData - Orchestration agent data
   * @returns {Promise<Object>} Created orchestration agent or error
   */
  async createOrchestrationAgent(subjectId, orchestrationData = {}) {
    try {
      const subjectResult = await this.subjectService.getSubject(subjectId);
      if (!subjectResult.success) {
        throw new Error('Subject not found');
      }

      const subject = subjectResult.subject;
      const subjectAgents = subject.agents.filter((agent) => agent.type === AGENT_TYPES.SUBJECT);

      // Generate default instructions if not provided
      const instructions =
        orchestrationData.instructions || createOrchestrationInstructions(subjectAgents);

      // Create orchestration agent
      const orchestrationAgent = createAgent({
        name: orchestrationData.name || `${subject.name} Orchestrator`,
        type: AGENT_TYPES.ORCHESTRATION,
        instructions,
        subjectId,
        ...orchestrationData
      });

      // Validate orchestration agent
      const validation = validateAgent(orchestrationAgent);
      if (!validation.isValid) {
        throw new Error(`Orchestration agent validation failed: ${validation.errors.join(', ')}`);
      }

      // Update subject with orchestration agent
      const updateResult = await this.subjectService.updateSubject(
        subjectId,
        { orchestrationAgent },
        subject.creatorId,
        subject.creatorRole
      );

      if (!updateResult.success) {
        throw new Error(updateResult.error);
      }

      return {
        success: true,
        agent: orchestrationAgent,
        message: 'Orchestration agent created successfully'
      };
    } catch (error) {
      console.error('Error creating orchestration agent:', error);
      return {
        success: false,
        error: error.message,
        agent: null
      };
    }
  }

  /**
   * Find subject by agent ID
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>} Subject and agent or error
   */
  async findSubjectByAgentId(agentId) {
    try {
      const subjectsResult = await this.subjectService.listSubjects();
      if (!subjectsResult.success) {
        throw new Error('Failed to load subjects');
      }

      for (const subject of subjectsResult.subjects) {
        const agent = getAgentById(subject.agents, agentId);
        if (agent) {
          return {
            success: true,
            subject,
            agent
          };
        }

        // Check orchestration agent
        if (subject.orchestrationAgent && subject.orchestrationAgent.id === agentId) {
          return {
            success: true,
            subject,
            agent: subject.orchestrationAgent
          };
        }
      }

      return {
        success: false,
        error: 'Agent not found'
      };
    } catch (error) {
      console.error('Error finding subject by agent ID:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get agents for a subject
   * @param {string} subjectId - Subject ID
   * @returns {Promise<Object>} Agents list or error
   */
  async getAgentsForSubject(subjectId) {
    try {
      const subjectResult = await this.subjectService.getSubject(subjectId);
      if (!subjectResult.success) {
        throw new Error('Subject not found');
      }

      const subject = subjectResult.subject;
      const agents = [...subject.agents];

      if (subject.orchestrationAgent) {
        agents.push(subject.orchestrationAgent);
      }

      return {
        success: true,
        agents,
        subjectAgents: subject.agents.filter((a) => a.type === AGENT_TYPES.SUBJECT),
        orchestrationAgent: subject.orchestrationAgent
      };
    } catch (error) {
      console.error('Error getting agents for subject:', error);
      return {
        success: false,
        error: error.message,
        agents: []
      };
    }
  }
}
