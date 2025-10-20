/**
 * Ollama Provider Implementation
 *
 * Implements the ProviderInterface for the Ollama API (local LLM).
 */

import { ProviderInterface } from './ProviderInterface';
import { OLLAMA_CONFIG } from '$lib/config/llm';

export class OllamaProvider extends ProviderInterface {
  /**
   * @param {Object} config - Ollama configuration (defaults to OLLAMA_CONFIG)
   */
  constructor(config = OLLAMA_CONFIG) {
    super(config);
    this.name = 'ollama';
    this.apiUrl = config.API_URL;
    this.config = config; // ensure we keep a reference for convenience
    this._resolvedModel = null;
  }

  /** Ping the Ollama daemon */
  async isAvailable() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${this.apiUrl}/api/tags`, { signal: controller.signal });
      clearTimeout(timeoutId);
      return res.ok;
    } catch (error) {
      console.error('Error checking Ollama availability:', error);
      return false;
    }
  }

  /** Resolve which model to use based on MODELS list and what’s installed */
  async resolveModel(explicitModel) {
    if (explicitModel) return explicitModel;
    if (this._resolvedModel) return this._resolvedModel;

    // Fetch installed tags
    const res = await fetch(`${this.apiUrl}/api/tags`, { method: 'GET' });
    if (!res.ok) throw new Error(`Failed to fetch Ollama tags: ${res.status} ${res.statusText}`);

    const data = await res.json().catch(() => ({}));
    const tags = Array.isArray(data?.models) ? data.models.map((m) => m.model) : [];

    // Preferred list (first = default)
    const preferred =
      Array.isArray(this.config.MODELS) && this.config.MODELS.length
        ? this.config.MODELS
        : [this.config.MODEL].filter(Boolean);

    // Exact match first
    let pick = preferred.find((p) => tags.includes(p));

    // Fuzzy (“qwen2.5” -> first “qwen2.5:*”) if not strict
    if (!pick && !this.config.STRICT) {
      const fuzzyBase = preferred.find((p) => tags.some((t) => t === p || t.startsWith(p + ':')));
      if (fuzzyBase) pick = tags.find((t) => t === fuzzyBase || t.startsWith(fuzzyBase + ':'));
    }

    if (!pick) {
      if (this.config.STRICT) {
        throw new Error(
          `Preferred Ollama models not found. Wanted [${preferred.join(', ')}], installed [${tags.join(', ')}]`
        );
      }
      pick = tags[0] || this.config.MODEL; // last resort
    }

    this._resolvedModel = pick;
    if (import.meta.env?.DEV) console.info('[Ollama] resolved model:', this._resolvedModel);
    return this._resolvedModel;
  }

  /**
   * Check if messages contain images
   */
  hasImages(messages) {
    return messages.some(m => {
      if (Array.isArray(m.content)) {
        return m.content.some(c => c.type === 'image_url');
      }
      return false;
    });
  }

  /**
   * Generate a chat completion (NON-streaming path).
   * Streams should be implemented in a separate method using NDJSON parsing.
   */
  async generateChatCompletion(messages, options = {}) {
    try {
      // Check if we need vision model (from options or by checking messages)
      const needsVision = options.hasImages || this.hasImages(messages);
      
      if (needsVision) {
        console.log('[Ollama] Using vision model:', this.config.VISION_MODEL);
      }
      
      const modelToUse = needsVision ? this.config.VISION_MODEL : options.model;
      
      const model = await this.resolveModel(modelToUse);
      const maxTokens = Number(options.maxTokens ?? this.config.MAX_TOKENS);
      const temperature = Number(options.temperature ?? this.config.TEMPERATURE);

      // Convert messages to Ollama format
      const ollamaMessages = messages.map((m) => {
        // Handle vision format (array content with text and images)
        if (Array.isArray(m.content)) {
          // Extract text and images
          const textParts = m.content.filter(c => c.type === 'text').map(c => c.text);
          const imageParts = m.content.filter(c => c.type === 'image_url');
          
          // For Ollama, combine text and add images separately
          // Remove data:image/...;base64, prefix if present
          const images = imageParts.map(img => {
            const url = img.image_url.url;
            // Remove data URL prefix to get pure base64
            if (url.startsWith('data:')) {
              const base64Index = url.indexOf('base64,');
              return base64Index !== -1 ? url.substring(base64Index + 7) : url;
            }
            return url;
          });
          
          return {
            role: m.role,
            content: textParts.join('\n'),
            images: images
          };
        }
        
        // Regular text message
        return { role: m.role, content: String(m.content) };
      });

      // Timeout guard
      const controller = new AbortController();
      const timeoutMs = Number(options.timeout ?? 30000);
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      // IMPORTANT: stream=false to get a single JSON object
      const payload = {
        model,
        messages: ollamaMessages,
        stream: false,
        options: {
          // memory-friendly defaults from config
          num_ctx: Number(this.config.NUM_CTX ?? 2048),
          num_predict: maxTokens,
          temperature,
          // sampling params
          repeat_penalty: this.config.PARAMETERS?.repeat_penalty ?? 1.1,
          top_p: this.config.PARAMETERS?.top_p ?? 0.9,
          top_k: this.config.PARAMETERS?.top_k ?? 40,
          // allow extra params to override
          ...(options.extraParams ?? {})
        }
      };

      const response = await fetch(`${this.apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        throw new Error(`Ollama API error ${response.status}: ${bodyText || response.statusText}`);
      }

      // Some proxies may still return NDJSON; handle both gracefully.
      const ctype = response.headers.get('content-type') || '';
      if (ctype.includes('application/json')) {
        const data = await response.json();
        return this.formatResponse(data);
      } else {
        const text = await response.text();
        let merged = '';
        for (const line of text.split('\n')) {
          const s = line.trim();
          if (!s) continue;
          try {
            const obj = JSON.parse(s);
            merged += obj?.message?.content ?? '';
          } catch {
            // ignore partial lines
          }
        }
        return {
          content: merged,
          provider: this.name,
          model,
          usage: { prompt_tokens: -1, completion_tokens: -1, total_tokens: -1 },
          finishReason: 'stop',
          raw: { ndjson: true }
        };
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Ollama request timed out');
      }
      throw this.handleError(error);
    }
  }

  /** List available models */
  async listModels() {
    try {
      const response = await fetch(`${this.apiUrl}/api/tags`, { method: 'GET' });
      if (!response.ok) throw new Error(`Failed to list models: ${response.statusText}`);
      const data = await response.json();
      // API returns { models: [{ model: "llama3.1:8b", ... }, ...] }
      return Array.isArray(data.models) ? data.models.map((m) => m.model) : [];
    } catch (error) {
      console.error('Error listing Ollama models:', error);
      return [this.config.MODEL].filter(Boolean);
    }
  }

  /** Normalize Ollama response */
  formatResponse(raw) {
    if (!raw || !raw.message) {
      throw new Error('Invalid response format from Ollama');
    }
    return {
      content: raw.message.content ?? '',
      provider: this.name,
      model: raw.model ?? this._resolvedModel ?? this.config.MODEL,
      usage: {
        prompt_tokens: -1,
        completion_tokens: -1,
        total_tokens: raw.total_tokens ?? -1
      },
      finishReason: raw.done ? 'stop' : null,
      raw
    };
  }

  /** Standardized error mapping */
  handleError(error) {
    const msg = String(error?.message ?? error);
    if (msg.includes('connection refused') || msg.includes('failed to fetch')) {
      return new Error('Ollama service is not running or not accessible');
    }
    if (msg.includes('model') && msg.includes('not') && msg.includes('found')) {
      return new Error('Ollama model not found. Please make sure the model is downloaded.');
    }
    return super.handleError(error);
  }
}
