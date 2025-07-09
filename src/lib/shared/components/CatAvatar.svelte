<script>
  // Keep existing imports and props
  import { onMount, onDestroy } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { get } from 'svelte/store';
  import { audioAmplitude } from '$lib/modules/chat/voiceServices';

  export let size = 'md'; // sm, md, lg
  export let speaking = false;
  export let emotion = 'neutral'; // neutral, happy, sad, surprised, angry

  // Preload all cat images
  let catImages = {
    neutral: '/images/cat/cat.png',
    happy: '/images/cat/cat_happy.png',
    surprised: '/images/cat/cat_surprised.png',
    resting: '/images/cat/cat_resting.png'
  };

  // Mouth position images
  let mouthImages = {
    a: '/images/cat/cat_mouth_a.png',
    e: '/images/cat/cat_mouth_e.png',
    o: '/images/cat/cat_mouth_o.png'
  };

  // Current images to display
  let currentCatImage = catImages.neutral;
  let currentMouthImage = null;
  let imagesLoaded = false;

  // Animation frames
  let animationFrame;
  let idleAnimationFrame;

  // Transition state
  let isTransitioning = false;
  let lastSpeakingState = false;

  // Create a tweened store for smooth amplitude transitions
  const smoothAmplitude = tweened(0, {
    duration: 50, // Reduced from 150ms to 50ms for faster response
    easing: cubicOut
  });

  // Buffer for mouth positions to prevent rapid switching
  let mouthBuffer = [];
  const BUFFER_SIZE = 2; // Reduced from 3 to 2 for faster response

  // Last mouth change timestamp for enforcing minimum duration
  let lastMouthChange = 0;
  const MIN_MOUTH_DURATION = 40; // Reduced from 100ms to 40ms for faster changes

  // Size classes (reusing from Avatar.svelte but doubled in size)
  const sizeClasses = {
    sm: {
      outer: 'w-20 h-20',
      inner: 'w-16 h-16'
    },
    md: {
      outer: 'w-32 h-32',
      inner: 'w-28 h-28'
    },
    lg: {
      outer: 'w-64 h-64',
      inner: 'w-56 h-56'
    }
  };

  // Add an idle animation function
  function startIdleAnimation() {
    if (idleAnimationFrame) cancelAnimationFrame(idleAnimationFrame);

    function updateIdle() {
      // Only run idle animation when not speaking and not transitioning
      if (!speaking && !isTransitioning) {
        // Create a very subtle breathing effect
        const time = Date.now() / 1000;
        const breathValue = Math.sin(time * 0.5) * 0.01 + 0.01; // Very subtle 0-0.02 range

        // Apply a very subtle amplitude for natural movement
        smoothAmplitude.set(breathValue);

        // Occasionally blink (about every 5 seconds)
        if (Math.random() < 0.005) {
          // 0.5% chance per frame at 60fps ≈ every 5 seconds
          // Quick blink animation
          // Implement blink logic here if you have eye animations
        }
      }

      idleAnimationFrame = requestAnimationFrame(updateIdle);
    }

    updateIdle();
  }

  // Initialize animation
  onMount(() => {
    // Preload all images
    const imagePromises = [
      ...Object.values(catImages).map((src) => loadImage(src)),
      ...Object.values(mouthImages).map((src) => loadImage(src))
    ];

    Promise.all(imagePromises).then(() => {
      imagesLoaded = true;
      updateEmotion(emotion);
      // Start idle animation
      startIdleAnimation();
    });
  });

  // Helper function to preload an image
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  // Update emotion image
  function updateEmotion(newEmotion) {
    // Map the emotion to available images, defaulting to neutral
    if (catImages[newEmotion]) {
      currentCatImage = catImages[newEmotion];
    } else if (newEmotion === 'sad' || newEmotion === 'angry') {
      // Use resting for sad/angry if specific images aren't available
      currentCatImage = catImages.resting;
    } else {
      currentCatImage = catImages.neutral;
    }
  }

  // Determine mouth position based on amplitude with hysteresis and prediction
  function getMouthPosition(amplitude) {
    // Add to buffer for smoothing
    mouthBuffer.push(amplitude);
    if (mouthBuffer.length > BUFFER_SIZE) {
      mouthBuffer.shift();
    }

    // Calculate average amplitude from buffer
    const avgAmplitude = mouthBuffer.reduce((sum, val) => sum + val, 0) / mouthBuffer.length;

    // Calculate trend (increasing or decreasing amplitude)
    let trend = 0;
    if (mouthBuffer.length >= 2) {
      trend = mouthBuffer[mouthBuffer.length - 1] - mouthBuffer[0];
    }

    // Apply predictive adjustment based on trend
    // If amplitude is increasing rapidly, anticipate a higher value
    const predictiveAmplitude = avgAmplitude + trend * 1.5;

    // Check if enough time has passed since last mouth change
    const now = Date.now();
    if (now - lastMouthChange < MIN_MOUTH_DURATION && currentMouthImage) {
      return currentMouthImage;
    }

    // Determine mouth position with lower thresholds for faster response
    let newMouthImage;
    if (predictiveAmplitude > 0.4) {
      // Lowered from 0.5 for more responsiveness
      newMouthImage = mouthImages.o; // Wide open mouth for loud sounds
    } else if (predictiveAmplitude > 0.1) {
      // Lowered from 0.15 for more responsiveness
      newMouthImage = mouthImages.e; // Medium open mouth
    } else if (predictiveAmplitude > 0.02) {
      // Lowered from 0.03 for more responsiveness
      newMouthImage = mouthImages.a; // Slightly open mouth
    } else {
      newMouthImage = null; // Closed mouth
    }

    // Only update timestamp if mouth position actually changed
    if (newMouthImage !== currentMouthImage) {
      lastMouthChange = now;
    }

    return newMouthImage;
  }

  // Start lip-sync animation
  function startLipSync() {
    stopLipSync(); // Clear any existing animation

    // Reset buffer
    mouthBuffer = [];
    lastMouthChange = 0;

    function updateMouth() {
      if (!speaking) return;

      // Get current audio amplitude immediately
      const amplitude = get(audioAmplitude);

      // Update the smooth amplitude with tweening (faster response)
      smoothAmplitude.set(amplitude);

      // Use the amplitude directly for immediate response
      // and blend with smoothed value for stability
      const directWeight = 0.7; // Higher weight for direct amplitude for faster response
      const smoothWeight = 0.3; // Lower weight for smoothed amplitude for stability
      const blendedAmplitude = amplitude * directWeight + get(smoothAmplitude) * smoothWeight;

      // Determine mouth position with prediction for faster response
      currentMouthImage = getMouthPosition(blendedAmplitude);

      // Schedule next update with high priority
      animationFrame = requestAnimationFrame(updateMouth);
    }

    // Start animation loop immediately
    updateMouth();
  }

  // Stop lip-sync animation
  function stopLipSync() {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    // Instead of immediately setting currentMouthImage to null,
    // gradually fade it out using a tweened store
    const fadeOutDuration = 300; // ms

    // Only reset if we have a mouth image
    if (currentMouthImage) {
      // Create a temporary tweened store for fading out
      const fadeOut = tweened(1, {
        duration: fadeOutDuration,
        easing: cubicOut
      });

      // Start the fade out
      fadeOut.set(0);

      // When fade out is complete, reset the mouth image
      const unsubscribe = fadeOut.subscribe((value) => {
        if (value <= 0.05) {
          currentMouthImage = null;
          smoothAmplitude.set(0);
          mouthBuffer = [];
          unsubscribe();
        }
      });
    } else {
      // If no mouth image, just reset everything immediately
      currentMouthImage = null;
      smoothAmplitude.set(0);
      mouthBuffer = [];
    }
  }

  // Watch for changes in speaking state
  $: if (speaking !== undefined && imagesLoaded) {
    // If speaking state changed
    if (speaking !== lastSpeakingState) {
      // If transitioning from not speaking to speaking
      if (speaking) {
        isTransitioning = true;
        // Start with a gentle transition
        smoothAmplitude.set(0.05);
        startLipSync();

        // After a short delay, clear the transition flag
        setTimeout(() => {
          isTransitioning = false;
        }, 200);
      }
      // If transitioning from speaking to not speaking
      else {
        isTransitioning = true;
        stopLipSync();

        // After the fade-out duration, clear the transition flag
        setTimeout(() => {
          isTransitioning = false;
        }, 300);
      }

      lastSpeakingState = speaking;
    }
  }

  // Watch for changes in emotion
  $: if (emotion && imagesLoaded) {
    updateEmotion(emotion);
  }

  // Clean up on component destruction
  onDestroy(() => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
    if (idleAnimationFrame) {
      cancelAnimationFrame(idleAnimationFrame);
    }
  });
</script>

<div
  class="{sizeClasses[size]
    .outer} rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg relative"
>
  <div class="{sizeClasses[size].inner} rounded-full overflow-hidden relative">
    <!-- Base emotion image -->
    <img src={currentCatImage} alt="Cat avatar" class="w-full h-full object-cover" />

    <!-- Mouth overlay for lip sync -->
    {#if currentMouthImage}
      <img
        src={currentMouthImage}
        alt="Cat mouth"
        class="absolute top-0 left-0 w-full h-full object-cover"
      />
    {/if}

    <!-- Loading indicator -->
    {#if !imagesLoaded}
      <div
        class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white"
      >
        Loading...
      </div>
    {/if}
  </div>
</div>
