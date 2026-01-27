import { checkNetworkUrl, type NetworkDecision, type NetworkPolicy } from './networkPolicy';

let fetchGuardInstalled = false;
let rawFetch: typeof fetch | null = null;

export function installFetchGuard(getPolicy: () => NetworkPolicy) {
    if (fetchGuardInstalled) {
        return;
    }
    if (!globalThis.fetch) {
        return;
    }
    rawFetch = globalThis.fetch.bind(globalThis);
    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
        const targetUrl = getRequestUrl(input);
        const decision = checkNetworkUrl(targetUrl, getPolicy());
        if (!decision.allowed) {
            return Promise.resolve(blockedFetchResponse(decision));
        }
        return rawFetch!(input as RequestInfo, init);
    };
    fetchGuardInstalled = true;
}

export function getRawFetch(): typeof fetch | null {
    return rawFetch;
}

function getRequestUrl(input: RequestInfo | URL): string | URL {
    if (typeof input === 'string') {
        return input;
    }
    if (input instanceof URL) {
        return input;
    }
    return input.url;
}

function blockedFetchResponse(decision: NetworkDecision): Response {
    const payload = {
        error: 'network_blocked',
        reason: decision.reason,
        url: decision.url?.toString() ?? null
    };
    return new Response(JSON.stringify(payload), {
        status: 451,
        statusText: 'Blocked by local-only network policy',
        headers: {
            'Content-Type': 'application/json'
        }
    });
}
