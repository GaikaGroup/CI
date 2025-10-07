<script>
  import { onMount, afterUpdate } from 'svelte';
  import katex from 'katex';

  export let content = '';
  export let className = '';

  let containerElement;
  let processedContent = '';

  // Patterns to detect mathematical expressions
  const mathPatterns = [
    // Inline math: $...$
    { pattern: /\$([^$\n]+)\$/g, type: 'inline' },
    // Display math: $$...$$
    { pattern: /\$\$([^$]+)\$\$/g, type: 'display' },
    // Common math expressions without $ delimiters
    { pattern: /(\w+)\^(\d+|\{[^}]+\})/g, type: 'auto', replacement: '$1^{$2}' },
    // Square roots: √(...) or sqrt(...)
    { pattern: /√\(([^)]+)\)|sqrt\(([^)]+)\)/g, type: 'auto', replacement: '\\sqrt{$1$2}' },
    // Fractions: a/b where both are numbers or simple expressions
    {
      pattern: /(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/g,
      type: 'auto',
      replacement: '\\frac{$1}{$2}'
    },
    // Equations with = sign and mathematical operators
    {
      pattern: /([a-zA-Z]\w*(?:\^[\d{}\w]+)?)\s*=\s*([^,\n.!?]+(?:[+\-*/]\s*[^,\n.!?]+)*)/g,
      type: 'auto',
      replacement: '$1 = $2'
    }
  ];

  function renderMathContent(text) {
    if (!text) return { processedText: '', mathElements: [] };

    let processedText = text;
    const mathElements = [];

    // Auto-detect and convert mathematical expressions to LaTeX
    const autoMathPatterns = [
      // Exponents: c^2 -> c^{2}
      { pattern: /([a-zA-Z])\^(\d+)/g, replacement: '$1^{$2}' },
      // Square roots: √169 -> \sqrt{169}
      { pattern: /√(\d+)/g, replacement: '\\sqrt{$1}' },
      { pattern: /sqrt\((\d+)\)/g, replacement: '\\sqrt{$1}' },
      // Equations with = sign
      { pattern: /([a-zA-Z]\^?\{?\d*\}?)\s*=\s*([^,\n.!?]+)/g, replacement: '$1 = $2' }
    ];

    // Apply auto-detection if in mathematical context
    if (isMathematicalContext(text, text)) {
      autoMathPatterns.forEach(({ pattern, replacement }) => {
        processedText = processedText.replace(pattern, (match, ...groups) => {
          let latexExpr = replacement;
          groups.forEach((group, index) => {
            if (group !== undefined) {
              latexExpr = latexExpr.replace(`$${index + 1}`, group);
            }
          });

          const placeholder = `__MATH_${mathElements.length}__`;
          mathElements.push({
            content: latexExpr,
            type: 'inline',
            placeholder
          });
          return placeholder;
        });
      });
    }

    // Handle explicit LaTeX delimiters
    mathPatterns.slice(0, 2).forEach(({ pattern, type }) => {
      processedText = processedText.replace(pattern, (match, mathContent) => {
        const placeholder = `__MATH_${mathElements.length}__`;
        mathElements.push({
          content: mathContent.trim(),
          type,
          placeholder
        });
        return placeholder;
      });
    });

    return { processedText, mathElements };
  }

  function isMathematicalContext(match, fullText) {
    // Always apply math formatting if we detect mathematical patterns
    const mathKeywords = [
      'равна',
      'равно',
      'равен',
      'equals',
      'equal',
      'formula',
      'формула',
      'theorem',
      'теорема',
      'calculate',
      'вычислить',
      'solve',
      'решить',
      'площадь',
      'area',
      'гипотенуза',
      'hypotenuse',
      'катет',
      'leg',
      'квадрат',
      'square',
      'корень',
      'root',
      'сумма',
      'sum',
      'пифагор'
    ];

    const context = fullText.toLowerCase();

    return (
      mathKeywords.some((keyword) => context.includes(keyword)) ||
      /\d+\s*(см|cm|м|m|кв|sq)/.test(context) || // Units
      /теорем|theorem|формул|formula|пифагор/.test(context) ||
      /\^|\√|=/.test(fullText)
    ); // Mathematical symbols
  }

  function renderToHTML(processedText, mathElements) {
    let html = processedText;

    // Replace placeholders with rendered math
    mathElements.forEach(({ content, type, placeholder }) => {
      try {
        const rendered = katex.renderToString(content, {
          displayMode: type === 'display',
          throwOnError: false,
          strict: false
        });
        html = html.replace(placeholder, rendered);
      } catch (error) {
        console.warn('KaTeX rendering error:', error);
        // Fallback to original content with basic formatting
        const fallback =
          type === 'display'
            ? `<div class="math-fallback">${content}</div>`
            : `<span class="math-fallback">${content}</span>`;
        html = html.replace(placeholder, fallback);
      }
    });

    // Convert line breaks to <br> tags
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  function processContent() {
    if (!content) {
      processedContent = '';
      return;
    }

    let text = content;

    // Only process if it's mathematical content
    if (isMathematicalContext(text, text)) {
      // Mark already processed parts to avoid double processing
      const processed = new Set();

      // Complex equations first: a^2 + b^2 = c^2
      text = text.replace(
        /([a-zA-Z])\^(\d+)\s*\+\s*([a-zA-Z])\^(\d+)\s*=\s*([a-zA-Z])\^(\d+)/g,
        (match, ...args) => {
          const replacement = `$${args[0]}^{${args[1]}} + ${args[2]}^{${args[3]}} = ${args[4]}^{${args[5]}}$`;
          processed.add(match);
          return replacement;
        }
      );

      // Simple exponents: c^2 (only if not already processed)
      text = text.replace(/([a-zA-Z])\^(\d+)/g, (match, letter, number) => {
        if (processed.has(match) || match.includes('$')) {
          return match;
        }
        return `$${letter}^{${number}}$`;
      });

      // Square roots: √64 -> $\sqrt{64}$
      text = text.replace(/√(\d+)/g, '$\\sqrt{$1}$');

      // Fractions: (a * b) / 2 -> $\frac{a \cdot b}{2}$
      text = text.replace(/\(([^)]+)\)\s*\/\s*(\d+)/g, '$\\frac{$1}{$2}$');
    }

    processedContent = text;
  }

  function renderMath() {
    if (!containerElement || !processedContent) return;

    let html = processedContent;

    // First handle display math $$...$$ (to avoid conflicts with inline)
    html = html.replace(/\$\$([^$]+)\$\$/g, (match, mathContent) => {
      try {
        return katex.renderToString(mathContent.trim(), {
          displayMode: true,
          throwOnError: false,
          strict: false
        });
      } catch (error) {
        console.warn('KaTeX display error:', error, mathContent);
        return `<span class="math-error">${mathContent}</span>`;
      }
    });

    // Then handle inline math $...$
    html = html.replace(/\$([^$\n]+)\$/g, (match, mathContent) => {
      try {
        return katex.renderToString(mathContent.trim(), {
          displayMode: false,
          throwOnError: false,
          strict: false
        });
      } catch (error) {
        console.warn('KaTeX inline error:', error, mathContent);
        return `<span class="math-error">${mathContent}</span>`;
      }
    });

    // Convert line breaks
    html = html.replace(/\n/g, '<br>');

    containerElement.innerHTML = html;
  }

  // Process content when it changes
  $: {
    processContent();
  }

  // Render math after content is processed
  afterUpdate(() => {
    renderMath();
  });

  onMount(() => {
    renderMath();
  });
</script>

<div bind:this={containerElement} class="math-content {className}"></div>

<style>
  :global(.math-content .katex) {
    font-size: 1.1em;
  }

  :global(.math-content .katex-display) {
    margin: 0.5em 0;
    text-align: center;
  }

  :global(.math-error) {
    font-family: 'Courier New', monospace;
    background-color: rgba(255, 0, 0, 0.1);
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-weight: 500;
    color: #d32f2f;
  }

  :global(.dark .math-error) {
    background-color: rgba(255, 0, 0, 0.2);
    color: #ff6b6b;
  }
</style>
