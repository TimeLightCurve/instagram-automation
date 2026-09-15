export type LocalAiProvider = 'ollama' | 'openai-compatible';

export type LocalAiSettings = {
  enabled: boolean;
  provider: LocalAiProvider;
  baseUrl: string;
  model: string;
};

export const defaultLocalAiSettings: LocalAiSettings = {
  enabled: false,
  provider: 'ollama',
  baseUrl: 'http://127.0.0.1:11434',
  model: '',
};
