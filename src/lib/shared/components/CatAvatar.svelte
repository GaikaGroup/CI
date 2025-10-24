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
  import { audioAmplitude, isSpeaking } from '$lib/modules/chat/voiceServices';
  import { avatarStateManager, avatarState } from '$lib/modules/chat/AvatarStateManager.js';
  import { selectedLanguage } from '$modules/i18n/stores';
  import { getTranslation } from '$modules/i18n/translations';

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

  // Audio completion detection
  let lowAmplitudeCount = 0;
  let audioEndDetected = false;

  // Enhanced mouth closure detection
  let mouthClosureTimer = null;
  let forceClosureTimeout = null;
  let isMouthClosing = false;

  // Enhanced lip-sync accuracy tracking
  let phonemeHistory = [];
  let amplitudeSmoothing = [];
  const PHONEME_HISTORY_SIZE = 3;
  const AMPLITUDE_SMOOTHING_SIZE = 5;

  // Avatar state management
  let avatarStateUnsubscribe = null;

  // Size classes (enlarged for better visibility)
  const sizeClasses = {
    sm: {
      outer: 'w-24 h-24',
      inner: 'w-24 h-24'
    },
    md: {
      outer: 'w-40 h-40',
      inner: 'w-40 h-40'
    },
    lg: {
      outer: 'w-80 h-80',
      inner: 'w-80 h-80'
    }
  };

  // Audio completion detection function
  function detectAudioCompletion() {
    const currentAmplitude = get(audioAmplitude);
    const isSpeakingState = get(isSpeaking);

    // If we're supposed to be speaking but amplitude is very low
    if (isSpeakingState && currentAmplitude < 0.02) {
      lowAmplitudeCount++;

      // If amplitude has been low for several checks, audio might have ended
      if (lowAmplitudeCount > 5 && !audioEndDetected) {
        console.log('Audio completion detected via amplitude monitoring');
        audioEndDetected = true;
        handleAudioCompletion();
      }
    } else if (currentAmplitude > 0.02) {
      // Reset counter if amplitude is detected
      lowAmplitudeCount = 0;
      audioEndDetected = false;
    }

    // If speaking state changed to false, ensure mouth closes
    if (!isSpeakingState && currentMouthImage && !isMouthClosing) {
      console.log('Speaking state ended, ensuring mouth closure');
      handleAudioCompletion();
    }
  }

  // Handle audio completion with proper mouth closure
  function handleAudioCompletion() {
    if (!currentMouthImage || isMouthClosing) {
      return;
    }

    console.log('Handling audio completion - closing mouth');

    // Clear any existing closure timers
    if (mouthClosureTimer) {
      clearTimeout(mouthClosureTimer);
    }
    if (forceClosureTimeout) {
      clearTimeout(forceClosureTimeout);
    }

    // Immediately start mouth closure process
    initiateProperMouthClosure();

    // Force closure after a maximum time to prevent stuck mouth
    forceClosureTimeout = setTimeout(() => {
      if (currentMouthImage) {
        console.log('Force closing mouth after timeout');
        currentMouthImage = null;
        smoothAmplitude.set(0);
        mouthBuffer = [];
        isMouthClosing = false;
        if (mouthClosureTimer) {
          clearTimeout(mouthClosureTimer);
          mouthClosureTimer = null;
        }
      }
    }, 500); // Maximum 500ms to close mouth
  }

  // Initiate proper mouth closure with smooth transition
  function initiateProperMouthClosure() {
    if (!currentMouthImage || isMouthClosing) {
      return; // Already closed or currently closing
    }

    console.log('Initiating proper mouth closure');
    isMouthClosing = true;

    // Gradually reduce amplitude to create natural closing motion
    const closureSteps = [0.08, 0.04, 0.02, 0.01, 0];
    let stepIndex = 0;

    function performClosureStep() {
      if (stepIndex < closureSteps.length) {
        const targetAmplitude = closureSteps[stepIndex];
        smoothAmplitude.set(targetAmplitude);

        // Update mouth position based on reduced amplitude
        if (targetAmplitude > 0) {
          currentMouthImage = getMouthPosition(targetAmplitude);
        } else {
          // Final step - close mouth completely
          currentMouthImage = null;
          mouthBuffer = [];
          console.log('Mouth closure completed');

          isMouthClosing = false;

          mouthClosureTimer = null;

          // Clear force closure timeout since we completed naturally
          if (forceClosureTimeout) {
            clearTimeout(forceClosureTimeout);
            forceClosureTimeout = null;
          }
          return;
        }

        stepIndex++;
        mouthClosureTimer = setTimeout(performClosureStep, 50); // 50ms between steps
      }
    }

    performClosureStep();
  }

  // Enhanced mouth state management
  function ensureMouthSynchronization() {
    const isSpeakingState = get(isSpeaking);
    const currentAmplitude = get(audioAmplitude);

    // If not speaking but mouth is open, close it immediately
    if (!isSpeakingState && currentMouthImage && !isMouthClosing) {
      console.log('Mouth open while not speaking - initiating immediate closure');
      // Force immediate closure instead of gradual
      currentMouthImage = null;
      smoothAmplitude.set(0);
      mouthBuffer = [];
      isMouthClosing = false;

      // Clear any pending closure timers
      if (mouthClosureTimer) {
        clearTimeout(mouthClosureTimer);
        mouthClosureTimer = null;
      }
      if (forceClosureTimeout) {
        clearTimeout(forceClosureTimeout);
        forceClosureTimeout = null;
      }

      console.log('Mouth immediately closed due to speaking state change');
      return;
    }

    // If speaking but amplitude is zero and mouth is open, start closure
    if (isSpeakingState && currentAmplitude < 0.01 && currentMouthImage && !isMouthClosing) {
      console.log('Zero amplitude detected while speaking - checking for completion');
      detectAudioCompletion();
    }
  }

  // Avatar state management functions
  async function updateAvatarState(newState, options = {}) {
    try {
      await avatarStateManager.transitionToState(newState, options);
    } catch (error) {
      console.error('Error updating avatar state:', error);
    }
  }

  function handleAvatarStateChange(state) {
    // Update component state based on avatar state
    if (state.emotion !== emotion) {
      updateEmotion(state.emotion);
    }

    if (state.speaking !== speaking) {
      // This will trigger the reactive statement below
      speaking = state.speaking;
    }

    // Handle mouth position from state manager
    if (state.mouthPosition !== undefined && state.mouthPosition !== currentMouthImage) {
      if (state.mouthPosition === null) {
        // Smooth mouth closure
        initiateProperMouthClosure();
      } else {
        currentMouthImage = state.mouthPosition;
      }
    }
  }

  // Sync component state with avatar state manager
  function syncWithAvatarState() {
    const currentState = avatarStateManager.getCurrentState();

    // Update avatar state if component props have changed
    const newState = {};
    let hasChanges = false;

    if (currentState.emotion !== emotion) {
      newState.emotion = emotion;
      hasChanges = true;
    }

    if (currentState.speaking !== speaking) {
      newState.speaking = speaking;
      newState.currentState = speaking ? 'speaking' : 'idle';
      hasChanges = true;
    }

    if (hasChanges) {
      updateAvatarState(newState, { priority: 'normal' });
    }
  }

  // Add an idle animation function
  function startIdleAnimation() {
    if (idleAnimationFrame) cancelAnimationFrame(idleAnimationFrame);

    function updateIdle() {
      // Always check mouth synchronization
      ensureMouthSynchronization();

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
    // Subscribe to avatar state changes
    avatarStateUnsubscribe = avatarState.subscribe(handleAvatarStateChange);

    // Initialize avatar state
    updateAvatarState(
      {
        currentState: 'idle',
        emotion: emotion,
        speaking: speaking,
        mouthPosition: null
      },
      { priority: 'immediate' }
    );

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

      // Sync initial state
      syncWithAvatarState();
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

  // Enhanced audio analysis for better phoneme detection
  function analyzeAudioCharacteristics(amplitude) {
    // Add to amplitude smoothing buffer
    amplitudeSmoothing.push(amplitude);
    if (amplitudeSmoothing.length > AMPLITUDE_SMOOTHING_SIZE) {
      amplitudeSmoothing.shift();
    }

    // Calculate smoothed amplitude with weighted average (recent values have more weight)
    let smoothedAmplitude = 0;
    let totalWeight = 0;
    for (let i = 0; i < amplitudeSmoothing.length; i++) {
      const weight = (i + 1) / amplitudeSmoothing.length; // Linear weighting
      smoothedAmplitude += amplitudeSmoothing[i] * weight;
      totalWeight += weight;
    }
    smoothedAmplitude /= totalWeight;

    // Calculate average amplitude from buffer
    const avgAmplitude = mouthBuffer.reduce((sum, val) => sum + val, 0) / mouthBuffer.length;

    // Calculate trend (increasing or decreasing amplitude)
    let trend = 0;
    let trendStrength = 0;
    if (mouthBuffer.length >= 2) {
      trend = mouthBuffer[mouthBuffer.length - 1] - mouthBuffer[0];
      // Calculate how strong/sudden the trend is (useful for detecting consonants)
      trendStrength = Math.abs(trend) / (avgAmplitude || 0.01);
    }

    // Enhanced predictive amplitude calculation using smoothed values
    const predictiveAmplitude = smoothedAmplitude * 0.7 + avgAmplitude * 0.3 + trend * 0.4;

    // Advanced phoneme detection based on amplitude patterns
    const phonemeHint = detectPhonemePattern(smoothedAmplitude, avgAmplitude, trend, trendStrength);

    // Add phoneme to history for temporal consistency
    phonemeHistory.push(phonemeHint);
    if (phonemeHistory.length > PHONEME_HISTORY_SIZE) {
      phonemeHistory.shift();
    }

    // Apply temporal consistency to phoneme detection
    const consistentPhoneme = applyTemporalConsistency(phonemeHint);

    // Calculate amplitude variance for consonant detection
    let variance = 0;
    if (mouthBuffer.length > 1) {
      const mean = avgAmplitude;
      variance =
        mouthBuffer.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / mouthBuffer.length;
    }

    // Detect frequency characteristics (simulated from amplitude patterns)
    const frequencyHint = analyzeFrequencyPattern(smoothedAmplitude, avgAmplitude, variance);

    return {
      avgAmplitude,
      smoothedAmplitude,
      trend,
      trendStrength,
      predictiveAmplitude,
      phonemeHint: consistentPhoneme,
      variance,
      frequencyHint
    };
  }

  // Apply temporal consistency to reduce phoneme flickering
  function applyTemporalConsistency(currentPhoneme) {
    if (phonemeHistory.length < 2) {
      return currentPhoneme;
    }

    // Count occurrences of each phoneme in recent history
    const phonemeCounts = {};
    phonemeHistory.forEach((phoneme) => {
      phonemeCounts[phoneme] = (phonemeCounts[phoneme] || 0) + 1;
    });

    // If current phoneme appears frequently in recent history, use it
    if (phonemeCounts[currentPhoneme] >= 2) {
      return currentPhoneme;
    }

    // Find the most common phoneme in recent history
    let mostCommon = currentPhoneme;
    let maxCount = 1;
    for (const [phoneme, count] of Object.entries(phonemeCounts)) {
      if (count > maxCount) {
        mostCommon = phoneme;
        maxCount = count;
      }
    }

    // Use most common if it's significantly more frequent
    if (maxCount >= 2) {
      return mostCommon;
    }

    return currentPhoneme;
  }

  // Detect phoneme patterns from amplitude characteristics
  function detectPhonemePattern(amplitude, avgAmplitude, trend, trendStrength) {
    // Vowel detection - sustained amplitude with low variance
    if (avgAmplitude > 0.2 && trendStrength < 0.3) {
      if (avgAmplitude > 0.4) return 'open_vowel'; // a, o sounds
      if (avgAmplitude > 0.25) return 'mid_vowel'; // e sounds
      return 'close_vowel'; // i, u sounds
    }

    // Consonant detection based on amplitude patterns
    if (trendStrength > 0.8) {
      if (trend < -0.15) return 'stop_consonant'; // p, b, t, d, k, g
      if (trend > 0.15) return 'fricative_start'; // f, s, sh onset
      return 'consonant_transition';
    }

    // Fricative detection - steady mid-level amplitude
    if (avgAmplitude > 0.1 && avgAmplitude < 0.3 && trendStrength < 0.4) {
      return 'fricative'; // s, sh, f, th sounds
    }

    // Nasal detection - low but present amplitude
    if (avgAmplitude > 0.05 && avgAmplitude < 0.15 && trendStrength < 0.3) {
      return 'nasal'; // m, n, ng sounds
    }

    // Liquid detection - moderate amplitude with smooth transitions
    if (avgAmplitude > 0.15 && avgAmplitude < 0.35 && trendStrength < 0.5) {
      return 'liquid'; // l, r sounds
    }

    return 'silence';
  }

  // Analyze frequency patterns (simulated from amplitude data)
  function analyzeFrequencyPattern(amplitude, avgAmplitude, variance) {
    // High variance suggests complex frequency content (consonants)
    if (variance > 0.02) {
      return 'complex'; // Consonants with multiple frequency components
    }

    // Low variance with high amplitude suggests pure tones (vowels)
    if (variance < 0.01 && avgAmplitude > 0.2) {
      return 'pure_tone'; // Clear vowel sounds
    }

    // Medium characteristics
    if (avgAmplitude > 0.1) {
      return 'mixed'; // Mixed frequency content
    }

    return 'noise'; // Low-level noise or silence
  }

  // Select mouth image based on detected phoneme
  function selectMouthImageFromPhoneme(phonemeHint, amplitude, audioMetrics) {
    const { avgAmplitude } = audioMetrics;

    switch (phonemeHint) {
      case 'open_vowel':
        // Open vowels like 'a', 'o' - wide mouth opening
        if (amplitude > 0.4) return mouthImages.o; // Very open
        return mouthImages.a; // Moderately open

      case 'mid_vowel':
        // Mid vowels like 'e' - medium mouth opening
        return mouthImages.e;

      case 'close_vowel':
        // Close vowels like 'i', 'u' - smaller mouth opening
        if (amplitude > 0.3) return mouthImages.e; // Slightly more open
        return mouthImages.a; // Smaller opening

      case 'stop_consonant':
        // Stop consonants like 'p', 'b', 't', 'd' - closed or nearly closed
        if (avgAmplitude < 0.1) return null; // Completely closed
        // Alternate between different stop positions for variety
        return lastMouthPositions.includes(mouthImages.b) ? mouthImages.p : mouthImages.b;

      case 'fricative':
      case 'fricative_start':
        // Fricatives like 's', 'sh', 'f' - narrow opening
        if (amplitude > 0.25) {
          // Higher amplitude fricatives
          return lastMouthPositions.includes(mouthImages.sh) ? mouthImages.ch : mouthImages.sh;
        }
        // Lower amplitude fricatives
        return lastMouthPositions.includes(mouthImages.s) ? mouthImages.r : mouthImages.s;

      case 'nasal':
        // Nasal consonants like 'm', 'n' - closed mouth with slight opening
        return mouthImages.m;

      case 'liquid':
        // Liquid consonants like 'l', 'r' - moderate opening
        if (amplitude > 0.25) return mouthImages.r;
        return mouthImages.w;

      case 'consonant_transition':
        // Transitional consonant sounds - use context-aware selection
        if (amplitude > 0.3) return mouthImages.j;
        if (amplitude > 0.15) return mouthImages.w;
        return mouthImages.m;

      case 'silence':
      default:
        // Silence or unrecognized - close mouth or very small opening
        if (amplitude < 0.02) return null;
        if (amplitude < 0.05) return mouthImages.m; // Very slight opening
        return mouthImages.a; // Small opening for very quiet sounds
    }
  }

  // Enhanced mouth position detection with improved audio analysis
  function getMouthPosition(amplitude) {
    // Add to buffer for smoothing
    mouthBuffer.push(amplitude);
    if (mouthBuffer.length > BUFFER_SIZE) {
      mouthBuffer.shift();
    }

    // Calculate enhanced audio metrics
    const audioMetrics = analyzeAudioCharacteristics(amplitude);
    const { avgAmplitude, predictiveAmplitude, phonemeHint } = audioMetrics;

    // Check if enough time has passed since last mouth change
    const now = Date.now();
    if (now - lastMouthChange < MIN_MOUTH_DURATION && currentMouthImage) {
      return currentMouthImage;
    }

    // Enhanced mouth position selection using phoneme detection
    let newMouthImage = selectMouthImageFromPhoneme(phonemeHint, predictiveAmplitude, audioMetrics);

    // Add to mouth position history to prevent oscillation
    if (lastMouthPositions.length >= MOUTH_HISTORY_SIZE) {
      lastMouthPositions.shift();
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
    isMouthClosing = false;

    function updateMouth() {
      if (!speaking) {
        // Ensure mouth synchronization even when not speaking
        ensureMouthSynchronization();
        return;
      }

      // Get current audio amplitude immediately
      const amplitude = get(audioAmplitude);

      // Detect audio completion
      detectAudioCompletion();

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

      // Only update mouth position if we haven't detected audio completion
      if (!audioEndDetected) {
        currentMouthImage = getMouthPosition(predictiveAmplitude);
        isMouthClosing = false;
      }

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
    console.log('Stopping lip-sync animation');

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

    // Clear any existing closure timers
    if (mouthClosureTimer) {
      clearTimeout(mouthClosureTimer);
      mouthClosureTimer = null;
    }
    if (forceClosureTimeout) {
      clearTimeout(forceClosureTimeout);
      forceClosureTimeout = null;
    }

    // Reset audio completion detection
    audioEndDetected = false;
    lowAmplitudeCount = 0;

    // Immediately close mouth when lip-sync stops to prevent lag
    console.log('Immediately closing mouth on lip-sync stop');
    currentMouthImage = null;
    smoothAmplitude.set(0);
    mouthBuffer = [];
    isMouthClosing = false;
  }

  // Watch for changes in speaking state
  $: if (speaking !== undefined && imagesLoaded) {
    // If speaking state changed
    if (speaking !== lastSpeakingState) {
      // Update avatar state manager
      updateAvatarState(
        {
          speaking: speaking,
          currentState: speaking ? 'speaking' : 'idle'
        },
        {
          priority: 'high',
          duration: speaking ? 200 : 50 // Faster transition when stopping
        }
      );

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
        console.log('Speaking stopped - immediately closing mouth');
        isTransitioning = true;

        // Immediately stop lip sync and close mouth
        stopLipSync();

        // Force immediate mouth closure
        currentMouthImage = null;
        smoothAmplitude.set(0);
        mouthBuffer = [];

        // Clear transition flag quickly
        setTimeout(() => {
          isTransitioning = false;
        }, 50); // Much faster transition when stopping
      }

      lastSpeakingState = speaking;
    }
  }

  // Watch for changes in emotion
  $: if (emotion && imagesLoaded) {
    updateEmotion(emotion);

    // Update avatar state manager
    updateAvatarState(
      {
        emotion: emotion
      },
      {
        priority: 'normal',
        duration: 500
      }
    );
  }

  // Clean up on component destruction
  onDestroy(() => {
    // Unsubscribe from avatar state
    if (avatarStateUnsubscribe) {
      avatarStateUnsubscribe();
    }

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

    // Clean up mouth closure timers
    if (mouthClosureTimer) {
      clearTimeout(mouthClosureTimer);
    }
    if (forceClosureTimeout) {
      clearTimeout(forceClosureTimeout);
    }

    isMouthClosing = false;

    // Reset all state
    mouthBuffer = [];
    lastMouthPositions = [];
    currentMouthImage = null;
    smoothAmplitude.set(0);
    audioEndDetected = false;
    lowAmplitudeCount = 0;

    // Reset enhanced lip-sync buffers
    phonemeHistory = [];
    amplitudeSmoothing = [];
  });
</script>

<div class="{sizeClasses[size].outer} flex items-center justify-center relative">
  <div class="{sizeClasses[size].inner} overflow-hidden relative">
    <!-- Base emotion image -->
    <img
      src={currentCatImage}
      alt={getTranslation($selectedLanguage, 'catAvatar')}
      class="w-full h-full object-cover drop-shadow-lg filter"
      style="filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3));"
    />

    <!-- Mouth overlay for lip sync with CSS transition for smoother changes -->
    {#if currentMouthImage}
      <img
        src={currentMouthImage}
        alt={getTranslation($selectedLanguage, 'catMouth')}
        class="absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-100 drop-shadow-lg filter"
        style="opacity: 1; filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3));"
      />
    {/if}

    <!-- Loading indicator -->
    {#if !imagesLoaded}
      <div
        class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white"
      >
        {getTranslation($selectedLanguage, 'loading')}
      </div>
    {/if}
  </div>
</div>
