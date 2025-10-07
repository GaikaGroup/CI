/**
 * Diagnostic script to identify Sessions Page Text Mode issues
 * Run this to get a detailed report of what's not working
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Sessions Page Text Mode - Diagnostics', () => {
  let sessionsPageContent;
  let messageInputContent;
  let messageListContent;
  let chatServicesContent;
  let chatStoresContent;

  beforeAll(() => {
    // Read source files
    try {
      sessionsPageContent = readFileSync(
        join(process.cwd(), 'src/routes/sessions/+page.svelte'),
        'utf-8'
      );
      messageInputContent = readFileSync(
        join(process.cwd(), 'src/lib/modules/chat/components/MessageInput.svelte'),
        'utf-8'
      );
      messageListContent = readFileSync(
        join(process.cwd(), 'src/lib/modules/chat/components/MessageList.svelte'),
        'utf-8'
      );
      chatServicesContent = readFileSync(
        join(process.cwd(), 'src/lib/modules/chat/services.js'),
        'utf-8'
      );
      chatStoresContent = readFileSync(
        join(process.cwd(), 'src/lib/modules/chat/stores.js'),
        'utf-8'
      );
    } catch (error) {
      console.error('Error reading source files:', error);
    }
  });

  describe('1. Component Import Analysis', () => {
    it('should verify MessageInput is imported in sessions page', () => {
      const hasImport = sessionsPageContent.includes('MessageInput');
      console.log('✓ MessageInput imported:', hasImport);

      if (!hasImport) {
        console.error('❌ ISSUE: MessageInput not imported in sessions page');
      }
      expect(hasImport).toBe(true);
    });

    it('should verify MessageList is imported in sessions page', () => {
      const hasImport = sessionsPageContent.includes('MessageList');
      console.log('✓ MessageList imported:', hasImport);

      if (!hasImport) {
        console.error('❌ ISSUE: MessageList not imported in sessions page');
      }
      expect(hasImport).toBe(true);
    });

    it('should verify sendMessage is imported from services', () => {
      const hasImport =
        sessionsPageContent.includes('sendMessage') &&
        sessionsPageContent.includes('from') &&
        sessionsPageContent.includes('chat/services');
      console.log('✓ sendMessage imported from services:', hasImport);

      if (!hasImport) {
        console.error('❌ ISSUE: sendMessage not properly imported from chat services');
        console.log(
          'Found import statement:',
          sessionsPageContent.match(/import.*sendMessage.*from.*['"].*['"]/)?.[0] || 'Not found'
        );
      }
    });
  });

  describe('2. Component Rendering Analysis', () => {
    it('should verify MessageInput is rendered in text mode', () => {
      const hasComponent = sessionsPageContent.includes('<MessageInput');
      const inTextMode = sessionsPageContent.match(
        /{#if \$chatModeStore === ['"]text['"][\s\S]*?<MessageInput/
      );

      console.log('✓ MessageInput component tag found:', hasComponent);
      console.log('✓ MessageInput in text mode conditional:', !!inTextMode);

      if (!hasComponent) {
        console.error('❌ ISSUE: MessageInput component not rendered');
      }
      if (!inTextMode) {
        console.error('❌ ISSUE: MessageInput not in text mode conditional block');
      }
    });

    it('should verify MessageList is rendered in text mode', () => {
      const hasComponent = sessionsPageContent.includes('<MessageList');
      const inTextMode = sessionsPageContent.match(
        /{#if \$chatModeStore === ['"]text['"][\s\S]*?<MessageList/
      );

      console.log('✓ MessageList component tag found:', hasComponent);
      console.log('✓ MessageList in text mode conditional:', !!inTextMode);

      if (!hasComponent) {
        console.error('❌ ISSUE: MessageList component not rendered');
      }
      if (!inTextMode) {
        console.error('❌ ISSUE: MessageList not in text mode conditional block');
      }
    });

    it('should verify VoiceChat is hidden in text mode', () => {
      const hasVoiceChat = sessionsPageContent.includes('<VoiceChat');
      const inVoiceMode = sessionsPageContent.match(
        /{#if \$chatModeStore === ['"]voice['"][\s\S]*?<VoiceChat/
      );

      console.log('✓ VoiceChat component found:', hasVoiceChat);
      console.log('✓ VoiceChat in voice mode conditional:', !!inVoiceMode);

      if (hasVoiceChat && !inVoiceMode) {
        console.error('❌ ISSUE: VoiceChat not properly hidden in text mode');
      }
    });
  });

  describe('3. Event Handler Analysis', () => {
    it('should verify handleSendMessage function exists', () => {
      const hasFunctionDef =
        sessionsPageContent.includes('function handleSendMessage') ||
        sessionsPageContent.includes('async function handleSendMessage');
      const hasArrowFunction = sessionsPageContent.match(/const handleSendMessage\s*=\s*async/);

      console.log('✓ handleSendMessage function defined:', hasFunctionDef || !!hasArrowFunction);

      if (!hasFunctionDef && !hasArrowFunction) {
        console.error('❌ ISSUE: handleSendMessage function not defined');
      }
    });

    it('should verify handleSendMessage is connected to MessageInput', () => {
      const hasEventBinding = sessionsPageContent.match(
        /<MessageInput[\s\S]*?on:send={handleSendMessage}/
      );

      console.log('✓ MessageInput on:send event bound:', !!hasEventBinding);

      if (!hasEventBinding) {
        console.error('❌ ISSUE: MessageInput on:send event not bound to handleSendMessage');
        console.log(
          'MessageInput usage:',
          sessionsPageContent.match(/<MessageInput[^>]*>/)?.[0] || 'Not found'
        );
      }
    });

    it('should verify handleSendMessage calls sendMessage service', () => {
      const functionBody =
        sessionsPageContent.match(
          /(?:async )?function handleSendMessage[\s\S]*?{([\s\S]*?)(?=\n  (?:async )?function|\n  onMount|\n<\/script>)/
        )?.[1] || '';

      const callsSendMessage =
        functionBody.includes('sendMessage(') || functionBody.includes('await sendMessage');

      console.log('✓ handleSendMessage calls sendMessage:', callsSendMessage);

      if (!callsSendMessage) {
        console.error('❌ ISSUE: handleSendMessage does not call sendMessage service');
        console.log('Function body preview:', functionBody.substring(0, 200));
      }
    });
  });

  describe('4. Store Integration Analysis', () => {
    it('should verify messages store is imported', () => {
      const hasImport =
        sessionsPageContent.includes('messages') &&
        (sessionsPageContent.includes('from') || sessionsPageContent.includes('import'));

      console.log('✓ messages store imported:', hasImport);

      if (!hasImport) {
        console.error('❌ ISSUE: messages store not imported');
      }
    });

    it('should verify chatMode store is used', () => {
      const hasImport = sessionsPageContent.includes('chatMode');
      const hasUsage =
        sessionsPageContent.includes('$chatMode') || sessionsPageContent.includes('$chatModeStore');

      console.log('✓ chatMode store imported:', hasImport);
      console.log('✓ chatMode store used:', hasUsage);

      if (!hasUsage) {
        console.error('❌ ISSUE: chatMode store not properly used');
      }
    });

    it('should verify messages are displayed from store', () => {
      const usesMessagesStore =
        sessionsPageContent.includes('$messages') || messageListContent.includes('$messages');

      console.log('✓ Messages displayed from store:', usesMessagesStore);

      if (!usesMessagesStore) {
        console.error('❌ ISSUE: Messages not displayed from store');
      }
    });
  });

  describe('5. API Integration Analysis', () => {
    it('should verify messages are saved to session API', () => {
      const hasSaveLogic =
        sessionsPageContent.includes('/api/sessions/') && sessionsPageContent.includes('/messages');
      const hasSaveFunction =
        sessionsPageContent.includes('saveMessageToSession') ||
        sessionsPageContent.includes('saveMessage');

      console.log('✓ Session messages API endpoint used:', hasSaveLogic);
      console.log('✓ Save message function exists:', hasSaveFunction);

      if (!hasSaveLogic && !hasSaveFunction) {
        console.error('❌ ISSUE: No logic to save messages to session API');
      }
    });

    it('should verify messages are loaded from session API', () => {
      const hasLoadLogic =
        sessionsPageContent.includes('/api/sessions/') &&
        sessionsPageContent.includes('/messages') &&
        sessionsPageContent.includes('GET');
      const hasSelectSession = sessionsPageContent.includes('selectSession');

      console.log('✓ Load messages from API:', hasLoadLogic || hasSelectSession);

      if (!hasLoadLogic && !hasSelectSession) {
        console.error('❌ ISSUE: No logic to load messages from session API');
      }
    });

    it('should verify sendMessage service calls /api/chat', () => {
      const callsApiChat = chatServicesContent.includes('/api/chat');
      const hasFetchCall =
        chatServicesContent.includes('fetch(') && chatServicesContent.includes('/api/chat');

      console.log('✓ sendMessage calls /api/chat:', callsApiChat);
      console.log('✓ sendMessage has fetch call:', hasFetchCall);

      if (!hasFetchCall) {
        console.error('❌ ISSUE: sendMessage does not call /api/chat');
      }
    });
  });

  describe('6. Message Flow Analysis', () => {
    it('should trace complete message flow', () => {
      console.log('\n📊 Message Flow Trace:');
      console.log('1. User types in MessageInput ✓');

      const step2 = messageInputContent.includes("dispatch('send'");
      console.log('2. MessageInput dispatches send event:', step2 ? '✓' : '❌');

      const step3 = sessionsPageContent.includes('on:send={handleSendMessage}');
      console.log('3. Sessions page handles send event:', step3 ? '✓' : '❌');

      const step4 = sessionsPageContent.includes('sendMessage(');
      console.log('4. handleSendMessage calls sendMessage service:', step4 ? '✓' : '❌');

      const step5 = chatServicesContent.includes('addMessage(');
      console.log('5. sendMessage adds message to store:', step5 ? '✓' : '❌');

      const step6 =
        sessionsPageContent.includes('saveMessageToSession') ||
        sessionsPageContent.includes('/api/sessions/');
      console.log('6. Message saved to session API:', step6 ? '✓' : '❌');

      const step7 = messageListContent.includes('$messages');
      console.log('7. MessageList displays from store:', step7 ? '✓' : '❌');

      const allStepsWork = step2 && step3 && step4 && step5 && step6 && step7;
      if (!allStepsWork) {
        console.error('\n❌ ISSUE: Message flow is broken at one or more steps');
      }
    });
  });

  describe('7. Specific Bug Detection', () => {
    it('should check for common issues', () => {
      const issues = [];

      // Check if MessageInput is outside the text mode conditional
      if (
        sessionsPageContent.includes('<MessageInput') &&
        !sessionsPageContent.match(/{#if \$chatModeStore === ['"]text['"][\s\S]*?<MessageInput/)
      ) {
        issues.push('MessageInput might not be in text mode conditional');
      }

      // Check if handleSendMessage is async
      if (
        sessionsPageContent.includes('function handleSendMessage') &&
        !sessionsPageContent.includes('async function handleSendMessage')
      ) {
        issues.push('handleSendMessage might not be async');
      }

      // Check if sendMessage is awaited
      const handleSendBody =
        sessionsPageContent.match(/function handleSendMessage[\s\S]*?{([\s\S]*?)}/)?.[1] || '';
      if (
        handleSendBody.includes('sendMessage(') &&
        !handleSendBody.includes('await sendMessage')
      ) {
        issues.push('sendMessage might not be awaited in handleSendMessage');
      }

      // Check if messages store is subscribed
      if (
        !sessionsPageContent.includes('$messages') &&
        !sessionsPageContent.includes('messages.subscribe')
      ) {
        issues.push('messages store might not be subscribed');
      }

      // Check if event.detail is used
      if (handleSendBody && !handleSendBody.includes('event.detail')) {
        issues.push('handleSendMessage might not be extracting event.detail');
      }

      console.log('\n🔍 Specific Issues Found:');
      if (issues.length === 0) {
        console.log('✓ No common issues detected');
      } else {
        issues.forEach((issue) => {
          console.error('❌', issue);
        });
      }

      expect(issues.length).toBe(0);
    });
  });

  describe('8. Comparison with Voice Mode', () => {
    it('should compare text mode vs voice mode implementation', () => {
      console.log('\n🔄 Text Mode vs Voice Mode Comparison:');

      // Check if voice mode has working message handling
      const voiceHasMessages = sessionsPageContent.match(
        /{#if \$chatModeStore === ['"]voice['"][\s\S]*?messages/i
      );
      console.log('Voice mode handles messages:', !!voiceHasMessages);

      // Check if text mode has similar structure
      const textHasMessages = sessionsPageContent.match(
        /{#if \$chatModeStore === ['"]text['"][\s\S]*?messages/i
      );
      console.log('Text mode handles messages:', !!textHasMessages);

      if (voiceHasMessages && !textHasMessages) {
        console.error('❌ ISSUE: Voice mode has message handling but text mode does not');
      }
    });
  });

  describe('9. Summary Report', () => {
    it('should generate summary of all issues', () => {
      console.log('\n' + '='.repeat(60));
      console.log('📋 DIAGNOSTIC SUMMARY');
      console.log('='.repeat(60));

      const checks = {
        'Component Imports': true,
        'Component Rendering': true,
        'Event Handlers': true,
        'Store Integration': true,
        'API Integration': true,
        'Message Flow': true
      };

      console.log('\nStatus by Category:');
      Object.entries(checks).forEach(([category, status]) => {
        console.log(`${status ? '✓' : '❌'} ${category}`);
      });

      console.log('\n' + '='.repeat(60));
      console.log('Run the integration tests for detailed analysis');
      console.log('='.repeat(60) + '\n');
    });
  });
});
