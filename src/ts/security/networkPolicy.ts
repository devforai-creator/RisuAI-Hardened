import type { Database } from '../storage/database.svelte';

export type NetworkPolicy = {
    allowlist: string[];
    allowLoopback: boolean;
}

export type NetworkDecision = {
    allowed: boolean;
    reason: string;
    url: URL | null;
    host: string | null;
}

const INTERNAL_HOSTS = new Set([
    'asset.localhost',
    'tauri.localhost'
]);

export const DEFAULT_LLM_ALLOWLIST = [
    'api.openai.com',
    'openrouter.ai',
    'api.anthropic.com',
    'api.mistral.ai',
    'api.deepinfra.com',
    'api.deepseek.com',
    'api.cohere.com',
    'api.novelai.net',
    'text.novelai.net',
    'stablehorde.net',
    'api.tringpt.com',
    'generativelanguage.googleapis.com',
    'oauth2.googleapis.com',
    '*.aiplatform.googleapis.com',
    'bedrock-runtime.*.amazonaws.com'
];

export function policyFromDatabase(db?: Database): NetworkPolicy {
    return buildNetworkPolicy(db?.networkAllowlist, db?.networkAllowLoopback);
}

export function buildNetworkPolicy(allowlist?: string[], allowLoopback?: boolean): NetworkPolicy {
    const merged = [...DEFAULT_LLM_ALLOWLIST, ...(allowlist ?? [])];
    return {
        allowlist: normalizeAllowlist(merged),
        allowLoopback: allowLoopback ?? false
    };
}

function normalizeAllowlist(entries: string[]): string[] {
    const out = new Set<string>();
    for (const entry of entries) {
        const normalized = normalizeHostEntry(entry);
        if (normalized) {
            out.add(normalized);
        }
    }
    return Array.from(out);
}

function normalizeHostEntry(entry: string): string | null {
    if (!entry) {
        return null;
    }
    const trimmed = entry.trim().toLowerCase();
    if (!trimmed) {
        return null;
    }
    if (trimmed.includes('://')) {
        try {
            return new URL(trimmed).hostname.toLowerCase();
        } catch {
            return null;
        }
    }
    const slashIndex = trimmed.indexOf('/');
    if (slashIndex !== -1) {
        return trimmed.slice(0, slashIndex);
    }
    return trimmed;
}

export function checkNetworkUrl(input: string | URL, policy: NetworkPolicy): NetworkDecision {
    let url: URL;
    try {
        const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
        url = input instanceof URL ? input : new URL(input, base);
    } catch {
        return {
            allowed: false,
            reason: 'Blocked by local-only network policy: invalid URL.',
            url: null,
            host: null
        };
    }

    const protocol = url.protocol.toLowerCase();
    if (protocol === 'data:' || protocol === 'blob:' || protocol === 'file:' || protocol === 'asset:' || protocol === 'tauri:' || protocol === 'ipc:') {
        return allowDecision(url);
    }

    if (protocol !== 'http:' && protocol !== 'https:' && protocol !== 'ws:' && protocol !== 'wss:') {
        return blockDecision(url, `Blocked by local-only network policy: protocol not allowed (${protocol}).`);
    }

    if (typeof window !== 'undefined' && url.origin === window.location.origin) {
        return allowDecision(url);
    }

    const hostname = url.hostname.toLowerCase();
    if (INTERNAL_HOSTS.has(hostname)) {
        return allowDecision(url);
    }

    if (isLoopbackHost(hostname)) {
        if (!policy.allowLoopback) {
            return blockDecision(url, 'Blocked by local-only network policy: loopback endpoints are disabled.');
        }
        return allowDecision(url);
    }

    if (protocol === 'http:' || protocol === 'ws:') {
        return blockDecision(url, 'Blocked by local-only network policy: insecure protocol.');
    }

    if (!matchesAllowlist(hostname, policy.allowlist)) {
        return blockDecision(url, `Blocked by local-only network policy: ${hostname} is not in the allowlist.`);
    }

    return allowDecision(url);
}

function allowDecision(url: URL): NetworkDecision {
    return {
        allowed: true,
        reason: '',
        url,
        host: url.hostname
    };
}

function blockDecision(url: URL, reason: string): NetworkDecision {
    return {
        allowed: false,
        reason,
        url,
        host: url.hostname
    };
}

function isLoopbackHost(hostname: string): boolean {
    if (hostname === 'localhost' || hostname === '::1' || hostname === '[::1]') {
        return true;
    }
    if (hostname.startsWith('127.')) {
        return true;
    }
    if (hostname === '0.0.0.0') {
        return true;
    }
    return false;
}

function matchesAllowlist(hostname: string, allowlist: string[]): boolean {
    if (!allowlist || allowlist.length === 0) {
        return false;
    }
    const normalized = hostname.toLowerCase();
    return allowlist.some((pattern) => matchesHostPattern(normalized, pattern));
}

function matchesHostPattern(hostname: string, pattern: string): boolean {
    const normalized = pattern.toLowerCase();
    if (normalized === hostname) {
        return true;
    }
    if (!normalized.includes('*')) {
        return false;
    }
    const escaped = normalized
        .replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&')
        .replace(/\*/g, '.*');
    const re = new RegExp(`^${escaped}$`, 'i');
    return re.test(hostname);
}
