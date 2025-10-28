/**
 * Voice Mode UX Validation Tests
 * End-to-end tests for user experience validation
 */

import { test, expect } from '@playwright/test';

test.describe('Voice Mode UX Enhancement', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Mock audio APIs for testing
    await page.addInitScript(() => {
      // Mock AudioContext
      window.AudioContext = class MockAudioContext {
        constructor() {
          this.state = 'running';
          this.currentTime = 0;
          this.sampleRate = 44100;
          this.destination = {};
        }

        createBuffer() {
          return { duration: 1, getChannelData: () => new Float32Array(1024) };
        }
        createBufferSource() {
          return { connect: () => {}, start: () => {}, onended: null };
        }
        createGain() {
          return {
            gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, value: 1 },
            connect: () => {}
          };
        }
        createAnalyser() {
          return { fftSize: 256, getByteFrequencyData: () => {} };
        }
        createMediaStreamSource() {
          return { connect: () => {} };
        }
        decodeAudioData() {
          return Promise.resolve({ duration: 1, getChannelData: () => new Float32Array(1024) });
        }
        resume() {
          return Promise.resolve();
        }
      };

      // Mock getUserMedia
      navigator.mediaDevices = {
        getUserMedia: () =>
          Promise.resolve({
            getTracks: () => [{ stop: () => {} }]
          })
      };

      // Mock fetch for synthesis
      const originalFetch = window.fetch;
      window.fetch = (url, options) => {
        if (url.includes('/api/synthesize')) {
          return Promise.resolve({
            ok: true,
            blob: () => Promise.resolve(new Blob(['mock audio'], { type: 'audio/wav' }))
          });
        }
        return originalFetch(url, options);
      };
    });
  });

  test.describe('Audio Stuttering Prevention', () => {
    test('should play audio without stuttering', async ({ page }) => {
      // Enable voice mode
      await page.click('[data-testid="voice-mode-toggle"]');
      await expect(page.locator('[data-testid="voice-mode-indicator"]')).toBeVisible();

      // Send a message to trigger voice response
      await page.fill('[data-testid="chat-input"]', 'Tell me about the weather');
      await page.click('[data-testid="send-button"]');

      // Wait for voice synthesis to start
      await page.waitForSelector('[data-testid="speaking-indicator"]', { timeout: 5000 });

      // Monitor for stuttering indicators
      const stutteringEvents = [];
      page.on('console', (msg) => {
        if (msg.text().includes('stuttering') || msg.text().includes('audio gap')) {
          stutteringEvents.push(msg.text());
        }
      });

      // Wait for response to complete
      await page.waitForSelector('[data-testid="speaking-indicator"]', {
        state: 'hidden',
        timeout: 10000
      });

      // Verify no stuttering occurred
      expect(stutteringEvents.length).toBe(0);
    });

    test('should handle waiting phrases smoothly', async ({ page }) => {
      await page.click('[data-testid="voice-mode-toggle"]');

      // Send a complex question that would trigger waiting phrases
      await page.fill('[data-testid="chat-input"]', 'Explain quantum physics in detail');
      await page.click('[data-testid="send-button"]');

      // Should show waiting phrase indicator
      await expect(page.locator('[data-testid="waiting-phrase-indicator"]')).toBeVisible({
        timeout: 2000
      });

      // Monitor audio continuity
      let audioGaps = 0;
      page.on('console', (msg) => {
        if (msg.text().includes('audio gap') || msg.text().includes('stuttering')) {
          audioGaps++;
        }
      });

      // Wait for full response
      await page.waitForSelector('[data-testid="speaking-indicator"]', {
        state: 'hidden',
        timeout: 15000
      });

      // Should have minimal audio gaps
      expect(audioGaps).toBeLessThan(2);
    });
  });

  test.describe('Avatar Mouth Synchronization', () => {
    test('should close mouth properly when speech ends', async ({ page }) => {
      await page.click('[data-testid="voice-mode-toggle"]');

      // Send a short message
      await page.fill('[data-testid="chat-input"]', 'Hello');
      await page.click('[data-testid="send-button"]');

      // Wait for speaking to start
      await page.waitForSelector('[data-testid="avatar-speaking"]', { timeout: 5000 });

      // Verify mouth is open during speech
      const mouthDuringSpeech = await page
        .locator('[data-testid="avatar-mouth"]')
        .getAttribute('data-state');
      expect(mouthDuringSpeech).not.toBe('closed');

      // Wait for speaking to end
      await page.waitForSelector('[data-testid="avatar-speaking"]', {
        state: 'hidden',
        timeout: 10000
      });

      // Wait a bit for mouth to close
      await page.waitForTimeout(500);

      // Verify mouth is closed after speech
      const mouthAfterSpeech = await page
        .locator('[data-testid="avatar-mouth"]')
        .getAttribute('data-state');
      expect(mouthAfterSpeech).toBe('closed');
    });

    test('should synchronize mouth movements with audio', async ({ page }) => {
      await page.click('[data-testid="voice-mode-toggle"]');

      await page.fill('[data-testid="chat-input"]', 'This is a test of mouth synchronization');
      await page.click('[data-testid="send-button"]');

      // Monitor mouth position changes
      const mouthChanges = [];

      // Set up mutation observer for mouth changes
      await page.evaluate(() => {
        const avatar = document.querySelector('[data-testid="avatar-mouth"]');
        if (avatar) {
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.type === 'attributes' && mutation.attributeName === 'data-state') {
                window.mouthChanges = window.mouthChanges || [];
                window.mouthChanges.push({
                  state: avatar.getAttribute('data-state'),
                  timestamp: Date.now()
                });
              }
            });
          });
          observer.observe(avatar, { attributes: true });
        }
      });

      // Wait for speech to complete
      await page.waitForSelector('[data-testid="speaking-indicator"]', {
        state: 'hidden',
        timeout: 10000
      });

      // Get mouth changes
      const changes = await page.evaluate(() => window.mouthChanges || []);

      // Should have multiple mouth position changes during speech
      expect(changes.length).toBeGreaterThan(3);
    });
  });

  test.describe('Interruption Handling', () => {
    test('should handle user interruption gracefully', async ({ page }) => {
      await page.click('[data-testid="voice-mode-toggle"]');

      // Start a long response
      await page.fill(
        '[data-testid="chat-input"]',
        'Tell me a very long story about space exploration'
      );
      await page.click('[data-testid="send-button"]');

      // Wait for speaking to start
      await page.waitForSelector('[data-testid="speaking-indicator"]', { timeout: 5000 });

      // Simulate interruption by clicking interrupt button or sending new message
      await page.waitForTimeout(2000); // Let it speak for 2 seconds
      await page.click('[data-testid="interrupt-button"]');

      // Should show interruption acknowledgment
      await expect(page.locator('[data-testid="interruption-response"]')).toBeVisible({
        timeout: 3000
      });

      // Should offer continuation options
      await expect(page.locator('[data-testid="continuation-options"]')).toBeVisible({
        timeout: 2000
      });
    });

    test('should detect language in interruption', async ({ page }) => {
      await page.click('[data-testid="voice-mode-toggle"]');

      // Start English response
      await page.fill('[data-testid="chat-input"]', 'Tell me about the weather');
      await page.click('[data-testid="send-button"]');

      await page.waitForSelector('[data-testid="speaking-indicator"]', { timeout: 5000 });

      // Interrupt with Spanish text (simulating voice input)
      await page.waitForTimeout(1000);
      await page.fill('[data-testid="chat-input"]', '¿Puedes hablar en español?');
      await page.click('[data-testid="send-button"]');

      // Should detect Spanish and respond accordingly
      await expect(page.locator('[data-testid="language-detected"]')).toContainText('es', {
        timeout: 3000
      });
    });

    test('should offer continuation choices', async ({ page }) => {
      await page.click('[data-testid="voice-mode-toggle"]');

      await page.fill('[data-testid="chat-input"]', 'Explain machine learning algorithms');
      await page.click('[data-testid="send-button"]');

      await page.waitForSelector('[data-testid="speaking-indicator"]', { timeout: 5000 });

      // Interrupt
      await page.waitForTimeout(2000);
      await page.click('[data-testid="interrupt-button"]');

      // Should show continuation options
      await expect(page.locator('[data-testid="continue-option"]')).toBeVisible();
      await expect(page.locator('[data-testid="restart-option"]')).toBeVisible();
      await expect(page.locator('[data-testid="new-question-option"]')).toBeVisible();

      // Test continue option
      await page.click('[data-testid="continue-option"]');
      await expect(page.locator('[data-testid="speaking-indicator"]')).toBeVisible({
        timeout: 3000
      });
    });
  });

  test.describe('Performance Validation', () => {
    test('should maintain responsive UI during voice interactions', async ({ page }) => {
      await page.click('[data-testid="voice-mode-toggle"]');

      // Start multiple voice interactions
      const messages = [
        'What is artificial intelligence?',
        'How does machine learning work?',
        'Explain neural networks'
      ];

      for (const message of messages) {
        const startTime = Date.now();

        await page.fill('[data-testid="chat-input"]', message);
        await page.click('[data-testid="send-button"]');

        // UI should remain responsive
        const responseTime = Date.now() - startTime;
        expect(responseTime).toBeLessThan(1000); // Should respond within 1 second

        // Wait a bit before next message
        await page.waitForTimeout(500);
      }
    });

    test('should handle rapid user inputs without breaking', async ({ page }) => {
      await page.click('[data-testid="voice-mode-toggle"]');

      // Send rapid messages
      for (let i = 0; i < 5; i++) {
        await page.fill('[data-testid="chat-input"]', `Quick message ${i + 1}`);
        await page.click('[data-testid="send-button"]');
        await page.waitForTimeout(100); // Very short delay
      }

      // Should not crash or show errors
      await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();

      // Voice mode should still be active
      await expect(page.locator('[data-testid="voice-mode-indicator"]')).toBeVisible();
    });
  });

  test.describe('Error Recovery', () => {
    test('should recover from synthesis failures', async ({ page }) => {
      // Mock synthesis failure
      await page.addInitScript(() => {
        let failCount = 0;
        const originalFetch = window.fetch;
        window.fetch = (url, options) => {
          if (url.includes('/api/synthesize') && failCount < 2) {
            failCount++;
            return Promise.reject(new Error('Synthesis failed'));
          }
          return originalFetch(url, options);
        };
      });

      await page.click('[data-testid="voice-mode-toggle"]');

      await page.fill('[data-testid="chat-input"]', 'Test synthesis recovery');
      await page.click('[data-testid="send-button"]');

      // Should show error recovery message
      await expect(page.locator('[data-testid="synthesis-error"]')).toBeVisible({ timeout: 5000 });

      // Should offer text-only fallback
      await expect(page.locator('[data-testid="text-fallback"]')).toBeVisible();

      // Voice mode should still be functional
      await expect(page.locator('[data-testid="voice-mode-indicator"]')).toBeVisible();
    });

    test('should handle network issues gracefully', async ({ page }) => {
      await page.click('[data-testid="voice-mode-toggle"]');

      // Simulate network failure
      await page.route('**/api/synthesize', (route) => {
        route.abort('failed');
      });

      await page.fill('[data-testid="chat-input"]', 'Test network failure');
      await page.click('[data-testid="send-button"]');

      // Should show appropriate error message
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible({ timeout: 5000 });

      // Should not crash the application
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should be accessible with keyboard navigation', async ({ page }) => {
      // Test keyboard navigation
      await page.keyboard.press('Tab'); // Navigate to voice toggle
      await page.keyboard.press('Enter'); // Activate voice mode

      await expect(page.locator('[data-testid="voice-mode-indicator"]')).toBeVisible();

      // Navigate to input field
      await page.keyboard.press('Tab');
      await page.keyboard.type('Test accessibility');
      await page.keyboard.press('Enter');

      // Should work without mouse interaction
      await expect(page.locator('[data-testid="speaking-indicator"]')).toBeVisible({
        timeout: 5000
      });
    });

    test('should provide screen reader announcements', async ({ page }) => {
      await page.click('[data-testid="voice-mode-toggle"]');

      // Check for ARIA live regions
      await expect(page.locator('[aria-live="polite"]')).toBeVisible();

      await page.fill('[data-testid="chat-input"]', 'Test screen reader');
      await page.click('[data-testid="send-button"]');

      // Should announce voice activity
      await expect(page.locator('[aria-live="polite"]')).toContainText('Speaking', {
        timeout: 5000
      });
    });
  });
});
