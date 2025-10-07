<script>
  import { onMount, afterUpdate } from 'svelte';
  import katex from 'katex';

  export let content = '';
  export let className = '';

  let containerElement;

  function renderLaTeX() {
    if (!containerElement || !content) return;

    let html = content;

    // Detect mathematical context
    const isMath =
      /теорем|пифагор|формул|площадь|катет|гипотенуза|квадрат|корень|производн|интеграл|функци|уравнени|объем|вращени|определенн|\^|√|∫|dx|dy|dt|lim|frac|int|sum/i.test(
        content
      );

    if (isMath) {
      // Convert common patterns to LaTeX

      // First, handle integrals with proper spacing
      // ∫ 3x^2 dx -> \int 3x^2 \, dx
      html = html.replace(/∫\s*([^d]+)\s*d([a-zA-Z])/g, '\\int $1 \\, d$2');

      // Powers: x^2 -> x^{2} (do this before fractions)
      html = html.replace(/([a-zA-Z])\^(\d+)/g, '$1^{$2}');

      // Subscripts: x_1 -> x_{1}
      html = html.replace(/([a-zA-Z])_(\d+)/g, '$1_{$2}');

      // Fractions: f(x) = (x^3 + 2x^2 - x + 7) / x -> f(x) = \frac{x^3 + 2x^2 - x + 7}{x}
      html = html.replace(/\(([^)]+)\)\s*\/\s*([a-zA-Z])/g, '\\frac{$1}{$2}');

      // Simple fractions: a/b -> \frac{a}{b} (be more careful)
      html = html.replace(/([a-zA-Z0-9]+)\s*\/\s*([a-zA-Z0-9]+)/g, '\\frac{$1}{$2}');

      // Handle mathematical expressions line by line
      const lines = html.split('\n');
      html = lines
        .map((line) => {
          // Skip if line is already wrapped or doesn't contain math
          if (line.includes('$$') || line.includes('\\int') || !line.trim()) {
            return line;
          }

          // Check if line contains mathematical content
          if (/[a-zA-Z]\^?\{?\d*\}?\s*[=+\-*/]\s*|\\int|\\frac|\^|\{|\}/g.test(line)) {
            // Wrap in display math if it looks like a standalone equation
            if (line.includes('=') && !line.includes('где') && !line.includes('где')) {
              return `$$${line.trim()}$$`;
            }
            // Otherwise wrap in inline math
            else if (line.trim().length < 50) {
              return `$${line.trim()}$`;
            }
          }

          return line;
        })
        .join('\n');

      // Clean up common issues before rendering
      html = html.replace(/где\s*C\d*/g, (match) => match); // Keep "где C1" as text
      html = html.replace(/постоянная\s*интеграции/g, (match) => match); // Keep as text

      // Render LaTeX expressions
      // Display math $$...$$
      html = html.replace(/\$\$([^$]+)\$\$/g, (match, mathContent) => {
        try {
          // Clean up the math content
          let cleanContent = mathContent.trim();

          // Fix common issues
          cleanContent = cleanContent.replace(/\s+/g, ' '); // normalize spaces
          cleanContent = cleanContent.replace(/\*\s*/g, ''); // remove multiplication signs in LaTeX

          return katex.renderToString(cleanContent, {
            displayMode: true,
            throwOnError: false,
            strict: false
          });
        } catch (error) {
          console.warn('KaTeX display error:', error, mathContent);
          return `<div class="math-error">$$${mathContent}$$</div>`;
        }
      });

      // Inline math $...$
      html = html.replace(/\$([^$\n]+)\$/g, (match, mathContent) => {
        try {
          let cleanContent = mathContent.trim();
          cleanContent = cleanContent.replace(/\s+/g, ' ');
          cleanContent = cleanContent.replace(/\*\s*/g, '');

          return katex.renderToString(cleanContent, {
            displayMode: false,
            throwOnError: false,
            strict: false
          });
        } catch (error) {
          console.warn('KaTeX inline error:', error, mathContent);
          return `<span class="math-error">$${mathContent}$</span>`;
        }
      });
    }

    // Convert line breaks
    html = html.replace(/\n/g, '<br>');

    containerElement.innerHTML = html;
  }

  onMount(() => {
    renderLaTeX();
  });

  afterUpdate(() => {
    renderLaTeX();
  });

  $: if (content) {
    renderLaTeX();
  }
</script>

<div bind:this={containerElement} class="latex-content {className}"></div>

<style>
  :global(.latex-content .katex) {
    font-size: 1.1em;
  }

  :global(.latex-content .katex-display) {
    margin: 1em 0;
    text-align: center;
  }

  :global(.latex-content .katex .base) {
    display: inline-block;
  }

  :global(.latex-content .math-error) {
    font-family: 'Courier New', monospace;
    background-color: rgba(255, 0, 0, 0.1);
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-weight: 500;
    color: #d32f2f;
  }
</style>
