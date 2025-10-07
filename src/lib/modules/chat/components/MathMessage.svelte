<script>
  import Math from '$lib/shared/components/Math.svelte';

  export let content = '';
  export let className = '';

  function parseMathContent(text) {
    if (!text) return [];

    // Detect mathematical context - more comprehensive
    const isMath =
      /теорем|пифагор|формул|площадь|катет|гипотенуза|квадрат|корень|производн|интеграл|функци|уравнени|объем|вращени|определенн|\\int|\\frac|\\sqrt|\^|√|∫|dx|dy|dt|lim|frac|int|sum|степенн|неопределенн|постоянн|решени/i.test(
        text
      );

    if (!isMath) {
      return [{ type: 'text', content: text }];
    }

    let processedText = text;

    // Convert LaTeX-like expressions to proper LaTeX
    // Handle complete integral equations: \int x^2 dx = \frac{x^3}{3} + C
    processedText = processedText.replace(
      /\\int\s+([^=]+)\s*=\s*\\frac\{([^}]+)\}\{([^}]+)\}\s*\+\s*C/g,
      '$$\\int $1 = \\frac{$2}{$3} + C$$'
    );

    // Handle integral equations without explicit LaTeX: int x^2 dx = x^3/3 + C
    processedText = processedText.replace(
      /\bint\s+([^=]+)\s*=\s*([^+]+)\s*\+\s*C/g,
      '$$\\int $1 = $2 + C$$'
    );

    // Handle simple integrals: \int x^2 dx
    processedText = processedText.replace(/\\int\s+([^d=]+)\s*d([a-zA-Z])/g, '$\\int $1 \\, d$2$');

    // Handle fractions: \frac{x^3}{3}
    processedText = processedText.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$\\frac{$1}{$2}$');

    // Handle simple fractions: x^3/3 -> \frac{x^3}{3}
    processedText = processedText.replace(/([a-zA-Z]\^?\{?\d*\}?)\s*\/\s*(\d+)/g, '\\frac{$1}{$2}');

    // Handle powers: x^2 -> x^{2}
    processedText = processedText.replace(/([a-zA-Z])\^(\d+)/g, '$1^{$2}');

    // Handle square roots: sqrt(x) -> \sqrt{x}
    processedText = processedText.replace(/\\sqrt\{([^}]+)\}/g, '$\\sqrt{$1}$');

    // Handle equations with equals (be more selective)
    processedText = processedText.replace(
      /([a-zA-Z]\^?\{?\d*\}?\s*=\s*[^.\n,где]{3,30})/g,
      (match) => {
        if (match.includes('$')) return match; // Already processed
        if (match.includes('где') || match.includes('константа') || match.includes('постоянная'))
          return match;
        if (match.includes('равно') || match.includes('равен') || match.includes('равна'))
          return match;
        return `$${match.trim()}$`;
      }
    );

    const parts = [];
    let currentPos = 0;

    // Find all math expressions (both $...$ and $$...$$)
    const mathRegex = /\$\$([^$]+)\$\$|\$([^$\n]+)\$/g;
    let match;

    while ((match = mathRegex.exec(processedText)) !== null) {
      // Add text before math
      if (match.index > currentPos) {
        const textBefore = processedText.slice(currentPos, match.index);
        if (textBefore.trim()) {
          parts.push({ type: 'text', content: textBefore });
        }
      }

      // Add math expression
      const mathContent = match[1] || match[2]; // $$....$$ or $...$
      const isDisplay = !!match[1]; // true if $$...$$
      parts.push({ type: 'math', content: mathContent, display: isDisplay });

      currentPos = match.index + match[0].length;
    }

    // Add remaining text
    if (currentPos < processedText.length) {
      const remainingText = processedText.slice(currentPos);
      if (remainingText.trim()) {
        parts.push({ type: 'text', content: remainingText });
      }
    }

    // If no math was found, return as text
    if (parts.length === 0) {
      parts.push({ type: 'text', content: text });
    }

    return parts;
  }

  $: parsedContent = parseMathContent(content);
</script>

<div class="math-message {className}">
  {#each parsedContent as part}
    {#if part.type === 'math'}
      <Math tex={part.content} display={part.display} />
    {:else}
      <span class="text-content">{part.content}</span>
    {/if}
  {/each}
</div>

<style>
  .math-message {
    line-height: 1.6;
  }

  .text-content {
    white-space: pre-wrap;
  }
</style>
