/**
 * Resource Monitor for LLM Providers
 * 
 * This class monitors system resources to help determine when to switch providers.
 * It's primarily used to decide when to switch from local LLM to cloud LLM
 * based on resource constraints.
 */

import { RESOURCE_CONFIG } from '$lib/config/llm';

/**
 * Resource Monitor class
 */
export class ResourceMonitor {
  /**
   * Initialize the resource monitor
   * @param {Object} config - Resource monitoring configuration
   */
  constructor(config = RESOURCE_CONFIG) {
    this.config = config;
    this.memoryThreshold = config.MEMORY_THRESHOLD;
    this.cpuThreshold = config.CPU_THRESHOLD;
    this.checkInterval = config.CHECK_INTERVAL;
    this.isMonitoring = false;
    this.listeners = [];
    this.lastMemoryUsage = 0;
    this.lastCpuUsage = 0;
  }

  /**
   * Start monitoring resources
   */
  startMonitoring() {
    if (this.isMonitoring) {
      return;
    }
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.checkResources();
    }, this.checkInterval);
    
    console.log('Resource monitoring started');
  }

  /**
   * Stop monitoring resources
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }
    
    clearInterval(this.monitoringInterval);
    this.isMonitoring = false;
    console.log('Resource monitoring stopped');
  }

  /**
   * Check current resource usage
   * @private
   */
  async checkResources() {
    try {
      const memoryUsage = await this.getMemoryUsage();
      const cpuUsage = await this.getCpuUsage();
      
      this.lastMemoryUsage = memoryUsage;
      this.lastCpuUsage = cpuUsage;
      
      // Notify listeners if thresholds are exceeded
      if (memoryUsage > this.memoryThreshold || cpuUsage > this.cpuThreshold) {
        this.notifyListeners({
          memoryUsage,
          cpuUsage,
          memoryThresholdExceeded: memoryUsage > this.memoryThreshold,
          cpuThresholdExceeded: cpuUsage > this.cpuThreshold
        });
      }
    } catch (error) {
      console.error('Error checking resources:', error);
    }
  }

  /**
   * Get current memory usage
   * @returns {Promise<number>} - Memory usage in MB
   */
  async getMemoryUsage() {
    // In a browser environment, we can use performance.memory
    // but it's only available in Chrome and requires secure context
    if (typeof performance !== 'undefined' && performance.memory) {
      return Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
    }
    
    // For server-side or when performance.memory is not available,
    // we'll return a simulated value for demonstration
    // In a real implementation, this would use Node.js process.memoryUsage()
    return 500; // Simulated 500MB usage
  }

  /**
   * Get current CPU usage
   * @returns {Promise<number>} - CPU usage as a value between 0 and 1
   */
  async getCpuUsage() {
    // In a browser environment, there's no direct way to measure CPU usage
    // For demonstration, we'll return a simulated value
    // In a real implementation, this would use system-specific APIs
    return 0.3; // Simulated 30% CPU usage
  }

  /**
   * Check if resources are constrained
   * @returns {Promise<boolean>} - True if resources are constrained
   */
  async areResourcesConstrained() {
    const memoryUsage = await this.getMemoryUsage();
    const cpuUsage = await this.getCpuUsage();
    
    return memoryUsage > this.memoryThreshold || cpuUsage > this.cpuThreshold;
  }

  /**
   * Add a listener for resource constraint events
   * @param {Function} listener - Callback function
   */
  addListener(listener) {
    this.listeners.push(listener);
  }

  /**
   * Remove a listener
   * @param {Function} listener - Callback function to remove
   */
  removeListener(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * Notify all listeners of resource constraints
   * @param {Object} data - Resource usage data
   * @private
   */
  notifyListeners(data) {
    this.listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('Error in resource monitor listener:', error);
      }
    });
  }

  /**
   * Get current resource usage
   * @returns {Object} - Current resource usage
   */
  getCurrentUsage() {
    return {
      memory: this.lastMemoryUsage,
      cpu: this.lastCpuUsage,
      timestamp: new Date()
    };
  }
}