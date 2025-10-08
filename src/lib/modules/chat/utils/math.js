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

const displayMathTriggers = [
  /^(\\int|\\iint|\\iiint|\\iiiint|\\oint|\\oiint|\\oiiint)\b/,
  /\\int[^\n]*\\,\s*d[a-zA-Z]/,
  /\\frac\{[^}]+\}\{[^}]+\}/,
  /[=≈≠≤≥]/
];

const inlineMathPatterns = [
  /\\frac\{[^}]+\}\{[^}]+\}/g,
  /\\sqrt\{[^}]+\}/g,
  /\\int[^\n]*?\\,\s*d[a-zA-Z]/g,
  /(?:[a-zA-Z0-9\\^{}]+\s*[=≈≠≤≥]+\s*[a-zA-Z0-9\\^{}+\-*/\\,() ]+)/g
];

const SIMPLE_FRACTION_REGEX =
  /(^|[\s(])([a-zA-Z0-9^{}]+)\s*\/\s*([a-zA-Z0-9^{}]+)(?=$|[\s.,;:!?)])/g;

function normalizeBasicTokens(text) {
  let normalized = text;

  // Integral symbols → LaTeX commands
  normalized = normalized.replace(/[∫∬∭⨌∮∯∰∱∲∳]/g, (symbol) =>
    integralSymbolMap[symbol] ? integralSymbolMap[symbol] : '\\int'
  );

  // Roots
  normalized = normalized.replace(
    /√\s*\(?([^)]+)\)?/g,
    (_, radicand) => `\\sqrt{${radicand.trim()}}`
  );
  normalized = normalized.replace(
    /sqrt\(([^)]+)\)/gi,
    (_, radicand) => `\\sqrt{${radicand.trim()}}`
  );

  // Exponents
  normalized = normalized.replace(
    /([a-zA-Z0-9\\}])\^\(([^)]+)\)/g,
    (_, base, exponent) => `${base}^{${exponent}}`
  );
  normalized = normalized.replace(
    /([a-zA-Z0-9\\}])\^(\d+)/g,
    (_, base, exponent) => `${base}^{${exponent}}`
  );

  // Insert thin space before differentials (\, dX) if missing
  normalized = normalized.replace(/d([a-zA-Z])\b/g, (match, variable, offset, str) => {
    const prefix = str.slice(Math.max(0, offset - 3), offset);
    if (prefix === '\\, ') return match;
    return `\\\\, d${variable}`;
  });

  // Simple a/b → \frac{a}{b}
  normalized = normalized.replace(
    SIMPLE_FRACTION_REGEX,
    (match, prefix, numerator, denominator) => {
      const safePrefix = prefix ? prefix : '';
      return `${safePrefix}\\frac{${numerator}}{${denominator}}`;
    }
  );

  return normalized;
}

/* ---------- helpers ---------- */
function hasUnescapedDollar(sequence) {
  for (let i = 0; i < sequence.length; i += 1) {
    if (sequence[i] === '$' && (i === 0 || sequence[i - 1] !== '\\')) {
      return true;
    }
  }
  return false;
}

function countUnescapedDollars(sequence) {
  let count = 0;
  for (let i = 0; i < sequence.length; i += 1) {
    if (sequence[i] === '$' && (i === 0 || sequence[i - 1] !== '\\')) {
      count += 1;
    }
  }
  return count;
}

function isWithinInlineDelimiters(str, offset, length) {
  let inside = false;

  for (let i = 0; i < offset; i += 1) {
    if (str[i] === '$' && (i === 0 || str[i - 1] !== '\\')) {
      inside = !inside;
    }
  }

  if (!inside) return false;

  const after = str.slice(offset + length);
  return hasUnescapedDollar(after);
}

function normalizeLegacyDelimiters(text) {
  if (!text) return text;

  let normalized = text;

  // \[ ... ] → $$ ... $$
  normalized = normalized.replace(/\\\[([\s\S]*?)\\\]/g, (match, content, offset, str) => {
    if (offset > 0 && str[offset - 1] === '\\') return match;
    const trimmed = content.trim();
    if (!trimmed) return match;
    return `$$${trimmed}$$`;
  });

  // \( ... ) → $ ... $
  normalized = normalized.replace(/\\\(([\s\S]*?)\\\)/g, (match, content, offset, str) => {
    if (offset > 0 && str[offset - 1] === '\\') return match;
    const trimmed = content.trim();
    if (!trimmed) return match;
    return `$${trimmed}$`;
  });

  return normalized;
}
/* -------------------------------------------- */

function wrapDisplayMath(text) {
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      // already contains inline or display delimiters → skip
      if (/^\$\$.*\$\$/.test(trimmed) || /^\$[^$]*\$/.test(trimmed)) {
        return line;
      }

      // if line already has any $ (possibly part of inline), do nothing
      if (trimmed.includes('$')) {
        const inlineFree = trimmed
          .replace(/\$\$[\s\S]*?\$\$/g, '')
          .replace(/\$[^$\n]*\$/g, '')
          .trim();
        if (inlineFree.length > 0) {
          return line;
        }
      }

      let candidate = trimmed;
      for (const trigger of displayMathTriggers) {
        if (trigger.test(candidate)) {
          if (!candidate.startsWith('$$')) {
            candidate = `$$${candidate}$$`;
          }
          break;
        }
      }

      if (line === trimmed) return candidate;

      const leadingIndex = line.indexOf(trimmed);
      if (leadingIndex === -1) return candidate;

      const leadingWhitespace = line.slice(0, leadingIndex);
      return `${leadingWhitespace}${candidate}`;
    })
    .join('\n');
}

function wrapInlineMath(text) {
  const segments = text.split(/(\$\$[^$]*\$\$)/g);
  return segments
    .map((segment) => {
      // keep $$...$$ display segments intact
      if (segment.startsWith('$$')) return segment;

      // NEW: if segment has an odd number of unescaped $, skip auto-wrapping entirely
      // (prevents closing a currency $ with our inserted $)
      if (countUnescapedDollars(segment) % 2 === 1) {
        return segment;
      }

      let processed = segment;

      inlineMathPatterns.forEach((pattern) => {
        processed = processed.replace(pattern, (...args) => {
          const match = args[0];
          const str = args.at(-1);
          const offset = args.at(-2);

          // already inside $...$ → leave as is
          if (isWithinInlineDelimiters(str, offset, match.length)) {
            return match;
          }

          // exactly surrounded by $...$ already
          const before = str.slice(0, offset);
          const after = str.slice(offset + match.length);
          const alreadyWrapped = before.endsWith('$') && after.startsWith('$');
          if (alreadyWrapped) {
            return match;
          }

          // also avoid wrapping if the match itself contains any unescaped $
          if (countUnescapedDollars(match) > 0) {
            return match;
          }

          return `$${match.trim()}$`;
        });
      });

      return processed;
    })
    .join('');
}

function extractSegments(processed) {
  const parts = [];
  const mathRegex = /\$\$([^$]+)\$\$|\$([^$\n]+)\$/g;
  let lastIndex = 0;
  let match;

  while ((match = mathRegex.exec(processed)) !== null) {
    if (match.index > lastIndex) {
      const textPart = processed.slice(lastIndex, match.index);
      if (textPart) parts.push({ type: 'text', content: textPart });
    }

    const mathContent = match[1] !== undefined ? match[1] : match[2];
    const display = Boolean(match[1]);
    parts.push({ type: 'math', content: mathContent.trim(), display });

    lastIndex = mathRegex.lastIndex;
  }

  if (lastIndex < processed.length) {
    const tail = processed.slice(lastIndex);
    if (tail) parts.push({ type: 'text', content: tail });
  }

  if (parts.length === 0) {
    return [{ type: 'text', content: processed }];
  }

  return parts;
}

export function parseMathSegments(input) {
  if (!input) return [];

  const normalized = normalizeBasicTokens(input);
  const withLegacyDelimiters = normalizeLegacyDelimiters(normalized);
  const withDisplay = wrapDisplayMath(withLegacyDelimiters);
  const withInline = wrapInlineMath(withDisplay);

  return extractSegments(withInline);
}
