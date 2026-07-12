import { stripJsonFences } from "./prompt";

/**
 * Shared helper for OpenAI-compatible chat completions (used by Groq + OpenRouter).
 * Avoids duplicating fetch + parse + error handling logic across two providers.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenAICompatOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  timeoutMs: number;
  extraHeaders?: Record<string, string>;
  temperature?: number;
}

/**
 * Calls an OpenAI-compatible chat completions endpoint and returns the parsed JSON content.
 * Throws on timeout, non-2xx response, or unparseable output.
 *
 * @param opts - Request configuration.
 * @returns The parsed JSON object from the assistant's response.
 */
export async function openaiCompatChat(opts: OpenAICompatOptions): Promise<unknown> {
  const {
    baseUrl,
    apiKey,
    model,
    messages,
    timeoutMs,
    extraHeaders = {},
    temperature = 0.2,
  } = opts;

  const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify({
        model,
        messages,
        response_format: { type: "json_object" },
        temperature,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Empty content in chat response");
    }

    const cleaned = stripJsonFences(content);
    return JSON.parse(cleaned);
  } finally {
    clearTimeout(timer);
  }
}
