import { describe, expect, it } from 'vitest';
import { sanitizePreviewPayload } from '../previewSanitizer';

describe('sanitizePreviewPayload', () => {
    it('removes headers and masks sensitive query params', () => {
        const raw = JSON.stringify({
            url: 'https://example.com/path?key=abc&foo=bar&access_token=xyz',
            body: { a: 1 },
            headers: { Authorization: 'Bearer secret' }
        });
        const sanitized = JSON.parse(sanitizePreviewPayload(raw));
        expect(sanitized.headers).toBeUndefined();
        expect(sanitized.body).toEqual({ a: 1 });
        const url = new URL(sanitized.url);
        expect(url.searchParams.get('key')).toBe('<redacted>');
        expect(url.searchParams.get('access_token')).toBe('<redacted>');
        expect(url.searchParams.get('foo')).toBe('bar');
    });

    it('removes legacy header field', () => {
        const raw = JSON.stringify({
            url: 'https://example.com',
            header: { 'x-test': 'secret' }
        });
        const sanitized = JSON.parse(sanitizePreviewPayload(raw));
        expect(sanitized.header).toBeUndefined();
    });

    it('sanitizes array payloads', () => {
        const raw = JSON.stringify([
            {
                url: 'https://example.com?api_key=secret',
                headers: { 'x-test': 'secret' }
            }
        ]);
        const sanitized = JSON.parse(sanitizePreviewPayload(raw));
        expect(Array.isArray(sanitized)).toBe(true);
        const url = new URL(sanitized[0].url);
        expect(url.searchParams.get('api_key')).toBe('<redacted>');
        expect(sanitized[0].headers).toBeUndefined();
    });

    it('returns a safe error payload for invalid JSON', () => {
        expect(sanitizePreviewPayload('not json')).toBe(
            JSON.stringify({ error: 'preview_unavailable' })
        );
    });
});
