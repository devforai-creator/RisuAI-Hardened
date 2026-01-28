const PREVIEW_SENSITIVE_PARAM_RE = /^(key|api_key|apikey|access_token|token|authorization|auth|x-goog-api-key)$/i

function scrubPreviewUrl(rawUrl: string): string {
    try {
        const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
        const url = new URL(rawUrl, base)
        for (const [key] of url.searchParams) {
            if (PREVIEW_SENSITIVE_PARAM_RE.test(key)) {
                url.searchParams.set(key, '<redacted>')
            }
        }
        return url.toString()
    } catch {
        return rawUrl
    }
}

function sanitizePreviewRoot(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(sanitizePreviewRoot)
    }
    if (!value || typeof value !== 'object') {
        return null
    }
    const sanitized: Record<string, unknown> = { ...(value as Record<string, unknown>) }
    delete sanitized.headers
    delete sanitized.header
    if (typeof sanitized.url === 'string') {
        sanitized.url = scrubPreviewUrl(sanitized.url)
    }
    return sanitized
}

export function sanitizePreviewPayload(raw: string): string {
    try {
        const parsed = JSON.parse(raw)
        const sanitized = sanitizePreviewRoot(parsed)
        if (sanitized === null) {
            return JSON.stringify({ error: 'preview_unavailable' })
        }
        return JSON.stringify(sanitized)
    } catch {
        return JSON.stringify({ error: 'preview_unavailable' })
    }
}
