import type { LocalAiProvider } from '@/lib/local-ai/types';
import { getCurrentInstagramAccountId } from '@/lib/server/current-account';
import { recordJobSafe } from '@/lib/server/records';

type LocalAiRequest = {
  action?: 'test' | 'generate';
  provider?: LocalAiProvider;
  baseUrl?: string;
  model?: string;
  prompt?: string;
};

const allowedHosts = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  'host.docker.internal',
]);

function getLocalBaseUrl(value: string | undefined) {
  const url = new URL(value?.trim() || 'http://127.0.0.1:11434');
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('The local AI URL must use HTTP or HTTPS.');
  }
  if (!allowedHosts.has(url.hostname)) {
    throw new Error(
      'For safety, the local AI server must run on this machine.',
    );
  }
  url.pathname = url.pathname.replace(/\/$/, '');
  url.search = '';
  url.hash = '';
  return url;
}

function localEndpoint(baseUrl: URL, provider: LocalAiProvider, path: string) {
  const basePath = baseUrl.pathname.replace(/\/$/, '');
  const prefix = provider === 'ollama' ? '/api' : '/v1';
  baseUrl.pathname = `${basePath.endsWith(prefix) ? basePath : `${basePath}${prefix}`}/${path}`;
  return baseUrl.toString();
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
    signal: AbortSignal.timeout(120_000),
  });
  const data = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok) {
    const message =
      typeof data.error === 'string'
        ? data.error
        : `Local AI returned HTTP ${response.status}.`;
    throw new Error(message);
  }
  return data;
}

async function listModels(provider: LocalAiProvider, baseUrl: URL) {
  const path = provider === 'ollama' ? 'tags' : 'models';
  const data = await fetchJson(localEndpoint(new URL(baseUrl), provider, path));

  if (provider === 'ollama') {
    const models = Array.isArray(data.models) ? data.models : [];
    return models.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const name = (item as { name?: unknown }).name;
      return typeof name === 'string' ? [name] : [];
    });
  }

  const models = Array.isArray(data.data) ? data.data : [];
  return models.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const id = (item as { id?: unknown }).id;
    return typeof id === 'string' ? [id] : [];
  });
}

export async function POST(request: Request) {
  const startedAt = new Date();
  try {
    const body = (await request.json()) as LocalAiRequest;
    const action = body.action === 'generate' ? 'generate' : 'test';
    const provider: LocalAiProvider =
      body.provider === 'openai-compatible' ? 'openai-compatible' : 'ollama';
    const baseUrl = getLocalBaseUrl(body.baseUrl);
    const models = await listModels(provider, baseUrl);
    const requestedModel = body.model?.trim() || '';
    const resolvedModel = requestedModel || models[0];

    if (!resolvedModel) {
      return Response.json(
        {
          error:
            'The local server is reachable, but it did not report any installed models.',
        },
        { status: 422 },
      );
    }

    if (requestedModel && !models.includes(requestedModel)) {
      return Response.json(
        {
          error: `Model “${requestedModel}” was not reported by the local server.`,
          models,
        },
        { status: 422 },
      );
    }

    if (action === 'test') {
      await recordJobSafe({
        accountId: await getCurrentInstagramAccountId(),
        kind: 'local-ai.test',
        status: 'completed',
        summary: `Connected to local model ${resolvedModel}.`,
        metadata: { provider, model: resolvedModel },
        startedAt,
      });
      return Response.json({
        status: 'connected',
        model: resolvedModel,
        models,
      });
    }

    const prompt = body.prompt?.trim().slice(0, 12_000) || '';
    if (!prompt)
      return Response.json({ error: 'A prompt is required.' }, { status: 400 });

    if (provider === 'ollama') {
      const data = await fetchJson(
        localEndpoint(new URL(baseUrl), provider, 'generate'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: resolvedModel, prompt, stream: false }),
        },
      );
      const text =
        typeof data.response === 'string' ? data.response.trim() : '';
      if (!text) throw new Error('The local model returned an empty response.');
      await recordJobSafe({
        accountId: await getCurrentInstagramAccountId(),
        kind: 'local-ai.generate',
        status: 'completed',
        summary: `Generated content with local model ${resolvedModel}.`,
        metadata: { provider, model: resolvedModel },
        startedAt,
      });
      return Response.json({ text, model: resolvedModel });
    }

    const data = await fetchJson(
      localEndpoint(new URL(baseUrl), provider, 'chat/completions'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: resolvedModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        }),
      },
    );
    const choices = Array.isArray(data.choices) ? data.choices : [];
    const first = choices[0] as { message?: { content?: unknown } } | undefined;
    const text =
      typeof first?.message?.content === 'string'
        ? first.message.content.trim()
        : '';
    if (!text) throw new Error('The local model returned an empty response.');
    await recordJobSafe({
      accountId: await getCurrentInstagramAccountId(),
      kind: 'local-ai.generate',
      status: 'completed',
      summary: `Generated content with local model ${resolvedModel}.`,
      metadata: { provider, model: resolvedModel },
      startedAt,
    });
    return Response.json({ text, model: resolvedModel });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to reach the local AI server.';
    await recordJobSafe({
      accountId: await getCurrentInstagramAccountId(),
      kind: 'local-ai.request',
      status: 'failed',
      summary: message.includes('fetch failed')
        ? 'Could not connect to the local AI server.'
        : message,
      startedAt,
    });
    return Response.json(
      {
        error: message.includes('fetch failed')
          ? 'Could not connect to the local AI server.'
          : message,
      },
      { status: 502 },
    );
  }
}
