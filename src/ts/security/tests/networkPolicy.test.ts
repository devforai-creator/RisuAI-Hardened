import { describe, expect, it } from 'vitest';
import { buildNetworkPolicy, checkNetworkUrl } from '../networkPolicy';

describe('networkPolicy', () => {
    it('allows approved LLM hosts over https', () => {
        const policy = buildNetworkPolicy();
        const decision = checkNetworkUrl('https://api.openai.com/v1/chat/completions', policy);
        expect(decision.allowed).toBe(true);
    });

    it('blocks loopback by default', () => {
        const policy = buildNetworkPolicy();
        const decision = checkNetworkUrl('http://localhost:1234/api', policy);
        expect(decision.allowed).toBe(false);
        expect(decision.reason).toMatch(/loopback/i);
    });

    it('blocks unknown hosts', () => {
        const policy = buildNetworkPolicy();
        const decision = checkNetworkUrl('https://example.com/api', policy);
        expect(decision.allowed).toBe(false);
        expect(decision.reason).toMatch(/allowlist/i);
    });

    it('blocks insecure http for non-loopback hosts', () => {
        const policy = buildNetworkPolicy();
        const decision = checkNetworkUrl('http://api.openai.com/v1/chat/completions', policy);
        expect(decision.allowed).toBe(false);
        expect(decision.reason).toMatch(/insecure/i);
    });

    it('allows loopback when explicitly enabled', () => {
        const policy = buildNetworkPolicy([], true);
        const decision = checkNetworkUrl('http://127.0.0.1:8080/api', policy);
        expect(decision.allowed).toBe(true);
    });

    it('allows Tauri internal host asset.localhost', () => {
        const policy = buildNetworkPolicy();
        const decision = checkNetworkUrl('http://asset.localhost/path/to/image.png', policy);
        expect(decision.allowed).toBe(true);
    });

    it('allows Tauri internal host ipc.localhost', () => {
        const policy = buildNetworkPolicy();
        const decision = checkNetworkUrl('http://ipc.localhost/plugin:updater|check', policy);
        expect(decision.allowed).toBe(true);
    });

    it('allows Tauri internal host tauri.localhost', () => {
        const policy = buildNetworkPolicy();
        const decision = checkNetworkUrl('http://tauri.localhost/some/path', policy);
        expect(decision.allowed).toBe(true);
    });
});
