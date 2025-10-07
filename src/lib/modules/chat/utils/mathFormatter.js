/**
 * Simple math formatting utility
 * Converts mathematical expressions to proper Unicode symbols
 */

export function formatMath(text) {
  if (!text) return text;

  // Only process if it contains mathematical content
  const isMath =
    /теорем|пифагор|формул|площадь|катет|гипотенуза|квадрат|корень|производн|интеграл|функци|уравнени|объем|вращени|определенн|\^|√|∫|dx|dy|dt|lim/i.test(
      text
    );

  if (!isMath) return text;

  let formatted = text;

  // Replace exponents with Unicode superscripts
  formatted = formatted.replace(/\^0/g, '⁰');
  formatted = formatted.replace(/\^1/g, '¹');
  formatted = formatted.replace(/\^2/g, '²');
  formatted = formatted.replace(/\^3/g, '³');
  formatted = formatted.replace(/\^4/g, '⁴');
  formatted = formatted.replace(/\^5/g, '⁵');
  formatted = formatted.replace(/\^6/g, '⁶');
  formatted = formatted.replace(/\^7/g, '⁷');
  formatted = formatted.replace(/\^8/g, '⁸');
  formatted = formatted.replace(/\^9/g, '⁹');

  // Replace subscripts
  formatted = formatted.replace(/_0/g, '₀');
  formatted = formatted.replace(/_1/g, '₁');
  formatted = formatted.replace(/_2/g, '₂');
  formatted = formatted.replace(/_3/g, '₃');
  formatted = formatted.replace(/_4/g, '₄');
  formatted = formatted.replace(/_5/g, '₅');
  formatted = formatted.replace(/_6/g, '₆');
  formatted = formatted.replace(/_7/g, '₇');
  formatted = formatted.replace(/_8/g, '₈');
  formatted = formatted.replace(/_9/g, '₉');

  // Replace mathematical operators
  formatted = formatted.replace(/\s\*\s/g, ' × ');
  formatted = formatted.replace(/\s\/\s/g, ' ÷ ');
  formatted = formatted.replace(/\+\-/g, '±');
  formatted = formatted.replace(/<=/g, '≤');
  formatted = formatted.replace(/>=/g, '≥');
  formatted = formatted.replace(/!=/g, '≠');
  formatted = formatted.replace(/~=/g, '≈');

  // Replace common fractions
  formatted = formatted.replace(/1\/2/g, '½');
  formatted = formatted.replace(/1\/3/g, '⅓');
  formatted = formatted.replace(/2\/3/g, '⅔');
  formatted = formatted.replace(/1\/4/g, '¼');
  formatted = formatted.replace(/3\/4/g, '¾');

  // Replace Greek letters
  formatted = formatted.replace(/\bpi\b/g, 'π');
  formatted = formatted.replace(/\balpha\b/g, 'α');
  formatted = formatted.replace(/\bbeta\b/g, 'β');
  formatted = formatted.replace(/\bgamma\b/g, 'γ');
  formatted = formatted.replace(/\bdelta\b/g, 'δ');
  formatted = formatted.replace(/\btheta\b/g, 'θ');
  formatted = formatted.replace(/\blambda\b/g, 'λ');
  formatted = formatted.replace(/\bsigma\b/g, 'σ');
  formatted = formatted.replace(/\bomega\b/g, 'ω');

  // Replace calculus symbols
  formatted = formatted.replace(/\bintegral\b/g, '∫');
  formatted = formatted.replace(/\bsum\b/g, '∑');
  formatted = formatted.replace(/\binfinity\b/g, '∞');
  formatted = formatted.replace(/\bpartial\b/g, '∂');

  // Integral patterns
  formatted = formatted.replace(/\\int_\{([^}]+)\}\^\{([^}]+)\}/g, '∫_{$1}^{$2}');
  formatted = formatted.replace(/\\int_([^\s]+)\^([^\s]+)/g, '∫_$1^$2');
  formatted = formatted.replace(/\\int_\{([^}]+)\}/g, '∫_{$1}');
  formatted = formatted.replace(/\\int\^\{([^}]+)\}/g, '∫^{$1}');

  // Definite integral notation: int_0^2 -> ∫₀²
  formatted = formatted.replace(/int_(\d+)\^(\d+)/g, (match, lower, upper) => {
    const lowerSub = lower
      .split('')
      .map((d) => '₀₁₂₃₄₅₆₇₈₉'[d] || d)
      .join('');
    const upperSup = upper
      .split('')
      .map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d] || d)
      .join('');
    return `∫${lowerSub}${upperSup}`;
  });

  // Double and triple integrals
  formatted = formatted.replace(/\\iint/g, '∬');
  formatted = formatted.replace(/\\iiint/g, '∭');
  formatted = formatted.replace(/\\oint/g, '∮');

  // Differential notation: dx, dy, dt
  formatted = formatted.replace(/\bd([a-zA-Z])\b/g, 'd$1');

  // Function notation: f'(x) -> f′(x)
  formatted = formatted.replace(/([a-zA-Z])'(\([^)]*\))/g, '$1′$2');

  // Limit notation
  formatted = formatted.replace(/\\lim_\{([^}]+)\}/g, 'lim_{$1}');
  formatted = formatted.replace(/lim_([^\s]+)/g, 'lim_$1');

  // Special integral patterns from your example
  // \int_{0}^{2} x^2 \, dx -> ∫₀² x² dx
  formatted = formatted.replace(
    /\\int_\{([^}]+)\}\^\{([^}]+)\}\s*([^\\]+)\s*\\,?\s*d([a-zA-Z])/g,
    (match, lower, upper, expr, var_) => {
      // Convert bounds to subscript/superscript
      const lowerFormatted = lower
        .split('')
        .map((c) => {
          if (/\d/.test(c)) return '₀₁₂₃₄₅₆₇₈₉'[c];
          return c;
        })
        .join('');
      const upperFormatted = upper
        .split('')
        .map((c) => {
          if (/\d/.test(c)) return '⁰¹²³⁴⁵⁶⁷⁸⁹'[c];
          return c;
        })
        .join('');

      return `∫${lowerFormatted}${upperFormatted} ${expr.trim()} d${var_}`;
    }
  );

  // Handle simple integral notation: int (expression) dx
  formatted = formatted.replace(/\\int\s*\(([^)]+)\)\s*d([a-zA-Z])/g, '∫ ($1) d$2');

  return formatted;
}
