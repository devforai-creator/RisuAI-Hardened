import { globalFetch } from "src/ts/globalApi.svelte"

export type GeminiCachePart = { text?: string; [key: string]: unknown }
export type GeminiCacheMessage = { role: string; parts: GeminiCachePart[] }

export const DEFAULT_GEMINI_CACHE_TTL_SECONDS = 20

const MIN_TOKENS_FLASH = 1024
const MIN_TOKENS_PRO = 4096

export type GeminiCacheDecision = {
    enabled: boolean
    minTokens: number | null
    estimatedTokens: number
    reason?: "model" | "non_text" | "min_tokens"
}

export type GeminiCacheResult = {
    success: true
    cacheName: string
    cachedTokenCount: number
    expireTime?: string
    ttl?: string
} | {
    success: false
    error: string
    code?: string
}

export function getGeminiCacheMinTokens(modelId: string): number | null {
    const lower = modelId.toLowerCase()
    if (lower.includes("flash")) {
        return MIN_TOKENS_FLASH
    }
    if (lower.includes("pro")) {
        return MIN_TOKENS_PRO
    }
    return null
}

function estimateTokens(text: string): number {
    return Math.ceil(text.length / 3)
}

function isCacheablePart(part: GeminiCachePart): boolean {
    if (typeof part.text !== "string") {
        return false
    }
    const keys = Object.keys(part)
    return keys.length === 1 && keys[0] === "text"
}

function isCacheableMessages(messages: GeminiCacheMessage[]): boolean {
    return messages.every((msg) => {
        if (msg.role !== "user" && msg.role !== "model") {
            return false
        }
        if (!Array.isArray(msg.parts) || msg.parts.length === 0) {
            return false
        }
        return msg.parts.every(isCacheablePart)
    })
}

export function resolveGeminiCacheDecision(args: {
    modelId: string
    systemPrompt: string
    messagesToCache: GeminiCacheMessage[]
}): GeminiCacheDecision {
    const minTokens = getGeminiCacheMinTokens(args.modelId)
    if (minTokens === null) {
        return { enabled: false, minTokens, estimatedTokens: 0, reason: "model" }
    }

    if (!isCacheableMessages(args.messagesToCache)) {
        return { enabled: false, minTokens, estimatedTokens: 0, reason: "non_text" }
    }

    let estimatedTokens = estimateTokens(args.systemPrompt ?? "")
    for (const msg of args.messagesToCache) {
        for (const part of msg.parts) {
            estimatedTokens += estimateTokens(part.text ?? "")
        }
    }

    if (estimatedTokens < minTokens) {
        return { enabled: false, minTokens, estimatedTokens, reason: "min_tokens" }
    }

    return { enabled: true, minTokens, estimatedTokens }
}

export async function createGeminiCache(args: {
    apiKey: string
    modelId: string
    systemPrompt: string
    messagesToCache: GeminiCacheMessage[]
    ttlSeconds?: number
    chatId?: string
}): Promise<GeminiCacheResult> {
    const ttlSeconds =
        Number.isFinite(args.ttlSeconds) && (args.ttlSeconds as number) > 0
            ? Math.floor(args.ttlSeconds as number)
            : DEFAULT_GEMINI_CACHE_TTL_SECONDS

    const fullModelId = args.modelId.startsWith("models/") ? args.modelId : `models/${args.modelId}`

    const contents = args.messagesToCache.map((msg) => ({
        role: msg.role,
        parts: msg.parts.map((part) => ({ text: part.text ?? "" })),
    }))

    const body: Record<string, unknown> = {
        model: fullModelId,
        contents,
        ttl: `${ttlSeconds}s`,
    }

    if (args.systemPrompt) {
        body.systemInstruction = {
            role: "user",
            parts: [{ text: args.systemPrompt }],
        }
    }

    const res = await globalFetch("https://generativelanguage.googleapis.com/v1beta/cachedContents", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": args.apiKey,
        },
        body,
        chatId: args.chatId,
    })

    if (!res.ok) {
        const errorText = typeof res.data === "string" ? res.data : JSON.stringify(res.data)
        return { success: false, error: errorText }
    }

    const data = res.data as {
        name?: string
        ttl?: string
        expireTime?: string
        usageMetadata?: { totalTokenCount?: number }
        error?: { code?: string; message?: string }
    }

    if (!data?.name) {
        return { success: false, error: "Cache created but no name returned" }
    }

    return {
        success: true,
        cacheName: data.name,
        cachedTokenCount: data.usageMetadata?.totalTokenCount ?? 0,
        expireTime: data.expireTime,
        ttl: data.ttl,
    }
}
