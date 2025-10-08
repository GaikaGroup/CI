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

const AUTO_INLINE_OPEN = '\uf000';
const AUTO_INLINE_CLOSE = '\uf001';

const SIMPLE_FRACTION_REGEX =
  /(^|[\s(])([a-zA-Z0-9^{}]+)\s*\/\s*([a-zA-Z0-9^{}]+)(?=$|[\s.,;:!?)])/g;

const ALPHANUMERIC_REGEX = /[\p{L}\p{N}]/u;

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

  if (!inside) {
    return false;
  }

  const after = str.slice(offset + length);
  return hasUnescapedDollar(after);
}

function normalizeLegacyDelimiters(text) {
  if (!text) {
    return text;
  }

  let normalized = text;

  normalized = normalized.replace(/\\\[([\s\S]*?)\\\]/g, (match, content, offset, str) => {
    if (offset > 0 && str[offset - 1] === '\\') {
      return match;
    }

    const trimmed = content.trim();
    if (!trimmed) {
      return match;
    }

    return `$$${trimmed}$$`;
  });

  normalized = normalized.replace(/\\\(([\s\S]*?)\\\)/g, (match, content, offset, str) => {
    if (offset > 0 && str[offset - 1] === '\\') {
      return match;
    }

    const trimmed = content.trim();
    if (!trimmed) {
      return match;
    }

    return `$${trimmed}$`;
  });

  return normalized;
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
          if (isWithinInlineDelimiters(str, offset, match.length)) {
            return match;
          }

          const precedingChar = offset > 0 ? str[offset - 1] : '';
          if (precedingChar === '$' && (offset < 2 || str[offset - 2] !== '\\')) {
            return match;
          }

          const followingChar = str[offset + match.length];
          if (
            followingChar === '$' &&
            (offset + match.length === 0 || str[offset + match.length - 1] !== '\\')
          ) {
            return match;
          }

          const prefix = str.slice(0, offset);
          if (countUnescapedDollars(prefix) % 2 === 1) {
            return match;
          }

          if (countUnescapedDollars(match) > 0) {
            return match;
          }

          return `${AUTO_INLINE_OPEN}${match.trim()}${AUTO_INLINE_CLOSE}`;
        });
      });

      return processed;
    })
    .join('');
}

function extractSegments(processed) {
  const parts = [];
  let buffer = '';

  const flushText = () => {
    if (buffer) {
      parts.push({ type: 'text', content: buffer });
      buffer = '';
    }
  };

  const length = processed.length;
  let index = 0;

  while (index < length) {
    const char = processed[index];

    if (char === AUTO_INLINE_OPEN) {
      const closeIndex = processed.indexOf(AUTO_INLINE_CLOSE, index + 1);
      if (closeIndex !== -1) {
        flushText();
        const content = processed.slice(index + 1, closeIndex).trim();
        if (content) {
          parts.push({ type: 'math', content, display: false });
        }
        index = closeIndex + 1;
        continue;
      }

      buffer += char;
      index += 1;
      continue;
    }

    if (char === '$' && (index === 0 || processed[index - 1] !== '\\')) {
      const isDisplay = index + 1 < length && processed[index + 1] === '$';
      const delimiterLength = isDisplay ? 2 : 1;
      const start = index + delimiterLength;
      let cursor = start;
      let found = false;

      while (cursor < length) {
        const current = processed[cursor];

        if (current === '\\') {
          cursor += 2;
          continue;
        }

        if (isDisplay) {
          if (current === '$' && cursor + 1 < length && processed[cursor + 1] === '$') {
            found = true;
            break;
          }
        } else {
          if (current === '\n') {
            break;
          }
          if (current === '$') {
            const rawContent = processed.slice(start, cursor);
            if (/\s$/u.test(rawContent)) {
              const nextChar = processed[cursor + 1];
              if (nextChar && ALPHANUMERIC_REGEX.test(nextChar)) {
                found = false;
                break;
              }
            }

            found = true;
            break;
          }
        }

        cursor += 1;
      }

      if (found) {
        const content = processed.slice(start, cursor).trim();
        if (content) {
          flushText();
          parts.push({ type: 'math', content, display: isDisplay });
          index = cursor + delimiterLength;
          continue;
        }
      }
    }

    buffer += char;
    index += 1;
  }

  flushText();

  if (parts.length === 0) {
    return buffer ? [{ type: 'text', content: buffer }] : [];
  }

  return parts;
}

export function parseMathSegments(input) {
  if (!input) {
    return [];
  }

  const normalized = normalizeBasicTokens(input);
  const withLegacyDelimiters = normalizeLegacyDelimiters(normalized);
  const withDisplay = wrapDisplayMath(withLegacyDelimiters);
  const withInline = wrapInlineMath(withDisplay);
  return extractSegments(withInline);
}
