<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
  import MathMessage from './MathMessage.svelte';

  export let text = '';
  export let animate = false;
  export let speed = 18; // milliseconds per character

  const dispatch = createEventDispatcher();

  let displayText = '';
  let typingTimeout;
  let initialized = false;
  let previousText = '';
  let chunkSize = 1;

  function clearTimer() {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      typingTimeout = null;
    }
  }

  function typeNextCharacter(index) {
    if (index >= text.length) {
      typingTimeout = null;
      dispatch('complete');
      return;
    }

    const nextIndex = Math.min(index + chunkSize, text.length);
    displayText += text.slice(index, nextIndex);

    typingTimeout = setTimeout(() => {
      typeNextCharacter(nextIndex);
    }, speed);
  }

  function startAnimation() {
    clearTimer();
    displayText = '';

    if (!text) {
      dispatch('complete');
      return;
    }

    chunkSize = text.length > 400 ? 3 : text.length > 150 ? 2 : 1;
    typeNextCharacter(0);
  }

  $: {
    if (animate) {
      const textChanged = text !== previousText;
      if (!initialized || textChanged) {
        startAnimation();
      }
    } else {
      clearTimer();
      displayText = text;
    }

    previousText = text;
    initialized = true;
  }

  onDestroy(() => {
    clearTimer();
  });
</script>

<MathMessage content={displayText} className="whitespace-pre-wrap leading-relaxed" />
