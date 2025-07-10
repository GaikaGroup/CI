<script>
  // Keep existing imports and props
  //
  // Anti-blinking improvements:
  // 1. Increased tweened duration from 30ms to 80ms for smoother transitions
  // 2. Increased buffer size from 2 to 3 for more stability
  // 3. Increased minimum mouth duration from 30ms to 100ms to prevent rapid changes
  // 4. Reduced predictive amplitude factor from 2.0 to 0.8 to avoid over-amplifying changes
  // 5. Adjusted weights to favor smoothed values (0.4/0.6) for less blinking
  // 6. Reduced predictive boost and increased threshold for applying it
  // 7. Enhanced anti-oscillation logic to detect and prevent rapid changes
  // 8. Added frequency analysis to prevent overuse of certain mouth positions
  // 9. Added CSS transitions for smoother visual changes
  // 10. Improved animation timing with a small delay for more natural pacing
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
    o: '/images/cat/cat_mouth_o.png',
    b: '/images/cat/cat_mouth_b.png',
    ch: '/images/cat/cat_mouth_ch.png',
    j: '/images/cat/cat_mouth_j.png',
    m: '/images/cat/cat_mouth_m.png',
    p: '/images/cat/cat_mouth_p.png',
    r: '/images/cat/cat_mouth_r.png',
    s: '/images/cat/cat_mouth_s.png',
    sh: '/images/cat/cat_mouth_sh.png',
    w: '/images/cat/cat_mouth_w.png'
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
    duration: 80, // Increased from 30ms to 80ms for smoother transitions and less blinking
    easing: cubicOut
  });

  // Buffer for mouth positions to prevent rapid switching
  let mouthBuffer = [];
  const BUFFER_SIZE = 3; // Increased from 2 to 3 for more stability and less blinking

  // Last mouth change timestamp for enforcing minimum duration
  let lastMouthChange = 0;
  const MIN_MOUTH_DURATION = 100; // Increased from 30ms to 100ms to prevent rapid mouth position changes

  // Track the last few mouth positions to prevent oscillation
  let lastMouthPositions = [];
  const MOUTH_HISTORY_SIZE = 5; // Increased from 3 to 5 to track more history for better anti-oscillation

  // Track frequency of mouth position changes to detect and prevent rapid oscillation
  let mouthPositionCounts = {};

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

  // Determine mouth position based on amplitude with improved consonant detection
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
    let trendStrength = 0;
    if (mouthBuffer.length >= 2) {
      trend = mouthBuffer[mouthBuffer.length - 1] - mouthBuffer[0];
      // Calculate how strong/sudden the trend is (useful for detecting consonants)
      trendStrength = Math.abs(trend) / avgAmplitude;
    }

    // Apply predictive adjustment based on trend
    // If amplitude is increasing rapidly, anticipate a higher value
    // Reduced from 2.0 to 0.8 to avoid over-amplifying small changes and causing blinking
    const predictiveAmplitude = avgAmplitude + trend * 0.8;

    // Check if enough time has passed since last mouth change
    const now = Date.now();
    if (now - lastMouthChange < MIN_MOUTH_DURATION && currentMouthImage) {
      return currentMouthImage;
    }

    // Determine mouth position with improved consonant detection
    let newMouthImage;

    // Detect sudden amplitude changes which often indicate consonants
    const isConsonantPattern =
      trendStrength > 0.5 ||
      (mouthBuffer.length >= 2 &&
        Math.abs(mouthBuffer[mouthBuffer.length - 1] - mouthBuffer[mouthBuffer.length - 2]) > 0.15);

    // Detect specific patterns for different consonant types
    const isStopConsonant = trend < -0.2 && avgAmplitude < 0.3; // For b, p sounds (sudden drop)
    const isFricative = avgAmplitude > 0.15 && avgAmplitude < 0.4 && Math.abs(trend) < 0.1; // For s, sh, f sounds (steady mid-level)
    const isNasal = avgAmplitude < 0.15 && avgAmplitude > 0.05; // For m, n sounds (low but present)

    // Add to mouth position history to prevent oscillation
    if (lastMouthPositions.length >= MOUTH_HISTORY_SIZE) {
      lastMouthPositions.shift();
    }

    // High amplitude - vowels and some consonants
    if (predictiveAmplitude > 0.35) {
      // Lowered from 0.4 for better responsiveness
      if (isConsonantPattern) {
        // Consonant at high amplitude - likely ch, j, sh
        if (isStopConsonant) {
          newMouthImage = mouthImages.b; // Stop consonant (b, p)
        } else if (isFricative) {
          // Alternate between sh and ch for variety
          newMouthImage = lastMouthPositions.includes(mouthImages.sh)
            ? mouthImages.ch
            : mouthImages.sh;
        } else {
          newMouthImage = mouthImages.j; // Default to j for other consonant patterns
        }
      } else {
        // Vowel at high amplitude - likely o sound
        newMouthImage = mouthImages.o;
      }
    }
    // Medium amplitude - mix of vowels and consonants
    else if (predictiveAmplitude > 0.08) {
      // Lowered from 0.1 for better responsiveness
      if (isConsonantPattern) {
        // Consonant at medium amplitude
        if (isStopConsonant) {
          // Alternate between b and p for variety
          newMouthImage = lastMouthPositions.includes(mouthImages.b)
            ? mouthImages.p
            : mouthImages.b;
        } else if (isFricative) {
          // Alternate between s and r for variety
          newMouthImage = lastMouthPositions.includes(mouthImages.s)
            ? mouthImages.r
            : mouthImages.s;
        } else {
          newMouthImage = mouthImages.w; // Default to w for other consonant patterns
        }
      } else {
        // Vowel at medium amplitude - likely e sound
        newMouthImage = mouthImages.e;
      }
    }
    // Low amplitude - mostly consonants and quiet vowels
    else if (predictiveAmplitude > 0.02) {
      if (isNasal || isStopConsonant) {
        newMouthImage = mouthImages.m; // Nasal consonant (m)
      } else {
        // Quiet vowel - likely a sound
        newMouthImage = mouthImages.a;
      }
    }
    // Very low amplitude - closed mouth
    else {
      newMouthImage = null; // Closed mouth
    }

    // Enhanced anti-oscillation logic to prevent rapid blinking
    // Check for oscillation patterns in the history
    if (lastMouthPositions.length >= 2) {
      // Case 1: If we're about to switch back to a recently used position (oscillation)
      if (
        lastMouthPositions[lastMouthPositions.length - 1] !== newMouthImage &&
        lastMouthPositions.includes(newMouthImage)
      ) {
        // Stick with current position to prevent oscillation
        newMouthImage = currentMouthImage || newMouthImage;
      }

      // Case 2: If we've changed positions very recently and the amplitude change is small
      const recentPositionChange =
        lastMouthPositions[lastMouthPositions.length - 1] !==
        lastMouthPositions[lastMouthPositions.length - 2];
      const smallAmplitudeChange = Math.abs(predictiveAmplitude - avgAmplitude) < 0.1;

      if (recentPositionChange && smallAmplitudeChange) {
        // Stick with current position for stability during small changes
        newMouthImage = currentMouthImage || newMouthImage;
      }
    }

    // Add to history
    lastMouthPositions.push(newMouthImage);

    // Track frequency of mouth position changes to detect and prevent rapid oscillation
    if (newMouthImage !== currentMouthImage) {
      // Update timestamp for last mouth change
      lastMouthChange = now;

      // Update frequency counter for this mouth position
      const positionKey = newMouthImage ? newMouthImage.split('/').pop() : 'null';
      mouthPositionCounts[positionKey] = (mouthPositionCounts[positionKey] || 0) + 1;

      // If this position is being used too frequently in a short time,
      // and we're not in a stable state (e.g., consistently high amplitude),
      // stick with the current position to reduce blinking
      const isFrequentlyUsed = mouthPositionCounts[positionKey] > 3;
      const isRapidChange =
        lastMouthPositions.length >= 3 && new Set(lastMouthPositions.slice(-3)).size > 2;

      if (isFrequentlyUsed && isRapidChange) {
        // Stick with current position to reduce blinking
        newMouthImage = currentMouthImage;

        // Reset the counter for this position to prevent getting stuck
        mouthPositionCounts[positionKey] = 0;
      }

      // Periodically reset counters to avoid accumulation over time
      if (Object.keys(mouthPositionCounts).length > 10) {
        mouthPositionCounts = {};
      }
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
      // Adjusted weights to favor smoothed values for less blinking
      const directWeight = 0.4; // Decreased from 0.85 to reduce rapid changes
      const smoothWeight = 0.6; // Increased from 0.15 to prioritize stability over responsiveness
      const blendedAmplitude = amplitude * directWeight + get(smoothAmplitude) * smoothWeight;

      // Add predictive element to anticipate audio changes
      // Look at the rate of change to predict where the amplitude is heading
      let predictiveBoost = 0;
      if (mouthBuffer.length >= 2) {
        const recentChange = amplitude - mouthBuffer[mouthBuffer.length - 1];
        // If amplitude is increasing rapidly, boost it to anticipate the peak
        // But use a smaller multiplier and higher threshold to avoid over-boosting small changes
        if (recentChange > 0.15) {
          // Increased threshold from 0.1 to 0.15
          predictiveBoost = recentChange * 0.8; // Reduced from 1.5 to 0.8
        }
      }

      // Apply predictive boost with limits
      // Apply a smaller boost to avoid rapid changes
      const predictiveAmplitude = Math.min(1.0, blendedAmplitude + predictiveBoost * 0.5);

      // Determine mouth position with enhanced prediction for faster response
      currentMouthImage = getMouthPosition(predictiveAmplitude);

      // Use a more consistent timing approach for smoother animation
      // with less frequent updates to reduce blinking
      if (speaking) {
        // Use a small delay to throttle updates and reduce blinking
        // This creates a more natural pace for mouth position changes
        animationFrame = setTimeout(() => {
          // Use requestAnimationFrame for the next frame
          animationFrame = requestAnimationFrame(updateMouth);
        }, 16); // ~60fps, but with a small delay to prevent too rapid updates
      }
    }

    // Start animation loop immediately
    updateMouth();
  }

  // Stop lip-sync animation
  function stopLipSync() {
    // Clear both setTimeout and requestAnimationFrame to ensure proper cleanup
    if (animationFrame) {
      // Check if it's a timeout ID (number) or animation frame ID
      if (typeof animationFrame === 'number') {
        clearTimeout(animationFrame);
      } else {
        cancelAnimationFrame(animationFrame);
      }
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
    // Clean up lip sync animation
    if (animationFrame) {
      // Check if it's a timeout ID (number) or animation frame ID
      if (typeof animationFrame === 'number') {
        clearTimeout(animationFrame);
      } else {
        cancelAnimationFrame(animationFrame);
      }
    }

    // Clean up idle animation
    if (idleAnimationFrame) {
      // Check if it's a timeout ID (number) or animation frame ID
      if (typeof idleAnimationFrame === 'number') {
        clearTimeout(idleAnimationFrame);
      } else {
        cancelAnimationFrame(idleAnimationFrame);
      }
    }

    // Reset all state
    mouthBuffer = [];
    lastMouthPositions = [];
    currentMouthImage = null;
    smoothAmplitude.set(0);
  });
</script>

<div
  class="{sizeClasses[size]
    .outer} rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg relative"
>
  <div class="{sizeClasses[size].inner} rounded-full overflow-hidden relative">
    <!-- Base emotion image -->
    <img src={currentCatImage} alt="Cat avatar" class="w-full h-full object-cover" />

    <!-- Mouth overlay for lip sync with CSS transition for smoother changes -->
    {#if currentMouthImage}
      <img
        src={currentMouthImage}
        alt="Cat mouth"
        class="absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-100"
        style="opacity: 1;"
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
