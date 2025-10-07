<script>
  import { onMount } from 'svelte';
  import katex from 'katex';

  export let content = '';
  export let className = '';

  let containerElement;

  function renderContent() {
    if (!containerElement || !content) return;

    let html = content;

    // Простые замены для математических выражений
    const mathReplacements = [
      // Полные уравнения: a^2a2 + b^2b2 = c^2c2
      {
        pattern:
          /([a-zA-Z])\^2([a-zA-Z])2\s*\+\s*([a-zA-Z])\^2([a-zA-Z])2\s*=\s*([a-zA-Z])\^2([a-zA-Z])2/g,
        latex: (match, a1, a2, b1, b2, c1, c2) => `$${a1}^2 + ${b1}^2 = ${c1}^2$`
      },
      // Теорема Пифагора: a^2 + b^2 = c^2
      {
        pattern: /([a-zA-Z])\^2\s*\+\s*([a-zA-Z])\^2\s*=\s*([a-zA-Z])\^2/g,
        latex: (match, a, b, c) => `$${a}^2 + ${b}^2 = ${c}^2$`
      },
      // Простые степени: a^2, b^2, c^2
      {
        pattern: /([a-zA-Z])\^(\d+)/g,
        latex: (match, letter, power) => `$${letter}^{${power}}$`
      },
      // Квадратный корень: √16
      {
        pattern: /√(\d+)/g,
        latex: (match, number) => `$\\sqrt{${number}}$`
      },
      // Дроби в скобках: (a * b) / 2
      {
        pattern: /\(([^)]+)\)\s*\/\s*(\d+)/g,
        latex: (match, numerator, denominator) => `$\\frac{${numerator}}{${denominator}}$`
      }
    ];

    // Применяем замены только если это математический контекст
    const isMath = /теорем|пифагор|формул|площадь|катет|гипотенуза|квадрат|корень/i.test(content);

    if (isMath) {
      // Сначала очищаем дублированные символы
      html = html.replace(/([a-zA-Z])\^2([a-zA-Z])2/g, '$1^2');

      // Применяем математические замены
      mathReplacements.forEach(({ pattern, latex }) => {
        html = html.replace(pattern, latex);
      });

      // Рендерим LaTeX
      html = html.replace(/\$([^$]+)\$/g, (match, mathContent) => {
        try {
          return katex.renderToString(mathContent, {
            displayMode: false,
            throwOnError: false,
            strict: false
          });
        } catch (error) {
          console.warn('KaTeX error:', error);
          return `<span style="font-family: monospace; background: #f0f0f0; padding: 2px 4px; border-radius: 3px;">${mathContent}</span>`;
        }
      });
    }

    // Заменяем переносы строк
    html = html.replace(/\n/g, '<br>');

    containerElement.innerHTML = html;
  }

  onMount(() => {
    renderContent();
  });

  $: if (content) {
    renderContent();
  }
</script>

<div bind:this={containerElement} class="simple-math {className}"></div>

<style>
  :global(.simple-math .katex) {
    font-size: 1.1em;
  }
</style>
