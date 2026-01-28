import { describe, it, expect } from 'vitest'
import { decodeCssEscapes, stripCssComments } from '../../security/cssEscapes'

describe('decodeCssEscapes', () => {
    describe('hex escapes', () => {
        it('decodes single hex character', () => {
            // \41 = 'A'
            expect(decodeCssEscapes('\\41')).toBe('A')
        })

        it('decodes multi-character hex escapes', () => {
            // \68\74\74\70\73 = 'https'
            expect(decodeCssEscapes('\\68\\74\\74\\70\\73')).toBe('https')
        })

        it('decodes 6-digit hex escape', () => {
            // \000041 = 'A'
            expect(decodeCssEscapes('\\000041')).toBe('A')
        })

        it('consumes optional trailing whitespace after hex escape', () => {
            // \41 B → 'AB' (space consumed as part of escape)
            expect(decodeCssEscapes('\\41 B')).toBe('AB')
        })

        it('handles mixed hex escapes and plain text', () => {
            expect(decodeCssEscapes('\\68ttps://evil.com')).toBe('https://evil.com')
        })
    })

    describe('literal escapes', () => {
        it('decodes backslash followed by non-hex character', () => {
            expect(decodeCssEscapes('\\:')).toBe(':')
        })

        it('decodes backslash followed by letter', () => {
            expect(decodeCssEscapes('\\n')).toBe('n')
        })
    })

    describe('no escapes', () => {
        it('returns plain text unchanged', () => {
            expect(decodeCssEscapes('https://example.com')).toBe('https://example.com')
        })

        it('returns empty string unchanged', () => {
            expect(decodeCssEscapes('')).toBe('')
        })
    })

    describe('bypass prevention', () => {
        it('decodes full https URL from hex escapes', () => {
            // \68=h \74=t \74=t \70=p \73=s
            const escaped = '\\68\\74\\74\\70\\73://evil.com/track.gif'
            expect(decodeCssEscapes(escaped)).toBe('https://evil.com/track.gif')
        })

        it('decodes protocol-relative URL from hex escapes', () => {
            // \2f = /
            const escaped = '\\2f\\2f evil.com/track.gif'
            expect(decodeCssEscapes(escaped)).toBe('//evil.com/track.gif')
        })

        it('decodes javascript: from hex escapes', () => {
            // \6a=j \61=a \76=v \61=a
            const escaped = '\\6a\\61\\76\\61script:alert(1)'
            expect(decodeCssEscapes(escaped)).toBe('javascript:alert(1)')
        })

        it('decodes mixed escape styles', () => {
            // \68 = h, rest is plain
            const escaped = '\\68 ttp\\73://evil.com'
            expect(decodeCssEscapes(escaped)).toBe('https://evil.com')
        })
    })

    describe('invalid code points', () => {
        it('replaces code point above U+10FFFF with U+FFFD', () => {
            expect(decodeCssEscapes('\\110000')).toBe('\uFFFD')
        })

        it('replaces null code point (\\0) with U+FFFD', () => {
            expect(decodeCssEscapes('\\0 ')).toBe('\uFFFD')
        })

        it('replaces surrogate code points with U+FFFD', () => {
            // \D800 and \DFFF are surrogate range
            expect(decodeCssEscapes('\\D800')).toBe('\uFFFD')
            expect(decodeCssEscapes('\\DFFF')).toBe('\uFFFD')
        })

        it('does not throw on extremely large hex values', () => {
            // \FFFFFF = 0xFFFFFF > 0x10FFFF → U+FFFD
            expect(() => decodeCssEscapes('\\FFFFFF')).not.toThrow()
            expect(decodeCssEscapes('\\FFFFFF')).toBe('\uFFFD')
        })

        it('allows valid high code points', () => {
            // U+1F600 = 😀 (within valid range)
            expect(decodeCssEscapes('\\1F600')).toBe('\u{1F600}')
        })
    })

    describe('line continuations', () => {
        it('removes backslash + \\n', () => {
            expect(decodeCssEscapes('\\\nhttps://evil.com')).toBe('https://evil.com')
        })

        it('removes backslash + \\r\\n', () => {
            expect(decodeCssEscapes('\\\r\nhttps://evil.com')).toBe('https://evil.com')
        })

        it('removes backslash + \\r', () => {
            expect(decodeCssEscapes('\\\rhttps://evil.com')).toBe('https://evil.com')
        })

        it('removes backslash + \\f (form feed)', () => {
            expect(decodeCssEscapes('\\\fhttps://evil.com')).toBe('https://evil.com')
        })

        it('handles line continuation in the middle of text', () => {
            expect(decodeCssEscapes('htt\\\nps://evil.com')).toBe('https://evil.com')
        })
    })
})

describe('stripCssComments', () => {
    it('removes a simple comment', () => {
        expect(stripCssComments('/*x*/https://evil.com')).toBe('https://evil.com')
    })

    it('removes multiple comments', () => {
        expect(stripCssComments('/*a*/https/*b*/://evil.com')).toBe('https://evil.com')
    })

    it('removes multiline comment', () => {
        expect(stripCssComments('/*\nmultiline\n*/https://evil.com')).toBe('https://evil.com')
    })

    it('returns plain text unchanged', () => {
        expect(stripCssComments('https://example.com')).toBe('https://example.com')
    })

    it('returns empty string unchanged', () => {
        expect(stripCssComments('')).toBe('')
    })

    it('does not strip comment markers inside double quotes', () => {
        expect(stripCssComments('content:"/*x*/"')).toBe('content:"/*x*/"')
    })

    it('does not strip comment markers inside single quotes', () => {
        expect(stripCssComments("content:'/*x*/'")).toBe("content:'/*x*/'")
    })
})
