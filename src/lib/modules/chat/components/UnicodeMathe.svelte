<script>
  export let content = '';
  export let className = '';

  function formatMath(text) {
    if (!text) return '';

    let formatted = text;

    // Only process if it contains mathematical content
    const isMath = /теорем|пифагор|формул|площадь|катет|гипотенуза|квадрат|корень|\^|√/i.test(text);

    if (isMath) {
      // Replace exponents with Unicode superscripts
      formatted = formatted.replace(/\^2/g, '²');
      formatted = formatted.replace(/\^3/g, '³');
      formatted = formatted.replace(/\^1/g, '¹');
      formatted = formatted.replace(/\^4/g, '⁴');
      formatted = formatted.replace(/\^5/g, '⁵');
      formatted = formatted.replace(/\^6/g, '⁶');
      formatted = formatted.replace(/\^7/g, '⁷');
      formatted = formatted.replace(/\^8/g, '⁸');
      formatted = formatted.replace(/\^9/g, '⁹');
      formatted = formatted.replace(/\^0/g, '⁰');

      // Replace multiplication signs
      formatted = formatted.replace(/\s\*\s/g, ' × ');

      // Replace division signs
      formatted = formatted.replace(/\s\/\s/g, ' ÷ ');

      // Keep square root symbol as is
      // √ is already a Unicode character
    }

    // Convert line breaks to HTML
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
  }

  $: formattedContent = formatMath(content);
</script>

{@html `<div class="unicode-math ${className}">${formattedContent}</div>`}

<style>
  .unicode-math {
    font-family: 'Times New Roman', serif;
    line-height: 1.6;
  }

  .unicode-math :global(sup) {
    font-size: 0.8em;
    vertical-align: super;
  }
</style>
