/**
 * TutorCommandsService
 *
 * Manages tutor command definitions with multilingual support.
 * Provides localized command names and descriptions for the command menu.
 */

class TutorCommandsService {
  constructor() {
    this.config = null;
    this.isInitialized = false;
    this.cache = new Map();
  }

  /**
   * Initialize the service by loading configuration
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      const response = await fetch('/src/lib/config/tutorCommands.json');
      if (!response.ok) {
        throw new Error(`Failed to load configuration: ${response.statusText}`);
      }
      this.config = await response.json();
      this.isInitialized = true;
      console.log('[TutorCommandsService] Initialized successfully');
    } catch (error) {
      console.error('[TutorCommandsService] Failed to load configuration:', error);
      // Fallback to minimal configuration
      this.config = {
        commands: [
          {
            id: 'solve',
            category: 'problem-solving',
            translations: {
              en: { name: '/solve', description: 'Solve a problem step by step' },
              ru: { name: '/решить', description: 'Решить задачу пошагово' },
              es: { name: '/resolver', description: 'Resolver un problema paso a paso' }
            }
          },
          {
            id: 'explain',
            category: 'understanding',
            translations: {
              en: { name: '/explain', description: 'Explain a concept in detail' },
              ru: { name: '/объяснить', description: 'Подробно объяснить концепцию' },
              es: { name: '/explicar', description: 'Explicar un concepto en detalle' }
            }
          }
        ],
        settings: {
          enableKeyboardShortcut: true,
          shortcutKey: '/',
          defaultLanguage: 'en'
        }
      };
      this.isInitialized = true;
    }
  }

  /**
   * Get all commands for a specific language
   * @param {string} language - Language code (e.g., 'en', 'ru', 'es')
   * @returns {Promise<Array>} Array of command objects with localized names and descriptions
   */
  async getCommands(language) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Check cache
    const cacheKey = `commands_${language}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const commands = this.config.commands.map((cmd) => {
      const translation = this._getTranslation(cmd, language);
      return {
        id: cmd.id,
        category: cmd.category,
        name: translation.name,
        description: translation.description
      };
    });

    // Cache result
    this.cache.set(cacheKey, commands);

    return commands;
  }

  /**
   * Get a command by its localized name
   * @param {string} name - Command name (e.g., '/solve', '/решить')
   * @param {string} language - Language code
   * @returns {Promise<Object|null>} Command object or null if not found
   */
  async getCommandByName(name, language) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const normalizedName = name.toLowerCase().trim();

    for (const cmd of this.config.commands) {
      const translation = this._getTranslation(cmd, language);
      if (translation.name.toLowerCase() === normalizedName) {
        return {
          id: cmd.id,
          category: cmd.category,
          name: translation.name,
          description: translation.description
        };
      }
    }

    return null;
  }

  /**
   * Get a command by its ID
   * @param {string} id - Command ID
   * @param {string} language - Language code
   * @returns {Promise<Object|null>} Command object or null if not found
   */
  async getCommandById(id, language) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const cmd = this.config.commands.find((c) => c.id === id);
    if (!cmd) {
      return null;
    }

    const translation = this._getTranslation(cmd, language);
    return {
      id: cmd.id,
      category: cmd.category,
      name: translation.name,
      description: translation.description
    };
  }

  /**
   * Format a command string for insertion
   * @param {string} commandId - Command ID
   * @param {string} language - Language code
   * @returns {Promise<string>} Formatted command string
   */
  async formatCommand(commandId, language) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const cmd = await this.getCommandById(commandId, language);
    return cmd ? `${cmd.name} ` : '';
  }

  /**
   * Get commands filtered by category
   * @param {string} category - Category name
   * @param {string} language - Language code
   * @returns {Promise<Array>} Array of command objects
   */
  async getCommandsByCategory(category, language) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const allCommands = await this.getCommands(language);
    return allCommands.filter((cmd) => cmd.category === category);
  }

  /**
   * Get all available categories
   * @returns {Promise<string[]>} Array of category names
   */
  async getCategories() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const categories = new Set(this.config.commands.map((cmd) => cmd.category));
    return Array.from(categories);
  }

  /**
   * Check if keyboard shortcut is enabled
   * @returns {boolean} True if keyboard shortcut is enabled
   */
  isKeyboardShortcutEnabled() {
    return this.config?.settings?.enableKeyboardShortcut ?? true;
  }

  /**
   * Get the keyboard shortcut key
   * @returns {string} Shortcut key
   */
  getShortcutKey() {
    return this.config?.settings?.shortcutKey || '/';
  }

  /**
   * Check if a language is supported
   * @param {string} language - Language code
   * @returns {boolean} True if language is supported
   */
  isLanguageSupported(language) {
    if (!this.isInitialized || !this.config) {
      return false;
    }

    // Check if any command has translation for this language
    return this.config.commands.some((cmd) => cmd.translations && cmd.translations[language]);
  }

  /**
   * Get translation for a command
   * @private
   */
  _getTranslation(command, language) {
    // Try requested language
    if (command.translations[language]) {
      return command.translations[language];
    }

    // Fallback to default language
    const defaultLang = this.config.settings.defaultLanguage || 'en';
    if (command.translations[defaultLang]) {
      return command.translations[defaultLang];
    }

    // Fallback to first available language
    const firstLang = Object.keys(command.translations)[0];
    return (
      command.translations[firstLang] || {
        name: `/${command.id}`,
        description: command.id
      }
    );
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
export const tutorCommandsService = new TutorCommandsService();
export default tutorCommandsService;
