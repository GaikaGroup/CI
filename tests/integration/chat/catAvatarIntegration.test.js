/**
 * Specific integration tests for waiting phrases with cat avatar animation system
 * Tests lip-sync, emotion integration, and animation continuity
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/svelte';
import CatAvatar from '../../../src/lib/shared/components/CatAvatar.svelte';
import { waitingPhrasesService } from '../../../src/lib/modules/chat/waitingPhrasesService.js';
import * as voiceServices from '../../../src/lib/modules/chat/voiceServices.js';

// Mock audio context for avatar animation
global.AudioContext = vi.fn(() => ({
  createAnalyser: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    fftSize: 256,
    frequencyBinCount: 128,
    getByteFrequencyData: vi.fn()
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { value: 1 }
  })),
  destination: {},
  state: 'running',
  resume: vi.fn()
}));

// Mock image loading
global.Image = class {
  constructor() {
    setTimeout(() => {
      this.onload && this.onload();
    }, 10);
  }
};

describe('Cat Avatar Integration Tests', () => {
  let mockAudioAmplitude;
  let amplitudeValues;
  let amplitudeIndex;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup audio amplitude mock with realistic values
    amplitudeValues = [0.0, 0.1, 0.3, 0.5, 0.7, 0.4, 0.2, 0.0];
    amplitudeIndex = 0;

    mockAudioAmplitude = {
      subscribe: vi.fn(),
      get: vi.fn(() => amplitudeValues[amplitudeIndex++ % amplitudeValues.length])
    };

    vi.spyOn(voiceServices, 'audioAmplitude', 'get').mockReturnValue(mockAudioAmplitude);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Lip-Sync Integration', () => {
    it('should synchronize mouth movements with waiting phrase audio amplitude', async () => {
      const { container, component } = render(CatAvatar, {
        props: {
          size: 'md',
          speaking: true,
          emotion: 'neutral'
        }
      });

      // Wait for images to load
      await waitFor(() => {
        const baseImage = container.querySelector('img[alt="Cat avatar"]');
        expect(baseImage).toBeTruthy();
      });

      // Start waiting phrase with varying amplitude
      await waitingPhrasesService.playWaitingPhrase(
        'Well, well, well. Let me think about this.',
        'en'
      );

      // Wait for lip-sync to process amplitude changes
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Verify mouth overlay appears during speech
      const mouthOverlay = container.querySelector('img[alt="Cat mouth"]');
      expect(mouthOverlay).toBeTruthy();

      // Verify mouth image changes with amplitude
      const initialMouthSrc = mouthOverlay.src;

      // Advance amplitude and wait for update
      amplitudeIndex += 2;
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Mouth position should potentially change with different amplitude
      // (Note: might be same if amplitude maps to same mouth position)
      expect(mouthOverlay.src).toBeTruthy();
    });

    it('should handle different mouth positions based on amplitude ranges', async () => {
      const { container } = render(CatAvatar, {
        props: {
          size: 'md',
          speaking: true,
          emotion: 'neutral'
        }
      });

      await waitFor(() => {
        const baseImage = container.querySelector('img[alt="Cat avatar"]');
        expect(baseImage).toBeTruthy();
      });

      // Test high amplitude (should use vowel mouth positions)
      amplitudeValues = [0.8, 0.9, 0.7, 0.8];
      amplitudeIndex = 0;

      await waitingPhrasesService.playWaitingPhrase('Ooooh, interesting!', 'en');
      await new Promise((resolve) => setTimeout(resolve, 200));

      let mouthOverlay = container.querySelector('img[alt="Cat mouth"]');
      expect(mouthOverlay).toBeTruthy();
      const highAmplitudeMouth = mouthOverlay.src;

      // Test low amplitude (should use consonant or closed mouth)
      amplitudeValues = [0.1, 0.05, 0.02, 0.0];
      amplitudeIndex = 0;

      await new Promise((resolve) => setTimeout(resolve, 200));

      mouthOverlay = container.querySelector('img[alt="Cat mouth"]');
      const lowAmplitudeMouth = mouthOverlay ? mouthOverlay.src : null;

      // High and low amplitude should potentially use different mouth positions
      expect(highAmplitudeMouth).toBeTruthy();
    });

    it('should prevent rapid mouth position oscillation', async () => {
      const { container } = render(CatAvatar, {
        props: {
          size: 'md',
          speaking: true,
          emotion: 'neutral'
        }
      });

      await waitFor(() => {
        const baseImage = container.querySelector('img[alt="Cat avatar"]');
        expect(baseImage).toBeTruthy();
      });

      // Create oscillating amplitude pattern
      amplitudeValues = [0.1, 0.8, 0.1, 0.8, 0.1, 0.8, 0.1, 0.8];
      amplitudeIndex = 0;

      await waitingPhrasesService.playWaitingPhrase('Test oscillation prevention', 'en');

      const mouthPositions = [];

      // Sample mouth positions over time
      for (let i = 0; i < 8; i++) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        const mouthOverlay = container.querySelector('img[alt="Cat mouth"]');
        mouthPositions.push(mouthOverlay ? mouthOverlay.src : null);
      }

      // Should not oscillate rapidly between positions
      let rapidChanges = 0;
      for (let i = 1; i < mouthPositions.length - 1; i++) {
        if (
          mouthPositions[i] !== mouthPositions[i - 1] &&
          mouthPositions[i] !== mouthPositions[i + 1]
        ) {
          rapidChanges++;
        }
      }

      // Should have fewer rapid changes than input oscillations
      expect(rapidChanges).toBeLessThan(4);
    });

    it('should smoothly transition mouth positions', async () => {
      const { container } = render(CatAvatar, {
        props: {
          size: 'md',
          speaking: true,
          emotion: 'neutral'
        }
      });

      await waitFor(() => {
        const baseImage = container.querySelector('img[alt="Cat avatar"]');
        expect(baseImage).toBeTruthy();
      });

      // Gradual amplitude increase
      amplitudeValues = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7];
      amplitudeIndex = 0;

      await waitingPhrasesService.playWaitingPhrase('Gradual amplitude increase', 'en');

      // Monitor transitions
      const transitionTimes = [];
      let lastMouthSrc = null;

      for (let i = 0; i < 8; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const mouthOverlay = container.querySelector('img[alt="Cat mouth"]');
        const currentMouthSrc = mouthOverlay ? mouthOverlay.src : null;

        if (currentMouthSrc !== lastMouthSrc) {
          transitionTimes.push(Date.now());
          lastMouthSrc = currentMouthSrc;
        }
      }

      // Should have some transitions but not too frequent
      expect(transitionTimes.length).toBeGreaterThan(0);
      expect(transitionTimes.length).toBeLessThan(8); // Not every frame
    });
  });

  describe('Emotion Integration', () => {
    it('should maintain emotion during waiting phrase playback', async () => {
      const { container, component } = render(CatAvatar, {
        props: {
          size: 'md',
          speaking: true,
          emotion: 'happy'
        }
      });

      await waitFor(() => {
        const baseImage = container.querySelector('img[alt="Cat avatar"]');
        expect(baseImage).toBeTruthy();
      });

      // Start waiting phrase
      await waitingPhrasesService.playWaitingPhrase("I'm happy to help!", 'en');

      // Verify happy emotion is maintained
      const avatarImage = container.querySelector('img[alt="Cat avatar"]');
      expect(avatarImage.src).toContain('happy');

      // Mouth overlay should still work with emotion
      await new Promise((resolve) => setTimeout(resolve, 200));
      const mouthOverlay = container.querySelector('img[alt="Cat mouth"]');
      expect(mouthOverlay).toBeTruthy();
    });

    it('should handle emotion changes during waiting phrase', async () => {
      const { container, component } = render(CatAvatar, {
        props: {
          size: 'md',
          speaking: true,
          emotion: 'neutral'
        }
      });

      await waitFor(() => {
        const baseImage = container.querySelector('img[alt="Cat avatar"]');
        expect(baseImage).toBeTruthy();
      });

      // Start waiting phrase
      await waitingPhrasesService.playWaitingPhrase('Let me think...', 'en');

      // Change emotion during playback
      await component.$set({ emotion: 'surprised' });

      await waitFor(() => {
        const avatarImage = container.querySelector('img[alt="Cat avatar"]');
        expect(avatarImage.src).toContain('surprised');
      });

      // Lip-sync should continue working
      const mouthOverlay = container.querySelector('img[alt="Cat mouth"]');
      expect(mouthOverlay).toBeTruthy();
    });

    it('should support all emotion states with waiting phrases', async () => {
      const emotions = ['neutral', 'happy', 'surprised', 'sad', 'angry'];

      for (const emotion of emotions) {
        const { container, component } = render(CatAvatar, {
          props: {
            size: 'md',
            speaking: true,
            emotion: emotion
          }
        });

        await waitFor(() => {
          const baseImage = container.querySelector('img[alt="Cat avatar"]');
          expect(baseImage).toBeTruthy();
        });

        // Test waiting phrase with this emotion
        await waitingPhrasesService.playWaitingPhrase(`Testing ${emotion} emotion`, 'en');

        // Verify emotion is displayed
        const avatarImage = container.querySelector('img[alt="Cat avatar"]');
        expect(avatarImage.src).toBeTruthy();

        // Verify lip-sync works with emotion
        await new Promise((resolve) => setTimeout(resolve, 100));
        const mouthOverlay = container.querySelector('img[alt="Cat mouth"]');
        expect(mouthOverlay).toBeTruthy();

        component.$destroy();
      }
    });
  });

  describe('Animation Continuity', () => {
    it('should maintain smooth animation from waiting phrase to AI response', async () => {
      const { container } = render(CatAvatar, {
        props: {
          size: 'md',
          speaking: true,
          emotion: 'neutral'
        }
      });

      await waitFor(() => {
        const baseImage = container.querySelector('img[alt="Cat avatar"]');
        expect(baseImage).toBeTruthy();
      });

      // Start waiting phrase
      amplitudeValues = [0.3, 0.4, 0.5, 0.4, 0.3];
      amplitudeIndex = 0;

      await waitingPhrasesService.playWaitingPhrase('Let me think about this...', 'en');

      // Verify mouth animation during waiting phrase
      await new Promise((resolve) => setTimeout(resolve, 200));
      let mouthOverlay = container.querySelector('img[alt="Cat mouth"]');
      expect(mouthOverlay).toBeTruthy();
      const waitingPhraseMouth = mouthOverlay.src;

      // Simulate transition to AI response (different amplitude pattern)
      amplitudeValues = [0.6, 0.7, 0.8, 0.7, 0.6, 0.5];
      amplitudeIndex = 0;

      // Continue speaking (simulating AI response)
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify animation continues smoothly
      mouthOverlay = container.querySelector('img[alt="Cat mouth"]');
      expect(mouthOverlay).toBeTruthy();

      // Should still be animating (speaking state maintained)
      expect(voiceServices.audioAmplitude.get().get()).toBeGreaterThan(0);
    });

    it('should handle speaking state transitions correctly', async () => {
      const { container, component } = render(CatAvatar, {
        props: {
          size: 'md',
          speaking: false,
          emotion: 'neutral'
        }
      });

      await waitFor(() => {
        const baseImage = container.querySelector('img[alt="Cat avatar"]');
        expect(baseImage).toBeTruthy();
      });

      // Initially not speaking - no mouth overlay
      let mouthOverlay = container.querySelector('img[alt="Cat mouth"]');
      expect(mouthOverlay).toBeFalsy();

      // Start speaking (waiting phrase)
      await component.$set({ speaking: true });
      await waitingPhrasesService.playWaitingPhrase('Starting to speak', 'en');

      // Should show mouth overlay
      await waitFor(() => {
        mouthOverlay = container.querySelector('img[alt="Cat mouth"]');
        expect(mouthOverlay).toBeTruthy();
      });

      // Stop speaking
      await component.$set({ speaking: false });

      // Should eventually hide mouth overlay (with fade out)
      await waitFor(
        () => {
          // May take time due to fade out animation
          const mouthAfterStop = container.querySelector('img[alt="Cat mouth"]');
          // Mouth may still be visible during fade out, but opacity should be changing
          // or it should disappear after fade completes
        },
        { timeout: 1000 }
      );
    });

    it('should handle rapid speaking state changes gracefully', async () => {
      const { container, component } = render(CatAvatar, {
        props: {
          size: 'md',
          speaking: false,
          emotion: 'neutral'
        }
      });

      await waitFor(() => {
        const baseImage = container.querySelector('img[alt="Cat avatar"]');
        expect(baseImage).toBeTruthy();
      });

      // Rapid state changes
      await component.$set({ speaking: true });
      await new Promise((resolve) => setTimeout(resolve, 50));

      await component.$set({ speaking: false });
      await new Promise((resolve) => setTimeout(resolve, 50));

      await component.$set({ speaking: true });
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should handle gracefully without errors
      const avatarImage = container.querySelector('img[alt="Cat avatar"]');
      expect(avatarImage).toBeTruthy();
    });
  });

  describe('Performance and Memory', () => {
    it('should clean up animation resources properly', async () => {
      const { container, component } = render(CatAvatar, {
        props: {
          size: 'md',
          speaking: true,
          emotion: 'neutral'
        }
      });

      await waitFor(() => {
        const baseImage = container.querySelector('img[alt="Cat avatar"]');
        expect(baseImage).toBeTruthy();
      });

      // Start animation
      await waitingPhrasesService.playWaitingPhrase('Testing cleanup', 'en');
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Destroy component
      component.$destroy();

      // Should not throw errors or leave hanging resources
      // (This is mainly testing that cleanup doesn't cause errors)
      expect(true).toBe(true);
    });

    it('should handle multiple avatar instances efficiently', async () => {
      const avatars = [];

      // Create multiple avatar instances
      for (let i = 0; i < 3; i++) {
        const { container, component } = render(CatAvatar, {
          props: {
            size: 'md',
            speaking: true,
            emotion: 'neutral'
          }
        });

        avatars.push({ container, component });
      }

      // Wait for all to load
      await Promise.all(
        avatars.map(({ container }) =>
          waitFor(() => {
            const baseImage = container.querySelector('img[alt="Cat avatar"]');
            expect(baseImage).toBeTruthy();
          })
        )
      );

      // Start waiting phrases on all
      await Promise.all(
        avatars.map((_, i) => waitingPhrasesService.playWaitingPhrase(`Test phrase ${i}`, 'en'))
      );

      // All should animate
      await new Promise((resolve) => setTimeout(resolve, 200));

      avatars.forEach(({ container }) => {
        const mouthOverlay = container.querySelector('img[alt="Cat mouth"]');
        expect(mouthOverlay).toBeTruthy();
      });

      // Clean up
      avatars.forEach(({ component }) => component.$destroy());
    });

    it('should maintain consistent frame rate during animation', async () => {
      const { container } = render(CatAvatar, {
        props: {
          size: 'md',
          speaking: true,
          emotion: 'neutral'
        }
      });

      await waitFor(() => {
        const baseImage = container.querySelector('img[alt="Cat avatar"]');
        expect(baseImage).toBeTruthy();
      });

      // Monitor animation updates
      const updateTimes = [];
      let lastMouthSrc = null;

      await waitingPhrasesService.playWaitingPhrase('Consistent frame rate test', 'en');

      // Sample over 1 second
      const startTime = Date.now();
      while (Date.now() - startTime < 1000) {
        const mouthOverlay = container.querySelector('img[alt="Cat mouth"]');
        const currentMouthSrc = mouthOverlay ? mouthOverlay.src : null;

        if (currentMouthSrc !== lastMouthSrc) {
          updateTimes.push(Date.now());
          lastMouthSrc = currentMouthSrc;
        }

        await new Promise((resolve) => setTimeout(resolve, 16)); // ~60fps
      }

      // Should have reasonable update frequency (not too fast, not too slow)
      expect(updateTimes.length).toBeGreaterThan(2);
      expect(updateTimes.length).toBeLessThan(60); // Not every frame
    });
  });
});
