/**
 * Orchestration Service
 *
 * This service handles coordination between multiple agents in a subject,
 * managing conversation flow, routing messages, and aggregating responses.
 */

import { AGENT_TYPES } from '../agents.js';

/**
 * Orchestration Service class
 */
export class OrchestrationService {
  constructor(llmProviderManager, graphRAGProcessor = null) {
    this.llmProviderManager = llmProviderManager;
    this.graphRAGProcessor = graphRAGProcessor;
    this.conversationContexts = new Map(); // subjectId -> conversation context
  }

  /**
   * Coordinate agents for a user message
   * @param {string} subjectId - Subject ID
   * @param {string} userMessage - User's message
   * @param {Object} context - Conversation context
   * @returns {Promise<Object>} Coordinated response
   */
  async coordinateAgents(subjectId, userMessage, context) {
    try {
      const { subject, agents } = context;

      // If only one agent, route directly
      if (agents.length === 1) {
        return await this.routeToAgent(agents[0].id, userMessage, context);
      }

      // If multiple agents, use orchestration
      const orchestrationAgent = subject.orchestrationAgent;
      if (!orchestrationAgent) {
        throw new Error('Multiple agents require an orchestration agent');
      }

      // Get conversation history for this subject
      const conversationHistory = this.getConversationHistory(subjectId);

      // Prepare orchestration context
      const orchestrationContext = {
        userMessage,
        availableAgents: agents.filter((a) => a.type === AGENT_TYPES.SUBJECT),
        conversationHistory,
        subject
      };

      // Get orchestration decision
      const orchestrationDecision = await this.getOrchestrationDecision(
        orchestrationAgent,
        orchestrationContext,
        context
      );

      // Execute the orchestration decision
      return await this.executeOrchestrationDecision(orchestrationDecision, userMessage, context);
    } catch (error) {
      console.error('Error coordinating agents:', error);
      return {
        success: false,
        error: error.message,
        response: 'I apologize, but I encountered an error while processing your request.'
      };
    }
  }

  /**
   * Route message to a specific agent
   * @param {string} agentId - Agent ID
   * @param {string} message - Message to route
   * @param {Object} context - Context information
   * @returns {Promise<Object>} Agent response
   */
  async routeToAgent(agentId, message, context) {
    try {
      const { subject, agents } = context;
      const agent = agents.find((a) => a.id === agentId);

      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // Get relevant materials for this agent
      const relevantMaterials = await this.getRelevantMaterials(agent, message, subject);

      // Prepare agent context
      const agentContext = this.prepareAgentContext(agent, message, relevantMaterials, context);

      // Generate response using LLM
      const llmResponse = await this.generateAgentResponse(
        agent,
        agentContext,
        subject.llmSettings
      );

      // Update conversation history
      this.updateConversationHistory(subject.id, {
        agentId,
        userMessage: message,
        agentResponse: llmResponse.content,
        timestamp: new Date()
      });

      return {
        success: true,
        agentId,
        agentName: agent.name,
        response: llmResponse.content,
        materials: relevantMaterials,
        metadata: {
          model: llmResponse.model,
          tokens: llmResponse.usage
        }
      };
    } catch (error) {
      console.error('Error routing to agent:', error);
      return {
        success: false,
        error: error.message,
        response: 'I apologize, but I encountered an error while processing your request.'
      };
    }
  }

  /**
   * Aggregate responses from multiple agents
   * @param {Object[]} responses - Array of agent responses
   * @param {Object} orchestrationAgent - Orchestration agent
   * @param {Object} context - Context information
   * @returns {Promise<Object>} Aggregated response
   */
  async aggregateResponses(responses, orchestrationAgent, context) {
    try {
      // Prepare aggregation context
      const aggregationContext = {
        userMessage: context.userMessage,
        agentResponses: responses,
        subject: context.subject
      };

      // Create aggregation prompt
      const aggregationPrompt = this.createAggregationPrompt(aggregationContext);

      // Generate aggregated response
      const llmResponse = await this.generateAgentResponse(
        orchestrationAgent,
        aggregationPrompt,
        context.subject.llmSettings
      );

      return {
        success: true,
        response: llmResponse.content,
        contributingAgents: responses.map((r) => ({
          id: r.agentId,
          name: r.agentName
        })),
        metadata: {
          model: llmResponse.model,
          tokens: llmResponse.usage,
          aggregated: true
        }
      };
    } catch (error) {
      console.error('Error aggregating responses:', error);
      return {
        success: false,
        error: error.message,
        response: 'I apologize, but I encountered an error while aggregating the responses.'
      };
    }
  }

  /**
   * Manage conversation flow for a subject
   * @param {string} subjectId - Subject ID
   * @param {Object[]} conversationHistory - Conversation history
   * @returns {Object} Flow management result
   */
  manageConversationFlow(subjectId, conversationHistory) {
    try {
      // Analyze conversation patterns
      const analysis = this.analyzeConversationFlow(conversationHistory);

      // Determine next actions
      const recommendations = this.generateFlowRecommendations(analysis);

      // Update conversation context
      this.updateConversationContext(subjectId, {
        analysis,
        recommendations,
        lastUpdated: new Date()
      });

      return {
        success: true,
        analysis,
        recommendations
      };
    } catch (error) {
      console.error('Error managing conversation flow:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get orchestration decision from orchestration agent
   * @param {Object} orchestrationAgent - Orchestration agent
   * @param {Object} context - Orchestration context
   * @param {Object} globalContext - Global context
   * @returns {Promise<Object>} Orchestration decision
   */
  async getOrchestrationDecision(orchestrationAgent, context, globalContext) {
    const decisionPrompt = this.createOrchestrationPrompt(context);

    const llmResponse = await this.generateAgentResponse(
      orchestrationAgent,
      decisionPrompt,
      globalContext.subject.llmSettings
    );

    // Parse orchestration decision
    return this.parseOrchestrationDecision(llmResponse.content, context);
  }

  /**
   * Execute orchestration decision
   * @param {Object} decision - Orchestration decision
   * @param {string} userMessage - Original user message
   * @param {Object} context - Context information
   * @returns {Promise<Object>} Execution result
   */
  async executeOrchestrationDecision(decision, userMessage, context) {
    switch (decision.action) {
      case 'single_agent':
        return await this.routeToAgent(decision.agentId, userMessage, context);

      case 'multiple_agents': {
        const responses = [];
        for (const agentId of decision.agentIds) {
          const response = await this.routeToAgent(agentId, userMessage, context);
          if (response.success) {
            responses.push(response);
          }
        }
        return await this.aggregateResponses(responses, context.subject.orchestrationAgent, {
          ...context,
          userMessage
        });
      }

      case 'orchestration_only':
        return await this.routeToAgent(context.subject.orchestrationAgent.id, userMessage, context);

      default:
        throw new Error(`Unknown orchestration action: ${decision.action}`);
    }
  }

  /**
   * Get relevant materials for an agent
   * @param {Object} agent - Agent object
   * @param {string} message - User message
   * @param {Object} subject - Subject object
   * @returns {Promise<Object[]>} Relevant materials
   */
  async getRelevantMaterials(agent, message, subject) {
    try {
      // Get materials assigned to this agent
      const assignedMaterials =
        subject.materials?.filter((material) => {
          if (material.assignments.allAgents) {
            return true;
          }
          return material.assignments.specificAgents.includes(agent.id);
        }) || [];

      // If GraphRAG is available, query for relevant content
      if (this.graphRAGProcessor) {
        const queryResult = await this.graphRAGProcessor.queryGraphRAG(message, subject.id, [
          agent.id
        ]);

        if (queryResult.success && queryResult.results.length > 0) {
          return queryResult.results.slice(0, 5); // Limit to top 5 results
        }
      }

      // Fallback: return assigned materials
      return assignedMaterials.slice(0, 3); // Limit to prevent context overflow
    } catch (error) {
      console.error('Error getting relevant materials:', error);
      return [];
    }
  }

  /**
   * Prepare context for an agent
   * @param {Object} agent - Agent object
   * @param {string} message - User message
   * @param {Object[]} materials - Relevant materials
   * @param {Object} context - Global context
   * @returns {string} Formatted agent context
   */
  prepareAgentContext(agent, message, materials, context) {
    let agentContext = agent.instructions + '\n\n';

    // Add subject context
    agentContext += `Subject: ${context.subject.name}\n`;
    agentContext += `Description: ${context.subject.description}\n\n`;

    // Add relevant materials
    if (materials.length > 0) {
      agentContext += 'Relevant reference materials:\n';
      materials.forEach((material, index) => {
        agentContext += `${index + 1}. ${material.fileName || 'Material'}: ${material.content?.substring(0, 200) || 'No content'}...\n`;
      });
      agentContext += '\n';
    }

    // Add conversation history (last few exchanges)
    const history = this.getConversationHistory(context.subject.id);
    if (history.length > 0) {
      agentContext += 'Recent conversation:\n';
      history.slice(-3).forEach((entry) => {
        agentContext += `User: ${entry.userMessage}\n`;
        agentContext += `${entry.agentName || 'Agent'}: ${entry.agentResponse}\n\n`;
      });
    }

    agentContext += `Current user message: ${message}`;

    return agentContext;
  }

  /**
   * Generate response using LLM
   * @param {Object} agent - Agent object
   * @param {string} context - Agent context
   * @param {Object} llmSettings - LLM settings
   * @returns {Promise<Object>} LLM response
   */
  async generateAgentResponse(agent, context, llmSettings) {
    const messages = [
      {
        role: 'system',
        content: context
      }
    ];

    const options = {
      model: agent.configuration?.model || 'gpt-3.5-turbo',
      temperature: agent.configuration?.temperature || 0.7,
      max_tokens: agent.configuration?.maxTokens || 1000
    };

    // Respect subject LLM settings
    if (!llmSettings.allowOpenAI) {
      options.provider = 'ollama';
    }

    return await this.llmProviderManager.generateChatCompletion(messages, options);
  }

  /**
   * Create orchestration prompt
   * @param {Object} context - Orchestration context
   * @returns {string} Orchestration prompt
   */
  createOrchestrationPrompt(context) {
    let prompt = `You are an orchestration agent managing multiple specialized agents. 

Available agents:
${context.availableAgents
  .map((agent, index) => `${index + 1}. ${agent.name}: ${agent.instructions.substring(0, 100)}...`)
  .join('\n')}

User message: "${context.userMessage}"

Analyze the user's message and decide how to handle it:
1. If it's best handled by a single agent, respond with: SINGLE_AGENT: [agent_name]
2. If it requires multiple agents, respond with: MULTIPLE_AGENTS: [agent1_name, agent2_name]
3. If you should handle it directly, respond with: ORCHESTRATION_ONLY

Then provide a brief explanation of your decision.`;

    return prompt;
  }

  /**
   * Parse orchestration decision
   * @param {string} response - LLM response
   * @param {Object} context - Context information
   * @returns {Object} Parsed decision
   */
  parseOrchestrationDecision(response, context) {
    const lines = response.split('\n');
    const decisionLine = lines[0].toUpperCase();

    if (decisionLine.includes('SINGLE_AGENT:')) {
      const agentName = decisionLine.split('SINGLE_AGENT:')[1].trim();
      const agent = context.availableAgents.find((a) =>
        a.name.toLowerCase().includes(agentName.toLowerCase())
      );

      return {
        action: 'single_agent',
        agentId: agent?.id || context.availableAgents[0].id,
        explanation: lines.slice(1).join('\n')
      };
    }

    if (decisionLine.includes('MULTIPLE_AGENTS:')) {
      const agentNames = decisionLine
        .split('MULTIPLE_AGENTS:')[1]
        .split(',')
        .map((n) => n.trim());
      const agentIds = agentNames
        .map((name) => {
          const agent = context.availableAgents.find((a) =>
            a.name.toLowerCase().includes(name.toLowerCase())
          );
          return agent?.id;
        })
        .filter(Boolean);

      return {
        action: 'multiple_agents',
        agentIds: agentIds.length > 0 ? agentIds : context.availableAgents.map((a) => a.id),
        explanation: lines.slice(1).join('\n')
      };
    }

    return {
      action: 'orchestration_only',
      explanation: response
    };
  }

  /**
   * Create aggregation prompt
   * @param {Object} context - Aggregation context
   * @returns {string} Aggregation prompt
   */
  createAggregationPrompt(context) {
    let prompt = `You are coordinating responses from multiple specialized agents.

User's question: "${context.userMessage}"

Agent responses:
${context.agentResponses
  .map((response, index) => `${index + 1}. ${response.agentName}: ${response.response}`)
  .join('\n\n')}

Please synthesize these responses into a coherent, comprehensive answer that:
1. Addresses the user's question completely
2. Integrates insights from all relevant agents
3. Avoids redundancy
4. Maintains a natural conversational tone

Synthesized response:`;

    return prompt;
  }

  /**
   * Get conversation history for a subject
   * @param {string} subjectId - Subject ID
   * @returns {Object[]} Conversation history
   */
  getConversationHistory(subjectId) {
    const context = this.conversationContexts.get(subjectId);
    return context?.history || [];
  }

  /**
   * Update conversation history
   * @param {string} subjectId - Subject ID
   * @param {Object} entry - Conversation entry
   */
  updateConversationHistory(subjectId, entry) {
    let context = this.conversationContexts.get(subjectId) || { history: [] };

    context.history.push(entry);

    // Keep only last 20 entries to prevent memory issues
    if (context.history.length > 20) {
      context.history = context.history.slice(-20);
    }

    this.conversationContexts.set(subjectId, context);
  }

  /**
   * Update conversation context
   * @param {string} subjectId - Subject ID
   * @param {Object} updates - Context updates
   */
  updateConversationContext(subjectId, updates) {
    let context = this.conversationContexts.get(subjectId) || { history: [] };
    context = { ...context, ...updates };
    this.conversationContexts.set(subjectId, context);
  }

  /**
   * Analyze conversation flow
   * @param {Object[]} history - Conversation history
   * @returns {Object} Flow analysis
   */
  analyzeConversationFlow(history) {
    return {
      totalExchanges: history.length,
      agentDistribution: this.getAgentDistribution(history),
      averageResponseLength: this.getAverageResponseLength(history),
      topicProgression: this.analyzeTopicProgression(history)
    };
  }

  /**
   * Generate flow recommendations
   * @param {Object} analysis - Flow analysis
   * @returns {Object[]} Recommendations
   */
  generateFlowRecommendations(analysis) {
    const recommendations = [];

    if (analysis.totalExchanges > 10) {
      recommendations.push({
        type: 'summary',
        message: 'Consider providing a summary of the conversation so far'
      });
    }

    return recommendations;
  }

  /**
   * Get agent distribution in conversation
   * @param {Object[]} history - Conversation history
   * @returns {Object} Agent distribution
   */
  getAgentDistribution(history) {
    const distribution = {};
    history.forEach((entry) => {
      distribution[entry.agentId] = (distribution[entry.agentId] || 0) + 1;
    });
    return distribution;
  }

  /**
   * Get average response length
   * @param {Object[]} history - Conversation history
   * @returns {number} Average response length
   */
  getAverageResponseLength(history) {
    if (history.length === 0) return 0;
    const totalLength = history.reduce((sum, entry) => sum + entry.agentResponse.length, 0);
    return Math.round(totalLength / history.length);
  }

  /**
   * Analyze topic progression
   * @param {Object[]} history - Conversation history
   * @returns {Object} Topic progression analysis
   */
  analyzeTopicProgression(history) {
    // Simplified topic analysis
    return {
      hasProgression: history.length > 3,
      complexity: history.length > 5 ? 'high' : 'low'
    };
  }
}
