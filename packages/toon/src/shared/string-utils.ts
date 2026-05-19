import { BACKSLASH, CARRIAGE_RETURN, DOUBLE_QUOTE, NEWLINE, TAB } from '../constants.ts'

/**
 * Escapes special characters in a string for encoding.
 *
 * @remarks
 * Handles backslashes, quotes, newlines, carriage returns, and tabs.
 * Other U+0000–U+001F control characters are emitted as `\uXXXX`.
 */
export function escapeString(value: string): string {
  return value
    .replace(/\\/g, `${BACKSLASH}${BACKSLASH}`)
    .replace(/"/g, `${BACKSLASH}${DOUBLE_QUOTE}`)
    .replace(/\n/g, `${BACKSLASH}n`)
    .replace(/\r/g, `${BACKSLASH}r`)
    .replace(/\t/g, `${BACKSLASH}t`)
    .replace(/[\u0000-\u001f]/g, c => `${BACKSLASH}u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)
}

/**
 * Unescapes a string by processing escape sequences.
 *
 * @remarks
 * Handles `\n`, `\t`, `\r`, `\\`, `\"`, and `\uXXXX` escape sequences.
 * Lone surrogates in `\uXXXX` are rejected.
 */
export function unescapeString(value: string): string {
  let unescaped = ''
  let i = 0

  while (i < value.length) {
    if (value[i] === BACKSLASH) {
      if (i + 1 >= value.length) {
        throw new SyntaxError('Invalid escape sequence: backslash at end of string')
      }

      const next = value[i + 1]
      if (next === 'n') {
        unescaped += NEWLINE
        i += 2
        continue
      }
      if (next === 't') {
        unescaped += TAB
        i += 2
        continue
      }
      if (next === 'r') {
        unescaped += CARRIAGE_RETURN
        i += 2
        continue
      }
      if (next === BACKSLASH) {
        unescaped += BACKSLASH
        i += 2
        continue
      }
      if (next === DOUBLE_QUOTE) {
        unescaped += DOUBLE_QUOTE
        i += 2
        continue
      }
      if (next === 'u') {
        if (i + 6 > value.length) {
          throw new SyntaxError(`Invalid escape sequence: truncated \\u escape at "${value.slice(i, i + 6)}"`)
        }
        const hex = value.slice(i + 2, i + 6)
        if (!/^[0-9a-f]{4}$/i.test(hex)) {
          throw new SyntaxError(`Invalid escape sequence: \\u must be followed by 4 hex digits, got "${hex}"`)
        }
        const codeUnit = Number.parseInt(hex, 16)
        if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
          throw new SyntaxError(`Invalid escape sequence: \\u${hex} is a lone surrogate; supplementary code points MUST appear as literal UTF-8`)
        }
        unescaped += String.fromCodePoint(codeUnit)
        i += 6
        continue
      }

      throw new SyntaxError(`Invalid escape sequence: \\${next}`)
    }

    unescaped += value[i]
    i++
  }

  return unescaped
}

/**
 * Finds the index of the closing double quote, accounting for escape sequences.
 */
export function findClosingQuote(content: string, start: number): number {
  let i = start + 1
  while (i < content.length) {
    if (content[i] === BACKSLASH && i + 1 < content.length) {
      // Skip escaped character
      i += 2
      continue
    }
    if (content[i] === DOUBLE_QUOTE) {
      return i
    }
    i++
  }
  return -1 // Not found
}

/**
 * Finds the index of a character outside of quoted sections.
 */
export function findUnquotedChar(content: string, char: string, start = 0): number {
  let inQuotes = false
  let i = start

  while (i < content.length) {
    if (content[i] === BACKSLASH && i + 1 < content.length && inQuotes) {
      // Skip escaped character
      i += 2
      continue
    }

    if (content[i] === DOUBLE_QUOTE) {
      inQuotes = !inQuotes
      i++
      continue
    }

    if (content[i] === char && !inQuotes) {
      return i
    }

    i++
  }

  return -1
}
