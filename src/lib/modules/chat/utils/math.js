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

  normalized = normalized.replace(/[∫∬∭⨌∮∯∰∱∲∳]/g, (symbol) =>
    integralSymbolMap[symbol] ? integralSymbolMap[symbol] : '\\int'
  );

  normalized = normalized.replace(
    /√\s*\(?([^)]+)\)?/g,
    (_, radicand) => `\\sqrt{${radicand.trim()}}`
  );
  normalized = normalized.replace(
    /sqrt\(([^)]+)\)/gi,
    (_, radicand) => `\\sqrt{${radicand.trim()}}`
  );

  normalized = normalized.replace(
    /([a-zA-Z0-9\\}])\^\(([^)]+)\)/g,
    (_, base, exponent) => `${base}^{${exponent}}`
  );
  normalized = normalized.replace(
    /([a-zA-Z0-9\\}])\^(\d+)/g,
    (_, base, exponent) => `${base}^{${exponent}}`
  );

  normalized = normalized.replace(/d([a-zA-Z])\b/g, (match, variable, offset, str) => {
    const prefix = str.slice(Math.max(0, offset - 3), offset);
    if (prefix === '\\, ') {
      return match;
    }
    return `\\\\, d${variable}`;
  });

  normalized = normalized.replace(
    SIMPLE_FRACTION_REGEX,
    (match, prefix, numerator, denominator) => {
      const safePrefix = prefix ? prefix : '';
      return `${safePrefix}\\frac{${numerator}}{${denominator}}`;
    }
  );

  return normalized;
}

function wrapDisplayMath(text) {
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (/^\$\$.*\$\$/.test(trimmed) || /^\$[^$]*\$/.test(trimmed)) {
        return line;
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

      if (line === trimmed) {
        return candidate;
      }

      const leadingIndex = line.indexOf(trimmed);
      if (leadingIndex === -1) {
        return candidate;
      }

      const leadingWhitespace = line.slice(0, leadingIndex);
      return `${leadingWhitespace}${candidate}`;
    })
    .join('\n');
}

function wrapInlineMath(text) {
  const segments = text.split(/(\$\$[^$]*\$\$)/g);
  return segments
    .map((segment) => {
      if (segment.startsWith('$$')) {
        return segment;
      }

      let processed = segment;

      inlineMathPatterns.forEach((pattern) => {
        processed = processed.replace(pattern, (match, offset, str) => {
          const before = str.slice(0, offset);
          const after = str.slice(offset + match.length);
          const alreadyWrapped = before.endsWith('$') && after.startsWith('$');
          if (alreadyWrapped) {
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
      if (textPart) {
        parts.push({ type: 'text', content: textPart });
      }
    }

    const mathContent = match[1] !== undefined ? match[1] : match[2];
    const display = Boolean(match[1]);
    parts.push({ type: 'math', content: mathContent.trim(), display });

    lastIndex = mathRegex.lastIndex;
  }

  if (lastIndex < processed.length) {
    const tail = processed.slice(lastIndex);
    if (tail) {
      parts.push({ type: 'text', content: tail });
    }
  }

  if (parts.length === 0) {
    return [{ type: 'text', content: processed }];
  }

  return parts;
}

export function parseMathSegments(input) {
  if (!input) {
    return [];
  }

  const normalized = normalizeBasicTokens(input);
  const withDisplay = wrapDisplayMath(normalized);
  const withInline = wrapInlineMath(withDisplay);

  return extractSegments(withInline);
}
