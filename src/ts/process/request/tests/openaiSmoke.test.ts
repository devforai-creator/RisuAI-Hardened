import { describe, expect, it, vi } from 'vitest';

vi.mock('src/ts/globalApi.svelte', () => ({
    globalFetch: vi.fn(async () => ({
        ok: true,
        data: {
            choices: [
                {
                    message: {
                        content: 'pong'
                    }
                }
            ]
        },
        headers: {},
        status: 200
    })),
    addFetchLog: vi.fn(),
    fetchNative: vi.fn(),
    textifyReadableStream: vi.fn()
}));

vi.mock('src/ts/tokenizer', () => ({
    strongBan: vi.fn(),
    tokenizeNum: vi.fn(() => 0)
}));

vi.mock('src/ts/util', () => ({
    simplifySchema: (schema: unknown) => schema
}));

vi.mock('src/ts/plugins/plugins.svelte', () => ({
    pluginV2: { providerOptions: new Map() },
    pluginProcess: vi.fn()
}));

vi.mock('src/ts/process/mcp/mcp', () => ({
    callTool: vi.fn(),
    decodeToolCall: vi.fn(),
    encodeToolCall: vi.fn()
}));

vi.mock('src/ts/process/files/inlays', () => ({
    supportsInlayImage: () => false
}));

vi.mock('src/ts/alert', () => ({
    alertError: vi.fn()
}));

vi.mock('src/ts/storage/database.svelte', () => {
    let db: any = {};
    return {
        getDatabase: () => db,
        setDatabase: (next: any) => {
            db = next;
        }
    };
});

vi.mock('src/ts/stores.svelte', () => ({
    DBState: { db: {} },
    selIdState: { selId: 0 },
    selectedCharID: {
        subscribe: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
    }
}));

import { requestHTTPOpenAI } from '../openAI';
import { setDatabase } from '../../../storage/database.svelte';
import { globalFetch } from '../../../globalApi.svelte';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

describe('OpenAI request smoke', () => {
    it('returns assistant content from LLM response', async () => {
        setDatabase({} as any);
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

        const fetchMock = globalFetch as unknown as ReturnType<typeof vi.fn>;
        expect(fetchMock).toHaveBeenCalled();
        expect(fetchMock.mock.calls[0][0]).toBe(OPENAI_URL);
    });
});
