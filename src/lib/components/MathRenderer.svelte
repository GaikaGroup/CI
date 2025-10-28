<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  export let content = '';
  export let className = '';

  let container;

  // Функция для улучшенной обработки математического контента
  function preprocessMathContent(text) {
    let processed = text;

    // Замены математических символов на LaTeX
    const symbolReplacements = {
      // Греческие буквы
      α: '\\alpha',
      β: '\\beta',
      γ: '\\gamma',
      δ: '\\delta',
      ε: '\\epsilon',
      ζ: '\\zeta',
      η: '\\eta',
      θ: '\\theta',
      ι: '\\iota',
      κ: '\\kappa',
      λ: '\\lambda',
      μ: '\\mu',
      ν: '\\nu',
      ξ: '\\xi',
      π: '\\pi',
      ρ: '\\rho',
      σ: '\\sigma',
      τ: '\\tau',
      υ: '\\upsilon',
      φ: '\\phi',
      χ: '\\chi',
      ψ: '\\psi',
      ω: '\\omega',
      Γ: '\\Gamma',
      Δ: '\\Delta',
      Θ: '\\Theta',
      Λ: '\\Lambda',
      Ξ: '\\Xi',
      Π: '\\Pi',
      Σ: '\\Sigma',
      Φ: '\\Phi',
      Ψ: '\\Psi',
      Ω: '\\Omega',

      // Математические операторы
      '∞': '\\infty',
      '∂': '\\partial',
      '∇': '\\nabla',
      '∑': '\\sum',
      '∏': '\\prod',
      '∫': '\\int',
      '∬': '\\iint',
      '∭': '\\iiint',
      '∮': '\\oint',
      '∯': '\\oiint',
      '∰': '\\oiiint',

      // Отношения и сравнения
      '≤': '\\leq',
      '≥': '\\geq',
      '≠': '\\neq',
      '≈': '\\approx',
      '≡': '\\equiv',
      '∈': '\\in',
      '∉': '\\notin',
      '⊂': '\\subset',
      '⊃': '\\supset',
      '⊆': '\\subseteq',
      '⊇': '\\supseteq',
      '∪': '\\cup',
      '∩': '\\cap',
      '∅': '\\emptyset',

      // Стрелки
      '→': '\\rightarrow',
      '←': '\\leftarrow',
      '↔': '\\leftrightarrow',
      '⇒': '\\Rightarrow',
      '⇐': '\\Leftarrow',
      '⇔': '\\Leftrightarrow',

      // Другие символы
      '±': '\\pm',
      '∓': '\\mp',
      '×': '\\times',
      '÷': '\\div',
      '√': '\\sqrt',
      '∝': '\\propto',
      '∴': '\\therefore',
      '∵': '\\because',
      '∀': '\\forall',
      '∃': '\\exists',
      '∄': '\\nexists',
      '⊥': '\\perp',
      '∥': '\\parallel',
      '∠': '\\angle',
      '°': '^\\circ'
    };

    // Применяем замены символов
    for (const [symbol, latex] of Object.entries(symbolReplacements)) {
      processed = processed.replace(new RegExp(symbol, 'g'), latex);
    }

    // Улучшенная обработка степеней и индексов
    processed = processed.replace(/([a-zA-Z0-9])\^(\d+)(?![a-zA-Z])/g, '$1^{$2}');
    processed = processed.replace(/([a-zA-Z0-9])\^\(([^)]+)\)/g, '$1^{$2}');
    processed = processed.replace(/([a-zA-Z0-9])_(\d+)(?![a-zA-Z])/g, '$1_{$2}');
    processed = processed.replace(/([a-zA-Z0-9])_\(([^)]+)\)/g, '$1_{$2}');

    // Улучшенная обработка дробей
    processed = processed.replace(/([a-zA-Z0-9()]+)\s*\/\s*([a-zA-Z0-9()]+)/g, '\\frac{$1}{$2}');

    // Квадратные корни
    processed = processed.replace(/sqrt\(([^)]+)\)/gi, '\\sqrt{$1}');

    // Математические функции
    processed = processed.replace(/\b(sin|cos|tan|log|ln|exp|lim)\b/g, '\\$1');

    // Производные
    processed = processed.replace(/d\/d([a-zA-Z])/g, '\\frac{d}{d$1}');
    processed = processed.replace(/∂\/∂([a-zA-Z])/g, '\\frac{\\partial}{\\partial $1}');

    // Факториалы
    processed = processed.replace(/(\d+|[a-zA-Z])!/g, '$1!');

    return processed;
  }

  onMount(async () => {
    if (!browser || !container) return;

    try {
      const katex = await import('katex');

      // Предобрабатываем контент
      let html = preprocessMathContent(content);

      // Display math \[ ... \]
      html = html.replace(/\\\[([^\]]+)\\\]/g, (match, mathContent) => {
        try {
          return `<div class="math-display">${katex.default.renderToString(mathContent, {
            displayMode: true,
            throwOnError: false,
            strict: false,
            trust: true,
            macros: {
              '\\RR': '\\mathbb{R}',
              '\\NN': '\\mathbb{N}',
              '\\ZZ': '\\mathbb{Z}',
              '\\QQ': '\\mathbb{Q}',
              '\\CC': '\\mathbb{C}'
            }
          })}</div>`;
        } catch (e) {
          return `<div class="math-display math-error">${mathContent}</div>`;
        }
      });

      // Inline math \( ... \)
      html = html.replace(/\\\(([^)]+)\\\)/g, (match, mathContent) => {
        try {
          return katex.default.renderToString(mathContent, {
            displayMode: false,
            throwOnError: false,
            strict: false,
            trust: true,
            macros: {
              '\\RR': '\\mathbb{R}',
              '\\NN': '\\mathbb{N}',
              '\\ZZ': '\\mathbb{Z}',
              '\\QQ': '\\mathbb{Q}',
              '\\CC': '\\mathbb{C}'
            }
          });
        } catch (e) {
          return `<span class="math-error">${mathContent}</span>`;
        }
      });

      // Display math $$ ... $$
      html = html.replace(/\$\$([^$]+)\$\$/g, (match, mathContent) => {
        try {
          return `<div class="math-display">${katex.default.renderToString(mathContent, {
            displayMode: true,
            throwOnError: false,
            strict: false,
            trust: true,
            macros: {
              '\\RR': '\\mathbb{R}',
              '\\NN': '\\mathbb{N}',
              '\\ZZ': '\\mathbb{Z}',
              '\\QQ': '\\mathbb{Q}',
              '\\CC': '\\mathbb{C}'
            }
          })}</div>`;
        } catch (e) {
          return `<div class="math-display math-error">${mathContent}</div>`;
        }
      });

      // Inline math $ ... $
      html = html.replace(/\$([^$\n]+)\$/g, (match, mathContent) => {
        try {
          return katex.default.renderToString(mathContent, {
            displayMode: false,
            throwOnError: false,
            strict: false,
            trust: true,
            macros: {
              '\\RR': '\\mathbb{R}',
              '\\NN': '\\mathbb{N}',
              '\\ZZ': '\\mathbb{Z}',
              '\\QQ': '\\mathbb{Q}',
              '\\CC': '\\mathbb{C}'
            }
          });
        } catch (e) {
          return `<span class="math-error">${mathContent}</span>`;
        }
      });

      // Auto-wrap standalone LaTeX commands (e.g., \frac{km}{h}, ^\circ)
      html = html.replace(/\\frac\{[^}]+\}\{[^}]+\}/g, (match) => {
        try {
          return katex.default.renderToString(match, {
            displayMode: false,
            throwOnError: false,
            strict: false,
            trust: true
          });
        } catch (e) {
          return match;
        }
      });

      // Fix degree symbol: wrap ^\circ in $ if not already wrapped
      html = html.replace(/([^$])\^\\circ(?!\$)/g, (match, before) => {
        return before + '$^\\circ$';
      });

      // Fix common LaTeX errors: ^\circC -> ^\circ C
      html = html.replace(/\^\\circC/g, '$^\\circ$ C');
      html = html.replace(/\^\\circ([A-Z])/g, '$^\\circ$ $1');

      // Обработка жирного текста (markdown)
      html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

      // Обработка курсива (markdown)
      html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

      // Улучшенная обработка переносов строк
      html = html.replace(/\n\n+/g, '</p><p>'); // Двойные переносы = абзацы
      html = html.replace(/\n/g, '<br>'); // Одинарные переносы = <br>

      // Оборачиваем в параграфы если нужно
      if (html.includes('</p><p>')) {
        html = '<p>' + html + '</p>';
      }

      container.innerHTML = html;
    } catch (error) {
      console.warn('Math rendering failed:', error);
      // Улучшенный fallback
      let fallbackHtml = content;
      fallbackHtml = fallbackHtml.replace(/\n\n+/g, '</p><p>');
      fallbackHtml = fallbackHtml.replace(/\n/g, '<br>');
      if (fallbackHtml.includes('</p><p>')) {
        fallbackHtml = '<p>' + fallbackHtml + '</p>';
      }
      container.innerHTML = fallbackHtml;
    }
  });
</script>

<div bind:this={container} class="math-renderer {className}">
  {content}
</div>

<style>
  .math-renderer {
    line-height: 1.8;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  /* Стили для параграфов */
  .math-renderer :global(p) {
    margin: 1.2em 0;
    line-height: 1.7;
  }

  .math-renderer :global(p:first-child) {
    margin-top: 0;
  }

  .math-renderer :global(p:last-child) {
    margin-bottom: 0;
  }

  /* Красивые стили для display математики */
  :global(.math-display) {
    display: block;
    margin: 1.5em 0;
    text-align: center;
    overflow-x: auto;
    padding: 1em 0;
    background: rgba(248, 250, 252, 0.8);
    border-radius: 8px;
    border: 1px solid rgba(226, 232, 240, 0.5);
    animation: fadeInMath 0.3s ease-out;
  }

  /* Темная тема для display математики */
  :global(.dark .math-display) {
    background: rgba(30, 41, 59, 0.4);
    border-color: rgba(71, 85, 105, 0.3);
  }

  /* Основные стили KaTeX */
  :global(.katex) {
    font-size: 1.15em;
    font-family: 'KaTeX_Main', 'Times New Roman', serif;
  }

  :global(.katex-display) {
    margin: 1.2em 0;
    text-align: center;
  }

  /* Улучшенные стили для дробей */
  :global(.katex .frac-line) {
    border-bottom-width: 0.05em;
    border-color: currentColor;
  }

  :global(.katex .frac .frac-line) {
    margin: 0.1em 0;
  }

  /* Стили для больших операторов (интегралы, суммы) */
  :global(.katex .mop) {
    font-size: 1.3em;
    margin: 0 0.1em;
  }

  :global(.katex .mop.op-limits) {
    font-size: 1.4em;
  }

  /* Улучшенные стили для пределов */
  :global(.katex .msupsub) {
    font-size: 0.75em;
  }

  :global(.katex .msubsup) {
    font-size: 0.75em;
  }

  /* Стили для корней */
  :global(.katex .sqrt) {
    border-top: 0.04em solid;
  }

  :global(.katex .sqrt > .root) {
    margin-left: 0.3em;
    margin-right: -0.6em;
  }

  /* Стили для матриц */
  :global(.katex .mtable) {
    border-spacing: 0.2em 0.6em;
    margin: 0.5em 0;
  }

  :global(.katex .arraycolsep) {
    width: 0.6em;
  }

  /* Стили для скобок */
  :global(.katex .delimsizing) {
    font-size: 1.1em;
  }

  /* Стили для греческих букв */
  :global(.katex .mathit) {
    font-style: italic;
  }

  /* Стили для математических множеств */
  :global(.katex .mathbb) {
    font-weight: bold;
  }

  /* Красивые стили для ошибок */
  :global(.math-error) {
    color: #dc2626;
    background: rgba(254, 226, 226, 0.8);
    padding: 0.3em 0.6em;
    border-radius: 6px;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
    font-size: 0.9em;
    border: 1px solid rgba(248, 113, 113, 0.3);
  }

  :global(.dark .math-error) {
    color: #fca5a5;
    background: rgba(127, 29, 29, 0.3);
    border-color: rgba(185, 28, 28, 0.3);
  }

  /* Улучшенная типографика для inline математики */
  :global(.katex .base) {
    display: inline-block;
    vertical-align: baseline;
  }

  /* Стили для факториалов и других постфиксных операторов */
  :global(.katex .mord + .mord) {
    margin-left: 0.05em;
  }

  /* Стили для функций */
  :global(.katex .mop.op-symbol) {
    font-family: 'KaTeX_Main', serif;
    margin-right: 0.1em;
  }

  /* Улучшенные отступы */
  :global(.katex .mbin) {
    margin: 0 0.2em;
  }

  :global(.katex .mrel) {
    margin: 0 0.25em;
  }

  :global(.katex .mpunct) {
    margin: 0 0.1em;
  }

  /* Адаптивность для мобильных устройств */
  @media (max-width: 768px) {
    :global(.math-display) {
      font-size: 0.95em;
      overflow-x: auto;
      padding: 0.8em 0.5em;
      margin: 1em 0;
    }

    :global(.katex) {
      font-size: 1.05em;
    }

    :global(.katex .mop) {
      font-size: 1.2em;
    }
  }

  /* Стили для высокого разрешения */
  @media (min-resolution: 2dppx) {
    :global(.katex) {
      font-size: 1.2em;
    }

    :global(.katex .frac-line) {
      border-bottom-width: 0.04em;
    }
  }

  /* Анимация для появления математики */
  @keyframes fadeInMath {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
