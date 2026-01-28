import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    getGeminiCacheMinTokens,
    resolveGeminiCacheDecision,
    createGeminiCache,
    DEFAULT_GEMINI_CACHE_TTL_SECONDS,
} from '../googleCache'

// Mock globalFetch
const mockGlobalFetch = vi.hoisted(() => vi.fn())

vi.mock('src/ts/globalApi.svelte', () => ({
    globalFetch: (...args: unknown[]) => mockGlobalFetch(...args),
}))

describe('googleCache', () => {
    describe('DEFAULT_GEMINI_CACHE_TTL_SECONDS', () => {
        it('should be 20 seconds', () => {
            expect(DEFAULT_GEMINI_CACHE_TTL_SECONDS).toBe(20)
        })
    })

    describe('getGeminiCacheMinTokens', () => {
        it('returns 1024 for Flash models', () => {
            expect(getGeminiCacheMinTokens('gemini-2.5-flash')).toBe(1024)
            expect(getGeminiCacheMinTokens('gemini-3-flash-preview')).toBe(1024)
            expect(getGeminiCacheMinTokens('gemini-flash')).toBe(1024)
        })

        it('returns 4096 for Pro models', () => {
            expect(getGeminiCacheMinTokens('gemini-2.5-pro')).toBe(4096)
            expect(getGeminiCacheMinTokens('gemini-3-pro-preview')).toBe(4096)
            expect(getGeminiCacheMinTokens('gemini-pro')).toBe(4096)
        })

        it('returns null for unknown models', () => {
            expect(getGeminiCacheMinTokens('gemini-nano')).toBe(null)
            expect(getGeminiCacheMinTokens('gpt-4')).toBe(null)
            expect(getGeminiCacheMinTokens('claude-3')).toBe(null)
        })

        it('is case-insensitive', () => {
            expect(getGeminiCacheMinTokens('GEMINI-2.5-FLASH')).toBe(1024)
            expect(getGeminiCacheMinTokens('Gemini-3-Pro-Preview')).toBe(4096)
        })
    })

    describe('resolveGeminiCacheDecision', () => {
        const longPrompt = 'A'.repeat(15000) // ~5000 tokens
        const shortPrompt = 'Hi'
        const mediumPrompt = 'B'.repeat(4500) // ~1500 tokens

        describe('model support', () => {
            it('returns enabled=false and minTokens=null for unknown models', () => {
                const result = resolveGeminiCacheDecision({
                    modelId: 'gpt-4',
                    systemPrompt: longPrompt,
                    messagesToCache: [],
                })

                expect(result.enabled).toBe(false)
                expect(result.minTokens).toBe(null)
                expect(result.reason).toBe('model')
            })

            it('returns correct minTokens for Flash models', () => {
                const result = resolveGeminiCacheDecision({
                    modelId: 'gemini-2.5-flash',
                    systemPrompt: mediumPrompt, // ~1500 tokens > 1024
                    messagesToCache: [],
                })

                expect(result.enabled).toBe(true)
                expect(result.minTokens).toBe(1024)
            })

            it('returns correct minTokens for Pro models', () => {
                const result = resolveGeminiCacheDecision({
                    modelId: 'gemini-3-pro-preview',
                    systemPrompt: longPrompt, // ~5000 tokens > 4096
                    messagesToCache: [],
                })

                expect(result.enabled).toBe(true)
                expect(result.minTokens).toBe(4096)
            })
        })

        describe('token threshold', () => {
            it('returns enabled=false when below minimum tokens for Flash', () => {
                const result = resolveGeminiCacheDecision({
                    modelId: 'gemini-2.5-flash',
                    systemPrompt: shortPrompt,
                    messagesToCache: [{ role: 'user', parts: [{ text: 'Hi' }] }],
                })

                expect(result.enabled).toBe(false)
                expect(result.reason).toBe('min_tokens')
            })

            it('returns enabled=true when above minimum tokens for Flash', () => {
                const result = resolveGeminiCacheDecision({
                    modelId: 'gemini-2.5-flash',
                    systemPrompt: mediumPrompt, // ~1500 tokens > 1024
                    messagesToCache: [],
                })

                expect(result.enabled).toBe(true)
            })

            it('returns enabled=false when below minimum tokens for Pro', () => {
                const result = resolveGeminiCacheDecision({
                    modelId: 'gemini-3-pro-preview',
                    systemPrompt: mediumPrompt, // ~1500 tokens < 4096
                    messagesToCache: [],
                })

                expect(result.enabled).toBe(false)
                expect(result.reason).toBe('min_tokens')
            })

            it('returns enabled=true when above minimum tokens for Pro', () => {
                const result = resolveGeminiCacheDecision({
                    modelId: 'gemini-3-pro-preview',
                    systemPrompt: longPrompt, // ~5000 tokens > 4096
                    messagesToCache: [],
                })

                expect(result.enabled).toBe(true)
            })

            it('combines system prompt and message tokens', () => {
                const result = resolveGeminiCacheDecision({
                    modelId: 'gemini-3-pro-preview',
                    systemPrompt: mediumPrompt, // ~1500 tokens
                    messagesToCache: [
                        { role: 'user', parts: [{ text: 'C'.repeat(6000) }] }, // ~2000 tokens
                        { role: 'model', parts: [{ text: 'D'.repeat(6000) }] }, // ~2000 tokens
                    ],
                })

                // Total: ~5500 tokens > 4096
                expect(result.enabled).toBe(true)
            })
        })

        describe('message validation (text-only)', () => {
            it('returns enabled=false for messages with non-text parts', () => {
                const result = resolveGeminiCacheDecision({
                    modelId: 'gemini-2.5-flash',
                    systemPrompt: longPrompt,
                    messagesToCache: [
                        {
                            role: 'user',
                            parts: [
                                { text: 'Hello' },
                                { inlineData: { mimeType: 'image/png', data: 'base64...' } },
                            ],
                        },
                    ],
                })

                expect(result.enabled).toBe(false)
                expect(result.reason).toBe('non_text')
            })

            it('returns enabled=false for function role messages', () => {
                const result = resolveGeminiCacheDecision({
                    modelId: 'gemini-2.5-flash',
                    systemPrompt: longPrompt,
                    messagesToCache: [
                        { role: 'function', parts: [{ text: 'result' }] },
                    ],
                })

                expect(result.enabled).toBe(false)
                expect(result.reason).toBe('non_text')
            })

            it('returns enabled=true for text-only user/model messages', () => {
                const result = resolveGeminiCacheDecision({
                    modelId: 'gemini-2.5-flash',
                    systemPrompt: longPrompt,
                    messagesToCache: [
                        { role: 'user', parts: [{ text: 'Hello' }] },
                        { role: 'model', parts: [{ text: 'Hi there!' }] },
                    ],
                })

                expect(result.enabled).toBe(true)
            })
        })
    })

    describe('createGeminiCache', () => {
        beforeEach(() => {
            vi.clearAllMocks()
        })

        afterEach(() => {
            vi.restoreAllMocks()
        })

        const baseConfig = {
            apiKey: 'test-api-key',
            modelId: 'gemini-2.5-flash',
            systemPrompt: 'You are a helpful assistant.',
            messagesToCache: [
                { role: 'user', parts: [{ text: 'Hello' }] },
                { role: 'model', parts: [{ text: 'Hi there!' }] },
            ],
            ttlSeconds: 30,
        }

        describe('success cases', () => {
            it('returns cache info on successful creation', async () => {
                mockGlobalFetch.mockResolvedValue({
                    ok: true,
                    data: {
                        name: 'cachedContents/abc123',
                        expireTime: '2026-01-28T12:00:00Z',
                        ttl: '30s',
                        usageMetadata: { totalTokenCount: 150 },
                    },
                })

                const result = await createGeminiCache(baseConfig)

                expect(result).toEqual({
                    success: true,
                    cacheName: 'cachedContents/abc123',
                    cachedTokenCount: 150,
                    expireTime: '2026-01-28T12:00:00Z',
                    ttl: '30s',
                })
            })

            it('handles missing usageMetadata gracefully', async () => {
                mockGlobalFetch.mockResolvedValue({
                    ok: true,
                    data: {
                        name: 'cachedContents/xyz789',
                        expireTime: '2026-01-28T12:00:00Z',
                        ttl: '30s',
                        // No usageMetadata
                    },
                })

                const result = await createGeminiCache(baseConfig)

                expect(result).toEqual({
                    success: true,
                    cacheName: 'cachedContents/xyz789',
                    cachedTokenCount: 0,
                    expireTime: '2026-01-28T12:00:00Z',
                    ttl: '30s',
                })
            })

            it('uses default TTL of 20 seconds when not specified', async () => {
                mockGlobalFetch.mockResolvedValue({
                    ok: true,
                    data: {
                        name: 'cachedContents/default-ttl',
                        ttl: '20s',
                    },
                })

                await createGeminiCache({
                    apiKey: 'test-key',
                    modelId: 'gemini-2.5-flash',
                    systemPrompt: 'Test prompt',
                    messagesToCache: [],
                    // No ttlSeconds specified
                })

                expect(mockGlobalFetch).toHaveBeenCalledWith(
                    'https://generativelanguage.googleapis.com/v1beta/cachedContents',
                    expect.objectContaining({
                        body: expect.objectContaining({
                            ttl: '20s',
                        }),
                    })
                )
            })
        })

        describe('model name handling', () => {
            it('prepends models/ prefix when not present', async () => {
                mockGlobalFetch.mockResolvedValue({
                    ok: true,
                    data: { name: 'cachedContents/model-prefix' },
                })

                await createGeminiCache({
                    ...baseConfig,
                    modelId: 'gemini-2.5-flash',
                })

                expect(mockGlobalFetch).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.objectContaining({
                        body: expect.objectContaining({
                            model: 'models/gemini-2.5-flash',
                        }),
                    })
                )
            })

            it('does not double-prefix when models/ already present', async () => {
                mockGlobalFetch.mockResolvedValue({
                    ok: true,
                    data: { name: 'cachedContents/already-prefixed' },
                })

                await createGeminiCache({
                    ...baseConfig,
                    modelId: 'models/gemini-2.5-flash',
                })

                expect(mockGlobalFetch).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.objectContaining({
                        body: expect.objectContaining({
                            model: 'models/gemini-2.5-flash',
                        }),
                    })
                )
            })
        })

        describe('system instruction handling', () => {
            it('includes systemInstruction when systemPrompt is provided', async () => {
                mockGlobalFetch.mockResolvedValue({
                    ok: true,
                    data: { name: 'cachedContents/sys-instruction' },
                })

                await createGeminiCache({
                    ...baseConfig,
                    systemPrompt: 'Custom system prompt',
                })

                expect(mockGlobalFetch).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.objectContaining({
                        body: expect.objectContaining({
                            systemInstruction: {
                                role: 'user',
                                parts: [{ text: 'Custom system prompt' }],
                            },
                        }),
                    })
                )
            })

            it('omits systemInstruction when systemPrompt is empty', async () => {
                mockGlobalFetch.mockResolvedValue({
                    ok: true,
                    data: { name: 'cachedContents/no-sys' },
                })

                await createGeminiCache({
                    ...baseConfig,
                    systemPrompt: '',
                })

                const callArgs = mockGlobalFetch.mock.calls[0][1]
                expect(callArgs.body.systemInstruction).toBeUndefined()
            })
        })

        describe('API key handling', () => {
            it('sends API key in x-goog-api-key header', async () => {
                mockGlobalFetch.mockResolvedValue({
                    ok: true,
                    data: { name: 'cachedContents/api-key-test' },
                })

                await createGeminiCache(baseConfig)

                expect(mockGlobalFetch).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.objectContaining({
                        headers: expect.objectContaining({
                            'x-goog-api-key': 'test-api-key',
                        }),
                    })
                )
            })
        })

        describe('error cases', () => {
            it('returns error when API returns not ok', async () => {
                mockGlobalFetch.mockResolvedValue({
                    ok: false,
                    data: { error: { message: 'Invalid API key' } },
                })

                const result = await createGeminiCache(baseConfig)

                expect(result.success).toBe(false)
                if (result.success === false) {
                    expect(result.error).toContain('Invalid API key')
                }
            })

            it('returns error when cache created but no name returned', async () => {
                mockGlobalFetch.mockResolvedValue({
                    ok: true,
                    data: {
                        // No name field
                        expireTime: '2026-01-28T12:00:00Z',
                    },
                })

                const result = await createGeminiCache(baseConfig)

                expect(result).toEqual({
                    success: false,
                    error: 'Cache created but no name returned',
                })
            })
        })
    })
})
