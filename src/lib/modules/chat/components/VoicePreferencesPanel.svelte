<script>
  import { createEventDispatcher } from 'svelte';
  import { voiceUxPolisher } from '../VoiceUxPolisher.js';
  import { selectedLanguage } from '$modules/i18n/stores';

  const dispatch = createEventDispatcher();

  // Get current preferences
  let preferences = { ...voiceUxPolisher.userPreferences };
  
  // Reactive language for translations
  $: currentLanguage = $selectedLanguage;

  // Translation strings
  const translations = {
    en: {
      title: 'Voice Interaction Preferences',
      interruptionSensitivity: 'Interruption Sensitivity',
      interruptionSensitivityHelp: 'How easily the bot detects when you want to interrupt',
      low: 'Low - Only clear interruptions',
      medium: 'Medium - Balanced detection',
      high: 'High - Sensitive to any speech',
      responseStyle: 'Response Style',
      responseStyleHelp: 'How the bot responds to your questions',
      concise: 'Concise - Brief answers',
      natural: 'Natural - Conversational responses',
      detailed: 'Detailed - Comprehensive explanations',
      errorRecovery: 'Error Recovery',
      errorRecoveryHelp: 'How the bot handles technical issues',
      automatic: 'Automatic - Handle errors silently',
      manual: 'Manual - Ask before recovering',
      feedbackLevel: 'Feedback Level',
      feedbackLevelHelp: 'How much information to show about voice interactions',
      none: 'None - No feedback',
      minimal: 'Minimal - Basic status',
      detailedFeedback: 'Detailed - Full diagnostics',
      save: 'Save Preferences',
      reset: 'Reset to Defaults',
      advanced: 'Advanced Settings',
      showAdvanced: 'Show Advanced Options',
      hideAdvanced: 'Hide Advanced Options'
    },
    es: {
      title: 'Preferencias de Interacción de Voz',
      interruptionSensitivity: 'Sensibilidad de Interrupción',
      interruptionSensitivityHelp: 'Qué tan fácilmente el bot detecta cuando quieres interrumpir',
      low: 'Baja - Solo interrupciones claras',
      medium: 'Media - Detección equilibrada',
      high: 'Alta - Sensible a cualquier habla',
      responseStyle: 'Estilo de Respuesta',
      responseStyleHelp: 'Cómo responde el bot a tus preguntas',
      concise: 'Conciso - Respuestas breves',
      natural: 'Natural - Respuestas conversacionales',
      detailed: 'Detallado - Explicaciones completas',
      errorRecovery: 'Recuperación de Errores',
      errorRecoveryHelp: 'Cómo maneja el bot los problemas técnicos',
      automatic: 'Automático - Manejar errores silenciosamente',
      manual: 'Manual - Preguntar antes de recuperar',
      feedbackLevel: 'Nivel de Retroalimentación',
      feedbackLevelHelp: 'Cuánta información mostrar sobre interacciones de voz',
      none: 'Ninguno - Sin retroalimentación',
      minimal: 'Mínimo - Estado básico',
      detailedFeedback: 'Detallado - Diagnósticos completos',
      save: 'Guardar Preferencias',
      reset: 'Restablecer Predeterminados',
      advanced: 'Configuración Avanzada',
      showAdvanced: 'Mostrar Opciones Avanzadas',
      hideAdvanced: 'Ocultar Opciones Avanzadas'
    },
    ru: {
      title: 'Настройки Голосового Взаимодействия',
      interruptionSensitivity: 'Чувствительность Прерывания',
      interruptionSensitivityHelp: 'Насколько легко бот определяет, когда вы хотите прервать',
      low: 'Низкая - Только четкие прерывания',
      medium: 'Средняя - Сбалансированное обнаружение',
      high: 'Высокая - Чувствительна к любой речи',
      responseStyle: 'Стиль Ответа',
      responseStyleHelp: 'Как бот отвечает на ваши вопросы',
      concise: 'Краткий - Короткие ответы',
      natural: 'Естественный - Разговорные ответы',
      detailed: 'Подробный - Полные объяснения',
      errorRecovery: 'Восстановление Ошибок',
      errorRecoveryHelp: 'Как бот обрабатывает технические проблемы',
      automatic: 'Автоматически - Обрабатывать ошибки незаметно',
      manual: 'Вручную - Спрашивать перед восстановлением',
      feedbackLevel: 'Уровень Обратной Связи',
      feedbackLevelHelp: 'Сколько информации показывать о голосовых взаимодействиях',
      none: 'Нет - Без обратной связи',
      minimal: 'Минимальный - Базовый статус',
      detailedFeedback: 'Подробный - Полная диагностика',
      save: 'Сохранить Настройки',
      reset: 'Сбросить к Умолчанию',
      advanced: 'Расширенные Настройки',
      showAdvanced: 'Показать Расширенные Опции',
      hideAdvanced: 'Скрыть Расширенные Опции'
    }
  };

  $: t = translations[currentLanguage] || translations.en;

  let showAdvanced = false;
  let saving = false;

  // Advanced preferences
  let advancedPreferences = {
    interruptionThreshold: 0.6,
    responseDelay: 500,
    naturalPauses: true,
    contextualAcknowledgments: true,
    proactiveHelp: true,
    accessibilityEnhancements: true
  };

  function handleSave() {
    saving = true;
    
    try {
      // Update the UX polisher with new preferences
      voiceUxPolisher.userPreferences = { ...preferences };
      
      // Save advanced preferences if shown
      if (showAdvanced) {
        voiceUxPolisher.advancedPreferences = { ...advancedPreferences };
      }

      // Persist to localStorage
      localStorage.setItem('voicePreferences', JSON.stringify(preferences));
      if (showAdvanced) {
        localStorage.setItem('voiceAdvancedPreferences', JSON.stringify(advancedPreferences));
      }

      dispatch('preferencesUpdated', { preferences, advancedPreferences });
      
      console.log('Voice preferences saved:', preferences);
    } catch (error) {
      console.error('Error saving voice preferences:', error);
    } finally {
      saving = false;
    }
  }

  function handleReset() {
    preferences = {
      interruptionSensitivity: 'medium',
      responseStyle: 'natural',
      errorRecovery: 'automatic',
      feedbackLevel: 'minimal'
    };

    advancedPreferences = {
      interruptionThreshold: 0.6,
      responseDelay: 500,
      naturalPauses: true,
      contextualAcknowledgments: true,
      proactiveHelp: true,
      accessibilityEnhancements: true
    };
  }

  function toggleAdvanced() {
    showAdvanced = !showAdvanced;
  }

  // Load saved preferences on mount
  function loadSavedPreferences() {
    try {
      const saved = localStorage.getItem('voicePreferences');
      if (saved) {
        preferences = { ...preferences, ...JSON.parse(saved) };
      }

      const savedAdvanced = localStorage.getItem('voiceAdvancedPreferences');
      if (savedAdvanced) {
        advancedPreferences = { ...advancedPreferences, ...JSON.parse(savedAdvanced) };
      }
    } catch (error) {
      console.error('Error loading saved preferences:', error);
    }
  }

  // Load preferences when component mounts
  loadSavedPreferences();
</script>

<div class="voice-preferences-panel">
  <h3 class="preferences-title">{t.title}</h3>

  <div class="preference-group">
    <label class="preference-label" for="interruption-sensitivity">
      {t.interruptionSensitivity}
      <span class="help-text">{t.interruptionSensitivityHelp}</span>
    </label>
    <select id="interruption-sensitivity" bind:value={preferences.interruptionSensitivity} class="preference-select">
      <option value="low">{t.low}</option>
      <option value="medium">{t.medium}</option>
      <option value="high">{t.high}</option>
    </select>
  </div>

  <div class="preference-group">
    <label class="preference-label" for="response-style">
      {t.responseStyle}
      <span class="help-text">{t.responseStyleHelp}</span>
    </label>
    <select id="response-style" bind:value={preferences.responseStyle} class="preference-select">
      <option value="concise">{t.concise}</option>
      <option value="natural">{t.natural}</option>
      <option value="detailed">{t.detailed}</option>
    </select>
  </div>

  <div class="preference-group">
    <label class="preference-label" for="error-recovery">
      {t.errorRecovery}
      <span class="help-text">{t.errorRecoveryHelp}</span>
    </label>
    <select id="error-recovery" bind:value={preferences.errorRecovery} class="preference-select">
      <option value="automatic">{t.automatic}</option>
      <option value="manual">{t.manual}</option>
    </select>
  </div>

  <div class="preference-group">
    <label class="preference-label" for="feedback-level">
      {t.feedbackLevel}
      <span class="help-text">{t.feedbackLevelHelp}</span>
    </label>
    <select id="feedback-level" bind:value={preferences.feedbackLevel} class="preference-select">
      <option value="none">{t.none}</option>
      <option value="minimal">{t.minimal}</option>
      <option value="detailed">{t.detailedFeedback}</option>
    </select>
  </div>

  <!-- Advanced Settings Toggle -->
  <button 
    class="advanced-toggle" 
    on:click={toggleAdvanced}
    type="button"
  >
    {showAdvanced ? t.hideAdvanced : t.showAdvanced}
  </button>

  {#if showAdvanced}
    <div class="advanced-settings">
      <h4 class="advanced-title">{t.advanced}</h4>
      
      <div class="preference-group">
        <label class="preference-label" for="interruption-threshold">
          Interruption Threshold
          <span class="help-text">Confidence level required to detect interruptions (0.1-1.0)</span>
        </label>
        <input 
          id="interruption-threshold"
          type="range" 
          min="0.1" 
          max="1.0" 
          step="0.1" 
          bind:value={advancedPreferences.interruptionThreshold}
          class="preference-range"
        />
        <span class="range-value">{advancedPreferences.interruptionThreshold}</span>
      </div>

      <div class="preference-group">
        <label class="preference-label" for="response-delay">
          Response Delay (ms)
          <span class="help-text">Delay before responding to interruptions</span>
        </label>
        <input 
          id="response-delay"
          type="range" 
          min="100" 
          max="2000" 
          step="100" 
          bind:value={advancedPreferences.responseDelay}
          class="preference-range"
        />
        <span class="range-value">{advancedPreferences.responseDelay}ms</span>
      </div>

      <div class="preference-group">
        <label class="checkbox-label">
          <input 
            type="checkbox" 
            bind:checked={advancedPreferences.naturalPauses}
          />
          Natural Pauses in Long Responses
        </label>
      </div>

      <div class="preference-group">
        <label class="checkbox-label">
          <input 
            type="checkbox" 
            bind:checked={advancedPreferences.contextualAcknowledgments}
          />
          Contextual Acknowledgments
        </label>
      </div>

      <div class="preference-group">
        <label class="checkbox-label">
          <input 
            type="checkbox" 
            bind:checked={advancedPreferences.proactiveHelp}
          />
          Proactive Help Suggestions
        </label>
      </div>

      <div class="preference-group">
        <label class="checkbox-label">
          <input 
            type="checkbox" 
            bind:checked={advancedPreferences.accessibilityEnhancements}
          />
          Accessibility Enhancements
        </label>
      </div>
    </div>
  {/if}

  <div class="preference-actions">
    <button 
      class="save-button" 
      on:click={handleSave}
      disabled={saving}
      type="button"
    >
      {saving ? 'Saving...' : t.save}
    </button>
    
    <button 
      class="reset-button" 
      on:click={handleReset}
      type="button"
    >
      {t.reset}
    </button>
  </div>
</div>

<style>
  .voice-preferences-panel {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1.5rem;
    margin: 1rem 0;
    max-width: 500px;
  }

  .preferences-title {
    margin: 0 0 1.5rem 0;
    color: var(--text-primary);
    font-size: 1.2rem;
    font-weight: 600;
  }

  .preference-group {
    margin-bottom: 1.5rem;
  }

  .preference-label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
    font-weight: 500;
  }

  .help-text {
    display: block;
    font-size: 0.85rem;
    color: var(--text-secondary);
    font-weight: 400;
    margin-top: 0.25rem;
  }

  .preference-select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.9rem;
  }

  .preference-select:focus {
    outline: none;
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px var(--accent-color-alpha);
  }

  .preference-range {
    width: calc(100% - 60px);
    margin-right: 10px;
  }

  .range-value {
    color: var(--text-secondary);
    font-size: 0.9rem;
    min-width: 50px;
    display: inline-block;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    margin: 0;
  }

  .advanced-toggle {
    background: none;
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    margin-bottom: 1rem;
    transition: all 0.2s ease;
  }

  .advanced-toggle:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .advanced-settings {
    border-top: 1px solid var(--border-color);
    padding-top: 1.5rem;
    margin-top: 1rem;
  }

  .advanced-title {
    margin: 0 0 1rem 0;
    color: var(--text-primary);
    font-size: 1rem;
    font-weight: 600;
  }

  .preference-actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
  }

  .save-button {
    background: var(--accent-color);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.2s ease;
  }

  .save-button:hover:not(:disabled) {
    background: var(--accent-color-dark);
  }

  .save-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .reset-button {
    background: none;
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .reset-button:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  /* Dark mode adjustments */
  :global(.dark) .voice-preferences-panel {
    background: var(--bg-secondary-dark);
    border-color: var(--border-color-dark);
  }

  :global(.dark) .preference-select {
    background: var(--bg-primary-dark);
    border-color: var(--border-color-dark);
    color: var(--text-primary-dark);
  }

  :global(.dark) .advanced-toggle {
    border-color: var(--border-color-dark);
    color: var(--text-secondary-dark);
  }

  :global(.dark) .advanced-toggle:hover {
    background: var(--bg-tertiary-dark);
    color: var(--text-primary-dark);
  }

  :global(.dark) .reset-button {
    border-color: var(--border-color-dark);
    color: var(--text-secondary-dark);
  }

  :global(.dark) .reset-button:hover {
    background: var(--bg-tertiary-dark);
    color: var(--text-primary-dark);
  }
</style>