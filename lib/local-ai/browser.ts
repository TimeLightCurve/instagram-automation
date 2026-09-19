import type { LocalAiSettings } from './types';

function endpoint(settings: LocalAiSettings, path: string) {
  const base = new URL(settings.baseUrl.trim());
  if (!['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)) {
    throw new Error('Local AI must use localhost or 127.0.0.1.');
  }
  if (!['http:', 'https:'].includes(base.protocol))
    throw new Error('Local AI needs an HTTP URL.');
  if (base.username || base.password || base.search || base.hash)
    throw new Error('Use a plain local server URL.');
  const prefix = settings.provider === 'ollama' ? '/api' : '/v1';
  const current = base.pathname.replace(/\/$/, '');
  base.pathname = `${current.endsWith(prefix) ? current : `${current}${prefix}`}/${path}`;
  return base.toString();
}

async function request(url: string, token: string, init?: RequestInit) {
  let response: Response;
  try {
    const headers = new Headers(init?.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    response = await fetch(url, {
      ...init,
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(120_000),
    });
  } catch {
    throw new Error(
      'Browser could not reach local AI. Check the port, LM Studio CORS setting, and that the server is running.',
    );
  }
  const body = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok) {
    const nested =
      body.error && typeof body.error === 'object'
        ? (body.error as { message?: unknown }).message
        : body.error;
    throw new Error(
      typeof nested === 'string'
        ? nested
        : `Local AI returned HTTP ${response.status}.`,
    );
  }
  return body;
}

export async function localAiModels(settings: LocalAiSettings, token: string) {
  const result = await request(
    endpoint(settings, settings.provider === 'ollama' ? 'tags' : 'models'),
    token,
  );
  const entries = settings.provider === 'ollama' ? result.models : result.data;
  const names = Array.isArray(entries)
    ? entries
        .map(
          (item) =>
            (item as { name?: string; id?: string })[
              settings.provider === 'ollama' ? 'name' : 'id'
            ],
        )
        .filter((value): value is string => typeof value === 'string')
    : [];
  if (!names.length)
    throw new Error(
      'Local AI returned no available models. Load Qwen in LM Studio first.',
    );
  if (settings.model && !names.includes(settings.model))
    throw new Error(`Model ${settings.model} is not loaded.`);
  return { model: settings.model || names[0], models: names };
}

export async function generateLocalCaption(
  settings: LocalAiSettings,
  token: string,
  prompt: string,
) {
  const { model } = await localAiModels(settings, token);
  const body =
    settings.provider === 'ollama'
      ? { model, prompt, stream: false }
      : {
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 500,
        };
  const result = await request(
    endpoint(
      settings,
      settings.provider === 'ollama' ? 'generate' : 'chat/completions',
    ),
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  const choices = Array.isArray(result.choices) ? result.choices : [];
  const text =
    settings.provider === 'ollama'
      ? result.response
      : (choices[0] as { message?: { content?: string } } | undefined)?.message
          ?.content;
  if (typeof text !== 'string' || !text.trim())
    throw new Error('The local model returned no caption.');
  return { text: text.trim(), model };
}
