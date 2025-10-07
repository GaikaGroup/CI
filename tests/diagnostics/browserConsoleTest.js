/**
 * Browser Console Test Script for Sessions Page Text Mode
 *
 * Copy and paste this into the browser console when on /sessions page
 * to diagnose text mode issues
 */

(function () {
  console.log('🔍 Sessions Page Text Mode Diagnostics');
  console.log('='.repeat(60));

  const issues = [];
  const warnings = [];
  const info = [];

  // 1. Check if we're on the sessions page
  if (!window.location.pathname.includes('/sessions')) {
    console.error('❌ Not on /sessions page. Navigate to /sessions first.');
    return;
  }
  info.push('✓ On /sessions page');

  // 2. Check for MessageInput component
  const messageInput =
    document.querySelector('input[type="text"][placeholder*="message"]') ||
    document.querySelector('textarea[placeholder*="message"]');
  if (messageInput) {
    info.push('✓ Message input field found');
    console.log('Input element:', messageInput);
  } else {
    issues.push('❌ Message input field not found');
  }

  // 3. Check for send button
  const sendButton =
    document.querySelector('button[aria-label*="send"]') ||
    Array.from(document.querySelectorAll('button')).find(
      (btn) => btn.textContent.toLowerCase().includes('send') || btn.querySelector('svg') // Icon button
    );
  if (sendButton) {
    info.push('✓ Send button found');
    console.log('Send button:', sendButton);
  } else {
    issues.push('❌ Send button not found');
  }

  // 4. Check for messages container
  const messagesContainer =
    document.querySelector('.messages-area') ||
    document.querySelector('[class*="message-list"]') ||
    document.querySelector('[class*="messages"]');
  if (messagesContainer) {
    info.push('✓ Messages container found');
    console.log('Messages container:', messagesContainer);
  } else {
    issues.push('❌ Messages container not found');
  }

  // 5. Check for mode toggle buttons
  const textModeButton = Array.from(document.querySelectorAll('button')).find((btn) =>
    btn.textContent.toLowerCase().includes('text')
  );
  const voiceModeButton = Array.from(document.querySelectorAll('button')).find((btn) =>
    btn.textContent.toLowerCase().includes('voice')
  );

  if (textModeButton && voiceModeButton) {
    info.push('✓ Mode toggle buttons found');

    // Check which mode is active
    const textActive =
      textModeButton.classList.contains('active') ||
      textModeButton.getAttribute('aria-selected') === 'true';
    const voiceActive =
      voiceModeButton.classList.contains('active') ||
      voiceModeButton.getAttribute('aria-selected') === 'true';

    if (textActive) {
      info.push('✓ Text mode is active');
    } else if (voiceActive) {
      warnings.push('⚠️  Voice mode is active (switch to text mode)');
    } else {
      warnings.push('⚠️  Cannot determine active mode');
    }
  } else {
    issues.push('❌ Mode toggle buttons not found');
  }

  // 6. Check for VoiceChat component (should be hidden in text mode)
  const voiceChat =
    document.querySelector('[class*="voice-chat"]') ||
    Array.from(document.querySelectorAll('*')).find(
      (el) =>
        el.textContent.includes('Voice Chat Mode') ||
        el.textContent.includes('Talk to your AI tutor')
    );
  if (voiceChat) {
    const isVisible = voiceChat.offsetParent !== null;
    if (isVisible) {
      issues.push('❌ VoiceChat component visible in text mode');
    } else {
      info.push('✓ VoiceChat component hidden');
    }
  }

  // 7. Check for existing messages
  const messageElements = document.querySelectorAll('[class*="message"]');
  info.push(`ℹ️  Found ${messageElements.length} message elements`);

  // 8. Test message input functionality
  if (messageInput) {
    console.log('\n📝 Testing message input...');

    // Store original value
    const originalValue = messageInput.value;

    // Try to set a value
    messageInput.value = 'Test message';
    messageInput.dispatchEvent(new Event('input', { bubbles: true }));

    if (messageInput.value === 'Test message') {
      info.push('✓ Message input accepts text');
    } else {
      issues.push('❌ Message input does not accept text');
    }

    // Restore original value
    messageInput.value = originalValue;
    messageInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // 9. Check for event listeners
  if (sendButton) {
    const listeners = getEventListeners ? getEventListeners(sendButton) : null;
    if (listeners && listeners.click) {
      info.push(`✓ Send button has ${listeners.click.length} click listener(s)`);
    } else {
      warnings.push('⚠️  Cannot verify send button event listeners (use Chrome DevTools)');
    }
  }

  if (messageInput) {
    const listeners = getEventListeners ? getEventListeners(messageInput) : null;
    if (listeners) {
      const eventTypes = Object.keys(listeners);
      info.push(`✓ Message input has listeners: ${eventTypes.join(', ')}`);
    } else {
      warnings.push('⚠️  Cannot verify message input event listeners (use Chrome DevTools)');
    }
  }

  // 10. Check Svelte stores (if accessible)
  try {
    // Try to access window.__SVELTE__ or other debug info
    if (window.__SVELTE__) {
      info.push('✓ Svelte debug info available');
    }
  } catch (e) {
    warnings.push('⚠️  Cannot access Svelte internals');
  }

  // 11. Check for console errors
  console.log('\n📊 Checking for console errors...');
  console.log('(Check the Console tab for any red error messages)');

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 DIAGNOSTIC SUMMARY');
  console.log('='.repeat(60));

  if (info.length > 0) {
    console.log('\n✅ Information:');
    info.forEach((msg) => console.log('  ' + msg));
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach((msg) => console.warn('  ' + msg));
  }

  if (issues.length > 0) {
    console.log('\n❌ Issues Found:');
    issues.forEach((msg) => console.error('  ' + msg));
  } else {
    console.log('\n✅ No critical issues found!');
  }

  // 12. Provide interactive test functions
  console.log('\n' + '='.repeat(60));
  console.log('🧪 INTERACTIVE TESTS');
  console.log('='.repeat(60));
  console.log('\nRun these functions to test functionality:\n');

  window.testSendMessage = function () {
    console.log('Testing send message...');
    if (!messageInput) {
      console.error('❌ Message input not found');
      return;
    }

    messageInput.value = 'Test message from console';
    messageInput.dispatchEvent(new Event('input', { bubbles: true }));

    if (sendButton) {
      console.log('Clicking send button...');
      sendButton.click();
      console.log('✓ Send button clicked. Check if message appears.');
    } else {
      console.log('Simulating Enter key...');
      const enterEvent = new KeyboardEvent('keypress', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        bubbles: true
      });
      messageInput.dispatchEvent(enterEvent);
      console.log('✓ Enter key simulated. Check if message appears.');
    }
  };

  window.testModeSwitch = function () {
    console.log('Testing mode switch...');
    if (textModeButton && voiceModeButton) {
      console.log('Switching to voice mode...');
      voiceModeButton.click();
      setTimeout(() => {
        console.log('Switching back to text mode...');
        textModeButton.click();
        console.log('✓ Mode switch complete. Check if text mode works.');
      }, 1000);
    } else {
      console.error('❌ Mode toggle buttons not found');
    }
  };

  window.inspectMessageInput = function () {
    if (messageInput) {
      console.log('Message Input Details:');
      console.log('- Tag:', messageInput.tagName);
      console.log('- Type:', messageInput.type);
      console.log('- Placeholder:', messageInput.placeholder);
      console.log('- Value:', messageInput.value);
      console.log('- Disabled:', messageInput.disabled);
      console.log('- Classes:', messageInput.className);
      console.log('- Parent:', messageInput.parentElement);
      console.log('- Computed style display:', getComputedStyle(messageInput).display);
      console.log('- Computed style visibility:', getComputedStyle(messageInput).visibility);
    } else {
      console.error('❌ Message input not found');
    }
  };

  window.inspectMessages = function () {
    const messages = document.querySelectorAll('[class*="message"]');
    console.log(`Found ${messages.length} message elements:`);
    messages.forEach((msg, i) => {
      console.log(`\nMessage ${i + 1}:`);
      console.log('- Text:', msg.textContent.substring(0, 100));
      console.log('- Classes:', msg.className);
      console.log('- Visible:', msg.offsetParent !== null);
    });
  };

  console.log('testSendMessage()     - Test sending a message');
  console.log('testModeSwitch()      - Test switching between modes');
  console.log('inspectMessageInput() - Inspect message input details');
  console.log('inspectMessages()     - Inspect all message elements');

  console.log('\n' + '='.repeat(60));
  console.log('💡 TIP: Open the Elements tab to inspect the DOM structure');
  console.log('💡 TIP: Open the Network tab to see API calls');
  console.log('💡 TIP: Check the Console for any error messages');
  console.log('='.repeat(60) + '\n');

  return {
    issues,
    warnings,
    info,
    elements: {
      messageInput,
      sendButton,
      messagesContainer,
      textModeButton,
      voiceModeButton
    }
  };
})();
