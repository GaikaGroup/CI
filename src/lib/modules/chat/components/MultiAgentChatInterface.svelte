<script>
  import { onMount } from 'svelte';
  import { MessageCircle, Mic, Globe, RotateCcw, Users, Bot } from 'lucide-svelte';
  import {
    chatMode,
    messages,
    addMessage,
    initializeChat,
    processingImagesMap,
    ocrNotes,
    setProcessingImages,
    setOcrNote,
    updateMessage
  } from '../stores';
  import { selectedLanguage, languages } from '$modules/i18n/stores';
  import { darkMode } from '$modules/theme/stores';
  import { getTranslation } from '$modules/i18n/translations';
  import { CHAT_MODES, MESSAGE_TYPES } from '$shared/utils/constants';
  import { sendMessageWithOCRContext } from '../enhancedServices';
  import { setVoiceModeActive } from '../voiceServices';
  import { container } from '$lib/shared/di/container';
  import { LLM_FEATURES } from '$lib/config/llm';
  import { ensureProviderManager } from '$modules/llm/ensureProviderManager.js';
  import { OPENAI_CONFIG } from '$lib/config/api';
  import LanguageSelector from '$modules/i18n/components/LanguageSelector.svelte';
  import MessageList from './MessageList.svelte';
  import MessageInput from './MessageInput.svelte';
  import VoiceChat from './VoiceChat.svelte';
  import Button from '$shared/components/Button.svelte';
  import { browser } from '$app/environment';
  import { appMode } from '$lib/stores/mode';
  import { examProfile } from '$lib/stores/examProfile';

  // Multi-agent specific props
  export let subject = null;
  export let orchestrationService = null;
  export let enableMultiAgent = false;

  // Session ID for maintaining conversation context
  let sessionId;
  let showLanguageSelector = false;
  let showDetailedPrompt = false;
  let lastQuestion = '';
  let activeAgents = [];
  let showAgentInfo = false;

  // Provider selection
  let selectedProvider = null;
  let availableProviders = [];

  // Multi-agent state
  $: isMultiAgent =
    enableMultiAgent && subject && (subject.agents?.length > 1 || subject.orchestrationAgent);
  $: allAgents = subject
    ? [
        ...(subject.agents || []),
        ...(subject.orchestrationAgent ? [subject.orchestrationAgent] : [])
      ]
    : [];

  // Get available providers on mount
  onMount(async () => {
    if (LLM_FEATURES.ENABLE_PROVIDER_SWITCHING && browser) {
      try {
        const providerManager = await ensureProviderManager();
        availableProviders = providerManager.listProviders();
        selectedProvider = providerManager.defaultProvider;
        console.log('Available LLM providers:', availableProviders);
      } catch (error) {
        console.error('Error getting available providers:', error);
      }
    }
  });

  // Initialize chat when language is selected
  const formatModeNote = () => {
    if ($appMode === 'learn') {
      if ($examProfile) {
        const key = $examProfile.mode === 'exam' ? 'learnModeExamNote' : 'learnModePracticeNote';
        return getTranslation($selectedLanguage, key).replace(
          '{subject}',
          $examProfile.subjectName
        );
      }
      return getTranslation($selectedLanguage, 'learnModeDefaultNote');
    }
    return getTranslation($selectedLanguage, 'funModeNote');
  };

  $: if ($selectedLanguage && $messages.length === 0) {
    let welcomeMessage = getTranslation($selectedLanguage, 'welcomeMessage');

    // Add multi-agent welcome if applicable
    if (isMultiAgent) {
      const agentCount = subject.agents?.length || 0;
      const hasOrchestration = !!subject.orchestrationAgent;
      welcomeMessage += ` I have ${agentCount} specialized agent${agentCount === 1 ? '' : 's'}${hasOrchestration ? ' with orchestration' : ''} ready to help you with ${subject.name}.`;
    }

    const modeNote = formatModeNote();
    initializeChat(`${welcomeMessage} ${modeNote}`.trim());
  }

  $: if (browser && sessionId && $appMode === 'learn' && container.has('sessionFactory')) {
    try {
      const sessionFactory = container.resolve('sessionFactory');
      const session = sessionFactory.getOrCreateSession(sessionId);
      session.updateContext({
        examProfile: $examProfile,
        subject: subject,
        multiAgent: isMultiAgent
      });
    } catch (error) {
      console.warn('[MultiAgentChatInterface] Failed to persist context in session', error);
    }
  }

  $: activeExamMode = $examProfile
    ? $examProfile.mode === 'exam'
      ? $examProfile.exam
      : $examProfile.practice
    : null;

  $: currentModeLabel = $examProfile
    ? getTranslation(
        $selectedLanguage,
        $examProfile.mode === 'exam' ? 'learnModeExamLabel' : 'learnModePracticeLabel'
      )
    : '';

  $: chatSkillsLabel = $examProfile?.skills?.length
    ? `${getTranslation($selectedLanguage, 'learnModeActiveSkills')}: ${$examProfile.skills.join(', ')}`
    : '';

  $: chatWordGoal = activeExamMode?.minWords
    ? getTranslation($selectedLanguage, 'learnModeActiveWordGoal').replace(
        '{words}',
        activeExamMode.minWords
      )
    : '';

  // Enhanced message processing for multi-agent
  async function processMultiAgentMessage(content, images, messageId) {
    try {
      if (!isMultiAgent || !orchestrationService) {
        // Fall back to standard processing
        return await processStandardMessage(content, images, messageId);
      }

      console.log('Processing multi-agent message:', messageId);
      setProcessingImages(messageId, true);

      // Prepare context for orchestration
      const context = {
        subject,
        agents: allAgents,
        sessionId,
        messageHistory: $messages
      };

      // Use orchestration service to coordinate agents
      const result = await orchestrationService.coordinateAgents(subject.id, content, context);

      if (result.success) {
        // Add the coordinated response
        const responseContent = result.response;
        const contributingAgents = result.contributingAgents || [];

        // Create enhanced message with agent attribution
        const responseMessage = {
          type: MESSAGE_TYPES.TUTOR,
          content: responseContent,
          timestamp: new Date(),
          agents: contributingAgents,
          orchestrated: contributingAgents.length > 1,
          metadata: result.metadata || {}
        };

        addMessage(MESSAGE_TYPES.TUTOR, responseContent, null, null, responseMessage);

        // Track active agents
        activeAgents = contributingAgents;
      } else {
        throw new Error(result.error || 'Multi-agent coordination failed');
      }

      return result;
    } catch (error) {
      console.error('Multi-agent processing failed:', error);
      // Fall back to standard processing
      return await processStandardMessage(content, images, messageId);
    } finally {
      setProcessingImages(messageId, false);
    }
  }

  // Standard message processing (fallback)
  async function processStandardMessage(content, images, messageId) {
    try {
      console.log('Processing standard message:', messageId);
      setProcessingImages(messageId, true);

      const { sendMessage } = await import('../services');

      let result;
      if (sessionId) {
        if (LLM_FEATURES.ENABLE_PROVIDER_SWITCHING && selectedProvider) {
          result = await sendMessage(content, images, sessionId, selectedProvider);
        } else {
          result = await sendMessage(content, images, sessionId);
        }
      } else {
        if (LLM_FEATURES.ENABLE_PROVIDER_SWITCHING && selectedProvider) {
          result = await sendMessage(content, images, null, selectedProvider);
        } else {
          result = await sendMessageWithOCRContext(content, images);
        }
      }

      return result;
    } catch (error) {
      console.error('Standard message processing failed:', error);
      throw error;
    } finally {
      setProcessingImages(messageId, false);
    }
  }

  // Process images for a message
  async function processImages(messageContent, images, messageId) {
    try {
      console.log('Processing images for message:', messageId);

      if ($processingImagesMap[messageId] || $ocrNotes[messageId]) {
        console.log('Message already processed, skipping:', messageId);
        return false;
      }

      setProcessingImages(messageId, true);
      updateMessage(messageId, { ocrRequested: true });

      // Use multi-agent processing if available
      const result = await processMultiAgentMessage(messageContent, images, messageId);

      console.log('Image processing completed:', result);
      setOcrNote(messageId, 'OCR processing complete');
      updateMessage(messageId, { ocrProcessed: true });

      return result;
    } catch (error) {
      console.error('Image processing failed:', error);
      setOcrNote(messageId, `OCR processing failed: ${error.message}`);
      updateMessage(messageId, { ocrProcessed: false, ocrError: error.message });
      throw error;
    } finally {
      setProcessingImages(messageId, false);
    }
  }

  // Initialize session and load history
  onMount(() => {
    console.log('MultiAgentChatInterface mounted');

    setVoiceModeActive($chatMode === CHAT_MODES.VOICE);

    if (browser) {
      const savedSessionId = localStorage.getItem('sessionId');
      if (savedSessionId) {
        sessionId = savedSessionId;
      } else {
        if (container.has('sessionFactory')) {
          const sessionFactory = container.resolve('sessionFactory');
          const session = sessionFactory.getOrCreateSession();
          sessionId = session.getSessionId();
          localStorage.setItem('sessionId', sessionId);
        } else {
          sessionId = Date.now().toString() + Math.random().toString(36).substring(2, 15);
          localStorage.setItem('sessionId', sessionId);
        }
      }

      // Load chat history
      if (sessionId && $messages.length === 0) {
        import('../services').then(({ getChatHistory }) => {
          getChatHistory(sessionId).then((history) => {
            if (history && history.length > 0) {
              console.log('Loaded chat history:', history.length, 'messages');
              messages.set(history);
            }
          });
        });
      }

      // Process unprocessed images
      const messagesWithUnprocessedImages = [...$messages].filter(
        (message) =>
          message.type === MESSAGE_TYPES.USER &&
          message.images &&
          message.images.length > 0 &&
          !message.ocrProcessed &&
          !$ocrNotes[message.id] &&
          !$processingImagesMap[message.id]
      );

      if (messagesWithUnprocessedImages.length > 0) {
        const mostRecentMessage =
          messagesWithUnprocessedImages[messagesWithUnprocessedImages.length - 1];
        processImages(
          mostRecentMessage.content,
          mostRecentMessage.images,
          mostRecentMessage.id
        ).catch((error) => console.error('Failed to process images on mount:', error));
      }
    }
  });

  function handleSendMessage(event) {
    const { content, images } = event.detail;
    showDetailedPrompt = false;

    const messageId = Date.now();

    if (images && images.length > 0) {
      const imageUrls = images.map((img) => img.url);
      addMessage(MESSAGE_TYPES.USER, content, images, messageId, {
        ocrRequested: false,
        ocrProcessed: false
      });

      processImages(content, imageUrls, messageId)
        .then(() => {
          lastQuestion = content;
          showDetailedPrompt = true;
        })
        .catch((error) => {
          console.error('Failed to process images:', error);
          setProcessingImages(messageId, false);
        });
    } else {
      addMessage(MESSAGE_TYPES.USER, content, images, messageId);

      // Use multi-agent processing for text messages too
      if (isMultiAgent && orchestrationService) {
        const context = {
          subject,
          agents: allAgents,
          sessionId,
          messageHistory: $messages
        };

        orchestrationService
          .coordinateAgents(subject.id, content, context)
          .then((result) => {
            if (result.success) {
              const responseContent = result.response;
              const contributingAgents = result.contributingAgents || [];

              const responseMessage = {
                type: MESSAGE_TYPES.TUTOR,
                content: responseContent,
                timestamp: new Date(),
                agents: contributingAgents,
                orchestrated: contributingAgents.length > 1,
                metadata: result.metadata || {}
              };

              addMessage(MESSAGE_TYPES.TUTOR, responseContent, null, null, responseMessage);

              activeAgents = contributingAgents;
              lastQuestion = content;
              showDetailedPrompt = true;
            } else {
              console.error('Multi-agent coordination failed:', result.error);
              // Fall back to standard processing
              processStandardMessage(content, [], messageId);
            }
          })
          .catch((error) => {
            console.error('Multi-agent processing failed:', error);
            // Fall back to standard processing
            processStandardMessage(content, [], messageId);
          });
      } else {
        // Standard processing
        import('../services').then(({ sendMessage }) => {
          if (sessionId) {
            if (LLM_FEATURES.ENABLE_PROVIDER_SWITCHING && selectedProvider) {
              sendMessage(content, [], sessionId, selectedProvider).then(() => {
                lastQuestion = content;
                showDetailedPrompt = true;
              });
            } else {
              sendMessage(content, [], sessionId).then(() => {
                lastQuestion = content;
                showDetailedPrompt = true;
              });
            }
          } else {
            if (LLM_FEATURES.ENABLE_PROVIDER_SWITCHING && selectedProvider) {
              sendMessage(content, [], null, selectedProvider).then(() => {
                lastQuestion = content;
                showDetailedPrompt = true;
              });
            } else {
              sendMessageWithOCRContext(content, []).then(() => {
                lastQuestion = content;
                showDetailedPrompt = true;
              });
            }
          }
        });
      }
    }
  }

  function requestDetailed() {
    showDetailedPrompt = false;
    const prompt =
      lastQuestion + '\n\nPlease provide an in-depth, multi-paragraph explanation with examples.';

    const match = lastQuestion.match(/(\d+)\s+words?/i);
    const requestedWords = match ? parseInt(match[1]) : null;
    let tokenEstimate = requestedWords
      ? Math.ceil(requestedWords * 1.3)
      : OPENAI_CONFIG.DETAILED_MAX_TOKENS;
    tokenEstimate = Math.min(tokenEstimate, OPENAI_CONFIG.DETAILED_MAX_TOKENS);

    // Use multi-agent for detailed requests too
    if (isMultiAgent && orchestrationService) {
      const context = {
        subject,
        agents: allAgents,
        sessionId,
        messageHistory: $messages,
        requestType: 'detailed',
        requestedWords
      };

      orchestrationService.coordinateAgents(subject.id, prompt, context).catch((error) => {
        console.error('Multi-agent detailed request failed:', error);
        // Fall back to standard processing
        import('../services').then(({ sendMessage }) => {
          if (sessionId) {
            if (LLM_FEATURES.ENABLE_PROVIDER_SWITCHING && selectedProvider) {
              sendMessage(
                prompt,
                [],
                sessionId,
                selectedProvider,
                tokenEstimate,
                'detailed',
                requestedWords
              );
            } else {
              sendMessage(prompt, [], sessionId, null, tokenEstimate, 'detailed', requestedWords);
            }
          } else {
            sendMessageWithOCRContext(prompt, [], tokenEstimate, 'detailed', requestedWords);
          }
        });
      });
    } else {
      import('../services').then(({ sendMessage }) => {
        if (sessionId) {
          if (LLM_FEATURES.ENABLE_PROVIDER_SWITCHING && selectedProvider) {
            sendMessage(
              prompt,
              [],
              sessionId,
              selectedProvider,
              tokenEstimate,
              'detailed',
              requestedWords
            );
          } else {
            sendMessage(prompt, [], sessionId, null, tokenEstimate, 'detailed', requestedWords);
          }
        } else {
          sendMessageWithOCRContext(prompt, [], tokenEstimate, 'detailed', requestedWords);
        }
      });
    }
  }

  function handleStartRecording() {
    console.log('Recording started');
  }

  function handleStopRecording() {
    console.log('Recording stopped');
  }

  function getCurrentLanguage() {
    return languages.find((lang) => lang.code === $selectedLanguage);
  }

  function getAgentTypeIcon(type) {
    return type === 'orchestration' ? Users : Bot;
  }

  function getAgentTypeBadge(type) {
    return type === 'orchestration'
      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
  }
</script>

<div class="max-w-4xl mx-auto">
  <!-- Mode Toggle -->
  <div class="flex justify-center mb-8">
    <div
      class="{$darkMode
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-stone-200'} rounded-xl p-2 shadow-sm border"
    >
      <Button
        on:click={() => {
          $chatMode = CHAT_MODES.TEXT;
          setVoiceModeActive(false);
        }}
        variant={$chatMode === CHAT_MODES.TEXT ? 'primary' : 'text'}
        class="px-6 py-3 rounded-lg font-medium transition-all {$chatMode === CHAT_MODES.TEXT
          ? 'bg-amber-600 text-white shadow-sm'
          : $darkMode
            ? 'text-gray-300 hover:text-amber-400 hover:bg-gray-700'
            : 'text-stone-600 hover:text-amber-700 hover:bg-stone-50'}"
      >
        <div class="flex items-center">
          <MessageCircle class="w-5 h-5 mr-2" />
          <span>{getTranslation($selectedLanguage, 'textChat')}</span>
        </div>
      </Button>
      <Button
        on:click={() => {
          $chatMode = CHAT_MODES.VOICE;
          setVoiceModeActive(true);
        }}
        variant={$chatMode === CHAT_MODES.VOICE ? 'primary' : 'text'}
        class="px-6 py-3 rounded-lg font-medium transition-all {$chatMode === CHAT_MODES.VOICE
          ? 'bg-amber-600 text-white shadow-sm'
          : $darkMode
            ? 'text-gray-300 hover:text-amber-400 hover:bg-gray-700'
            : 'text-stone-600 hover:text-amber-700 hover:bg-stone-50'}"
      >
        <div class="flex items-center">
          <Mic class="w-5 h-5 mr-2" />
          <span>{getTranslation($selectedLanguage, 'voiceChat')}</span>
        </div>
      </Button>
    </div>
  </div>

  <!-- Multi-Agent Info -->
  {#if isMultiAgent}
    <div
      class="mb-6 rounded-2xl border border-purple-200 bg-purple-50 p-4 shadow-sm dark:border-purple-500/40 dark:bg-purple-500/10"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <Users class="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 class="font-semibold text-stone-900 dark:text-white">Multi-Agent Learning</h3>
            <p class="text-sm text-stone-600 dark:text-gray-300">
              {allAgents.length} specialized agents ready to help
            </p>
          </div>
        </div>

        <button
          on:click={() => (showAgentInfo = !showAgentInfo)}
          class="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 transition-colors"
        >
          {showAgentInfo ? 'Hide' : 'Show'} Agents
        </button>
      </div>

      {#if showAgentInfo}
        <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {#each allAgents as agent}
            <div
              class="bg-white dark:bg-gray-800 rounded-lg p-3 border border-purple-200 dark:border-purple-700"
            >
              <div class="flex items-center gap-2 mb-1">
                <svelte:component
                  this={getAgentTypeIcon(agent.type)}
                  class="w-4 h-4 text-stone-600 dark:text-gray-400"
                />
                <h4 class="font-medium text-stone-900 dark:text-white text-sm">
                  {agent.name}
                </h4>
                <span
                  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {getAgentTypeBadge(
                    agent.type
                  )}"
                >
                  {agent.type === 'orchestration' ? 'Orchestrator' : 'Specialist'}
                </span>
              </div>
              <p class="text-xs text-stone-600 dark:text-gray-300">
                {agent.instructions.substring(0, 80)}...
              </p>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Subject Info -->
  {#if $appMode === 'learn' && ($examProfile || subject)}
    <div
      class="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/10"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="space-y-1">
          <p
            class="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300"
          >
            {currentModeLabel || 'Learning Mode'}
          </p>
          <h3 class="text-lg font-semibold text-stone-900 dark:text-white">
            {$examProfile?.subjectName || subject?.name}
          </h3>
          {#if chatSkillsLabel}
            <p class="text-xs text-stone-600 dark:text-gray-300">{chatSkillsLabel}</p>
          {/if}
          {#if chatWordGoal}
            <p class="text-xs text-stone-500 dark:text-gray-400">{chatWordGoal}</p>
          {/if}
          {#if subject?.llmSettings && !subject.llmSettings.allowOpenAI}
            <p class="text-xs text-blue-600 dark:text-blue-400">🔒 Privacy mode: Local AI only</p>
          {/if}
        </div>
        {#if activeExamMode?.summary || subject?.description}
          <p class="text-sm text-stone-700 dark:text-gray-200 sm:w-2/3">
            {activeExamMode?.summary || subject?.description}
          </p>
        {/if}
      </div>
      {#if activeExamMode?.instructions}
        <p class="mt-3 text-xs text-stone-600 dark:text-gray-300">
          <span class="font-semibold">
            {getTranslation($selectedLanguage, 'learnModeActiveInstructions')}:
          </span>
          <span class="ml-1">{activeExamMode.instructions}</span>
        </p>
      {/if}
    </div>
  {/if}

  <!-- Chat Interface -->
  <div
    class="{$darkMode
      ? 'bg-gray-800 border-gray-700'
      : 'bg-white border-stone-200'} rounded-2xl shadow-sm border overflow-hidden"
  >
    <!-- Language Indicator and Change Button -->
    {#if $selectedLanguage && !showLanguageSelector}
      <div
        class="flex items-center justify-between px-4 py-3 border-b {$darkMode
          ? 'border-gray-700 bg-gray-750'
          : 'border-stone-200 bg-stone-50'}"
      >
        <div class="flex items-center space-x-2">
          <Globe class="w-4 h-4 {$darkMode ? 'text-gray-400' : 'text-stone-500'}" />
          <span class="text-sm font-medium {$darkMode ? 'text-gray-300' : 'text-stone-600'}">
            {getCurrentLanguage()?.flag}
            {getCurrentLanguage()?.name}
          </span>

          {#if activeAgents.length > 0}
            <div class="flex items-center gap-1 ml-4">
              <span class="text-xs text-stone-500 dark:text-gray-400">Active:</span>
              {#each activeAgents as agent}
                <span
                  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                >
                  {agent.name}
                </span>
              {/each}
            </div>
          {/if}
        </div>
        <button
          on:click={() => (showLanguageSelector = true)}
          class="flex items-center space-x-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors {$darkMode
            ? 'text-gray-400 hover:text-amber-400 hover:bg-gray-700'
            : 'text-stone-500 hover:text-amber-600 hover:bg-stone-100'}"
        >
          <RotateCcw class="w-3 h-3" />
          <span>{getTranslation($selectedLanguage, 'changeLanguage')}</span>
        </button>
      </div>
    {/if}

    {#if !$selectedLanguage || showLanguageSelector}
      <LanguageSelector bind:showSelector={showLanguageSelector} />
    {:else if $chatMode === CHAT_MODES.TEXT}
      <MessageList />
      {#if showDetailedPrompt}
        <div class="px-4 py-2 text-center">
          <button class="text-sm text-amber-600 underline" on:click={requestDetailed}>
            Need a more detailed explanation?
          </button>
        </div>
      {/if}
      <MessageInput on:send={handleSendMessage} />
    {:else if $chatMode === CHAT_MODES.VOICE}
      <VoiceChat on:startRecording={handleStartRecording} on:stopRecording={handleStopRecording} />
    {/if}
  </div>
</div>
