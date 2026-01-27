import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { requestHTTPOpenAI } from '../openAI';
import { setDatabase } from '../../../storage/database.svelte';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

function makeOpenAIResponse(content: string) {
    return new Response(JSON.stringify({
        choices: [
            {
                message: {
                    content
                }
            }
        ]
    }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json'
        }
    });
}

describe('OpenAI request smoke', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        setDatabase({} as any);
        globalThis.fetch = vi.fn(async () => makeOpenAIResponse('pong')) as typeof fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('returns assistant content from LLM response', async () => {
        const response = await requestHTTPOpenAI(
            OPENAI_URL,
            {
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: 'ping' }]
            },
            { Authorization: 'Bearer test-key' },
            {
                modelInfo: { flags: [] },
                extractJson: false
            } as any
        );

        expect(response.type).toBe('success');
        if (response.type === 'success') {
            expect(response.result).toBe('pong');
        }

        const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
        expect(fetchMock).toHaveBeenCalled();
        const [calledUrl, init] = fetchMock.mock.calls[0];
        expect(String(calledUrl)).toMatch(/\/proxy2$/);
        const headers = (init as RequestInit).headers as Record<string, string>;
        expect(decodeURIComponent(headers['risu-url'])).toBe(OPENAI_URL);
    });
});
