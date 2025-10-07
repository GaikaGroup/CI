<script>
  import { browser } from '$app/environment';
  import katex from 'katex';
  import { renderToString } from 'katex';

  export let tex = '';
  export let display = false;
  export let throwOnError = false;
  export let trust = false;

  // SSR-рендер в строку, чтобы HTML уже пришёл готовым
  let ssrHTML = '';

  $: {
    if (tex) {
      try {
        ssrHTML = renderToString(tex, {
          displayMode: display,
          throwOnError,
          trust,
          output: 'htmlAndMathml'
        });
      } catch (e) {
        ssrHTML = `<pre class="katex-error">${e.message}</pre>`;
      }
    }
  }

  let el;

  // На клиенте — «подстрахуемся»: повторно отрисуем (на случай динамики)
  $: if (browser && el && tex) {
    try {
      katex.render(tex, el, {
        displayMode: display,
        throwOnError,
        trust,
        output: 'htmlAndMathml'
      });
    } catch (e) {
      el.innerHTML = `<pre class="katex-error">${e.message}</pre>`;
    }
  }
</script>

<!-- SSR-контент вставляем сразу -->
<span bind:this={el} class="math" class:display aria-hidden="false">
  {@html ssrHTML}
</span>

<style>
  .math.display {
    display: block;
    margin: 0.75rem 0;
    text-align: center;
  }

  :global(.katex-error) {
    color: #d32f2f;
    background: rgba(255, 0, 0, 0.1);
    padding: 0.25rem;
    border-radius: 3px;
    font-size: 0.875rem;
  }
</style>
