/**
 * Agent Context Manager
 *
 * This service manages conversation context for individual agents,
 * including material access, conversation history, and agent-specific state.
 */

export class AgentContextManager {
  constructor(graphRAGProcessor = null) {
    this.graphRAGProcessor = graphRAGProcessor;
    this.agentContexts = new Map(); // agentId -> context
    this.conversationHistories = new Map(); // agentId -> history
    this.materialAccess = new Map(); // agentId -> accessible materials
  }

  /**
   * Initialize context for an agent
   * @param {Object} agent - Agent configuration
   * @param {Object} subject - Subject the agent belongs to
   * @returns {Object} Initialized context
   */
  initializeAgentContext(agent, subject) {
    const context = {
      agentId: agent.id,
      agentName: agent.name,
      agentType: agent.type,
      instructions: agent.instructions,
      subjectId: subject.id,
      subjectName: subject.name,
      configuration: agent.configuration || {},
      accessibleMaterials: this.getAccessibleMaterials(agent, subject),
      conversationHistory: [],
      metadata: {
        createdAt: new Date(),
        lastUpdated: new Date(),
        messageCount: 0,
        averageResponseTime: 0
      }
    };

    this.agentContexts.set(agent.id, context);
    this.conversationHistories.set(agent.id, []);
    this.materialAccess.set(agent.id, context.accessibleMaterials);

    return context;
  }

  /**
   * Get context for a specific agent
   * @param {string} agentId - Agent ID
   * @returns {Object|null} Agent context or null if not found
   */
  getAgentContext(agentId) {
    return this.agentContexts.get(agentId) || null;
  }

  /**
   * Update agent context
   * @param {string} agentId - Agent ID
   * @param {Object} updates - Context updates
   * @returns {Object} Updated context
   */
  updateAgentContext(agentId, updates) {
    const context = this.agentContexts.get(agentId);
    if (!context) {
      throw new Error(`Agent context not found: ${agentId}`);
    }

    const updatedContext = {
      ...context,
      ...updates,
      metadata: {
        ...context.metadata,
        lastUpdated: new Date()
      }
    };

    this.agentContexts.set(agentId, updatedContext);
    return updatedContext;
  }

  /**
   * Add message to agent's conversation history
   * @param {string} agentId - Agent ID
   * @param {Object} message - Message to add
   * @param {string} role - Message role ('user' or 'assistant')
   */
  addToConversationHistory(agentId, message, role) {
    let history = this.conversationHistories.get(agentId) || [];

    const historyEntry = {
      role,
      content: message.content || message,
      timestamp: new Date(),
      messageId: message.id || Date.now().toString(),
      metadata: message.metadata || {}
    };

    history.push(historyEntry);

    // Keep only last 50 messages to prevent memory issues
    if (history.length > 50) {
      history = history.slice(-50);
    }

    this.conversationHistories.set(agentId, history);

    // Update context metadata
    const context = this.agentContexts.get(agentId);
    if (context) {
      context.metadata.messageCount = history.length;
      context.metadata.lastUpdated = new Date();
      this.agentContexts.set(agentId, context);
    }
  }

  /**
   * Get conversation history for an agent
   * @param {string} agentId - Agent ID
   * @param {number} limit - Maximum number of messages to return
   * @returns {Object[]} Conversation history
   */
  getConversationHistory(agentId, limit = 20) {
    const history = this.conversationHistories.get(agentId) || [];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Get accessible materials for an agent
   * @param {Object} agent - Agent configuration
   * @param {Object} subject - Subject configuration
   * @returns {Object[]} Accessible materials
   */
  getAccessibleMaterials(agent, subject) {
    if (!subject.materials || subject.materials.length === 0) {
      return [];
    }

    return subject.materials.filter((material) => {
      // Check if material is assigned to all agents
      if (material.assignments?.allAgents) {
        return true;
      }

      // Check if material is specifically assigned to this agent
      if (material.assignments?.specificAgents?.includes(agent.id)) {
        return true;
      }

      return false;
    });
  }

  /**
   * Query relevant materials for an agent's response
   * @param {string} agentId - Agent ID
   * @param {string} query - User query
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Object[]>} Relevant materials
   */
  async queryRelevantMaterials(agentId, query, limit = 5) {
    try {
      const context = this.agentContexts.get(agentId);
      if (!context) {
        return [];
      }

      const accessibleMaterials = this.materialAccess.get(agentId) || [];
      if (accessibleMaterials.length === 0) {
        return [];
      }

      // If GraphRAG is available, use it for intelligent querying
      if (this.graphRAGProcessor) {
        const queryResult = await this.graphRAGProcessor.queryGraphRAG(query, context.subjectId, [
          agentId
        ]);

        if (queryResult.success && queryResult.results.length > 0) {
          return queryResult.results.slice(0, limit);
        }
      }

      // Fallback: simple keyword matching
      const queryTerms = query.toLowerCase().split(' ');
      const relevantMaterials = accessibleMaterials.filter((material) => {
        const content = (material.content || '').toLowerCase();
        const fileName = (material.fileName || '').toLowerCase();

        return queryTerms.some((term) => content.includes(term) || fileName.includes(term));
      });

      return relevantMaterials.slice(0, limit);
    } catch (error) {
      console.error('Error querying relevant materials:', error);
      return [];
    }
  }

  /**
   * Prepare context for agent response generation
   * @param {string} agentId - Agent ID
   * @param {string} userMessage - User's message
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Prepared context
   */
  async prepareResponseContext(agentId, userMessage, options = {}) {
    try {
      const context = this.agentContexts.get(agentId);
      if (!context) {
        throw new Error(`Agent context not found: ${agentId}`);
      }

      // Get relevant materials
      const relevantMaterials = await this.queryRelevantMaterials(
        agentId,
        userMessage,
        options.materialLimit || 3
      );

      // Get recent conversation history
      const conversationHistory = this.getConversationHistory(agentId, options.historyLimit || 10);

      // Build context string
      let contextString = context.instructions + '\n\n';

      // Add subject information
      contextString += `Subject: ${context.subjectName}\n`;
      contextString += `Your role: ${context.agentName}\n\n`;

      // Add relevant materials
      if (relevantMaterials.length > 0) {
        contextString += 'Relevant reference materials:\n';
        relevantMaterials.forEach((material, index) => {
          contextString += `${index + 1}. ${material.fileName || 'Material'}: `;
          contextString += `${(material.content || '').substring(0, 200)}...\n`;
        });
        contextString += '\n';
      }

      // Add conversation history
      if (conversationHistory.length > 0) {
        contextString += 'Recent conversation:\n';
        conversationHistory.forEach((entry) => {
          const role = entry.role === 'user' ? 'User' : context.agentName;
          contextString += `${role}: ${entry.content}\n`;
        });
        contextString += '\n';
      }

      // Add current user message
      contextString += `Current user message: ${userMessage}`;

      return {
        contextString,
        relevantMaterials,
        conversationHistory,
        agentConfig: context.configuration,
        metadata: {
          agentId,
          agentName: context.agentName,
          agentType: context.agentType,
          materialCount: relevantMaterials.length,
          historyLength: conversationHistory.length
        }
      };
    } catch (error) {
      console.error('Error preparing response context:', error);
      throw error;
    }
  }

  /**
   * Update material access for an agent
   * @param {string} agentId - Agent ID
   * @param {Object[]} materials - Updated materials list
   */
  updateMaterialAccess(agentId, materials) {
    const context = this.agentContexts.get(agentId);
    if (!context) {
      return;
    }

    const accessibleMaterials = materials.filter((material) => {
      if (material.assignments?.allAgents) {
        return true;
      }
      return material.assignments?.specificAgents?.includes(agentId);
    });

    this.materialAccess.set(agentId, accessibleMaterials);

    // Update context
    this.updateAgentContext(agentId, {
      accessibleMaterials,
      metadata: {
        ...context.metadata,
        materialCount: accessibleMaterials.length
      }
    });
  }

  /**
   * Get agent performance metrics
   * @param {string} agentId - Agent ID
   * @returns {Object} Performance metrics
   */
  getAgentMetrics(agentId) {
    const context = this.agentContexts.get(agentId);
    const history = this.conversationHistories.get(agentId) || [];

    if (!context) {
      return null;
    }

    // Calculate metrics
    const totalMessages = history.length;
    const userMessages = history.filter((h) => h.role === 'user').length;
    const assistantMessages = history.filter((h) => h.role === 'assistant').length;

    // Calculate average response time (if available in metadata)
    const responseTimes = history
      .filter((h) => h.metadata?.responseTime)
      .map((h) => h.metadata.responseTime);

    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;

    return {
      agentId,
      agentName: context.agentName,
      agentType: context.agentType,
      totalMessages,
      userMessages,
      assistantMessages,
      averageResponseTime,
      materialCount: context.accessibleMaterials?.length || 0,
      lastActive: context.metadata.lastUpdated,
      createdAt: context.metadata.createdAt
    };
  }

  /**
   * Clear context for an agent
   * @param {string} agentId - Agent ID
   */
  clearAgentContext(agentId) {
    this.agentContexts.delete(agentId);
    this.conversationHistories.delete(agentId);
    this.materialAccess.delete(agentId);
  }

  /**
   * Clear all contexts
   */
  clearAllContexts() {
    this.agentContexts.clear();
    this.conversationHistories.clear();
    this.materialAccess.clear();
  }

  /**
   * Export agent context for persistence
   * @param {string} agentId - Agent ID
   * @returns {Object} Exportable context data
   */
  exportAgentContext(agentId) {
    const context = this.agentContexts.get(agentId);
    const history = this.conversationHistories.get(agentId);
    const materials = this.materialAccess.get(agentId);

    if (!context) {
      return null;
    }

    return {
      context,
      history: history || [],
      materials: materials || [],
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import agent context from exported data
   * @param {string} agentId - Agent ID
   * @param {Object} exportedData - Exported context data
   */
  importAgentContext(agentId, exportedData) {
    if (exportedData.context) {
      this.agentContexts.set(agentId, exportedData.context);
    }

    if (exportedData.history) {
      this.conversationHistories.set(agentId, exportedData.history);
    }

    if (exportedData.materials) {
      this.materialAccess.set(agentId, exportedData.materials);
    }
  }

  /**
   * Get summary of all agent contexts
   * @returns {Object} Summary of all contexts
   */
  getContextSummary() {
    const summary = {
      totalAgents: this.agentContexts.size,
      agents: [],
      totalMessages: 0,
      totalMaterials: 0
    };

    for (const [agentId, context] of this.agentContexts.entries()) {
      const history = this.conversationHistories.get(agentId) || [];
      const materials = this.materialAccess.get(agentId) || [];

      summary.agents.push({
        agentId,
        agentName: context.agentName,
        agentType: context.agentType,
        messageCount: history.length,
        materialCount: materials.length,
        lastActive: context.metadata.lastUpdated
      });

      summary.totalMessages += history.length;
      summary.totalMaterials += materials.length;
    }

    return summary;
  }
}
