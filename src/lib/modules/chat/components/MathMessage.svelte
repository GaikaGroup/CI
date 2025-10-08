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

    const integralSymbolMap = {
      '∫': '\\int',
      '∬': '\\iint',
      '∭': '\\iiint',
      '⨌': '\\iiiint',
      '∮': '\\oint',
      '∯': '\\oiint',
      '∰': '\\oiiint',
      '∱': '\\int',
      '∲': '\\int',
      '∳': '\\int'
    };

    const integralPlaceholders = new Map();

    const linesWithoutIntegrals = text.split('\n').map((line, index) => {
      const leadingWhitespaceMatch = line.match(/^\s*/);
      const leadingWhitespace = leadingWhitespaceMatch ? leadingWhitespaceMatch[0] : '';
      const lineWithoutIndent = line.slice(leadingWhitespace.length);

      if (lineWithoutIndent.startsWith('$$')) {
        return line;
      }

      const integralMatch = lineWithoutIndent.match(/^([∫∬∭⨌∮∯∰∱∲∳])(.*)$/);

      if (!integralMatch) {
        return line;
      }

      const [, integralSymbol, restOfLine] = integralMatch;
      const latexIntegral = integralSymbolMap[integralSymbol] || '\\int';

      let normalizedRest = restOfLine.trim();

      normalizedRest = normalizedRest.replace(
        /([a-zA-Z0-9\\}\]])\^\(([^)]+)\)/g,
        (_, base, exponent) => `${base}^{${exponent}}`
      );

      normalizedRest = normalizedRest.replace(
        /(?<!\\,)d([a-zA-Z])\b/g,
        (_, variable) => `\\, d${variable}`
      );

      const needsSpace =
        normalizedRest.length > 0 &&
        !normalizedRest.startsWith('\\') &&
        !normalizedRest.startsWith('_') &&
        !normalizedRest.startsWith('^');

      const integralExpression = `${latexIntegral}${needsSpace ? ' ' : ''}${normalizedRest}`.trim();
      const latexLine = `${leadingWhitespace}$$${integralExpression}$$`;

      const placeholder = `__INTEGRAL_PLACEHOLDER_${index}__`;
      integralPlaceholders.set(placeholder, latexLine);

      return placeholder;
    });

    let processedText = linesWithoutIntegrals.join('\n');

    // Normalize exponent notation like x^(2) -> x^{2} globally (outside integral placeholders)
    processedText = processedText.replace(
      /([a-zA-Z0-9\\}\]])\^\(([^)]+)\)/g,
      (_, base, exponent) => `${base}^{${exponent}}`
    );

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
    processedText = processedText.replace(
      /\\int\s+([^d=]+)\s*d([a-zA-Z])/g,
      (_, integrand, variable) => `$\\int ${integrand} \\, d${variable}$`
    );

    // Handle fractions: \frac{x^3}{3}
    processedText = processedText.replace(
      /\\frac\{([^}]+)\}\{([^}]+)\}/g,
      (_, numerator, denominator) => String.raw`$\frac{${numerator}}{${denominator}}$`
    );

    // Handle simple fractions: x^3/3 -> \frac{x^3}{3}
    processedText = processedText.replace(
      /([a-zA-Z]\^?\{?\d*\}?)\s*\/\s*(\d+)/g,
      (_, numerator, denominator) => String.raw`\frac{${numerator}}{${denominator}}`
    );

    // Handle powers: x^2 -> x^{2}
    processedText = processedText.replace(/([a-zA-Z])\^(\d+)/g, '$1^{$2}');

    // Handle square roots: sqrt(x) -> \sqrt{x}
    processedText = processedText.replace(
      /\\sqrt\{([^}]+)\}/g,
      (_, value) => String.raw`$\sqrt{${value}}$`
    );

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

    for (const [placeholder, latexLine] of integralPlaceholders.entries()) {
      processedText = processedText.split(placeholder).join(latexLine);
    }

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
