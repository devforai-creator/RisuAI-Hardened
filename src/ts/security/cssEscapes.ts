/**
 * Decode CSS escape sequences so that URL allowlist checks cannot be
 * bypassed with e.g. `url(\68\74\74\70\73://evil.com)`.
 *
 * CSS spec:
 * - Backslash + 1-6 hex digits (+ optional trailing whitespace) → code point
 * - Backslash + newline (\n, \r\n, \r, \f) → removed (line continuation)
 * - Backslash + any other character → literal escape
 */
export function decodeCssEscapes(raw: string): string {
    return raw.replace(
        /\\([0-9a-fA-F]{1,6})\s?|\\(\r\n?|\n|\f)|\\([\s\S])/g,
        (_match, hex: string | undefined, lineBreak: string | undefined, literal: string | undefined) => {
            if (hex) {
                const cp = parseInt(hex, 16)
                // CSS spec: code points above U+10FFFF or surrogates → U+FFFD
                if (cp > 0x10FFFF || (cp >= 0xD800 && cp <= 0xDFFF) || cp === 0) {
                    return '\uFFFD'
                }
                return String.fromCodePoint(cp)
            }
            if (lineBreak !== undefined) return '' // line continuation
            return literal ?? ''
        }
    )
}

/**
 * Strip CSS comments outside of string literals so that e.g.
 * `url(/<!-- -->*x*<!-- -->/https://evil.com)` cannot bypass URL checks.
 */
export function stripCssComments(raw: string): string {
    let out = ''
    let i = 0
    let inSingle = false
    let inDouble = false
    while (i < raw.length) {
        const ch = raw[i]
        if (!inSingle && !inDouble && ch === '/' && raw[i + 1] === '*') {
            i += 2
            while (i < raw.length && !(raw[i] === '*' && raw[i + 1] === '/')) {
                i++
            }
            if (i < raw.length) {
                i += 2
            }
            continue
        }
        if (ch === '\\') {
            out += ch
            if (i + 1 < raw.length) {
                out += raw[i + 1]
                i += 2
                continue
            }
        }
        if (!inDouble && ch === "'") {
            inSingle = !inSingle
        } else if (!inSingle && ch === '"') {
            inDouble = !inDouble
        }
        out += ch
        i++
    }
    return out
}

/**
 * Normalize CSS for URL scanning by removing comments (outside strings)
 * and decoding escapes/line continuations.
 */
export function normalizeCssForUrlScan(raw: string): string {
    return decodeCssEscapes(stripCssComments(raw))
}
