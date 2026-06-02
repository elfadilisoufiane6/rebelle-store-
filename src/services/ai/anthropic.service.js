// Anthropic Claude API client.
//
// Two entry points:
//   - chat({ question, context })  → full text response (synchronous)
//   - streamChat({ question, context, onDelta, onDone, onError })
//                                  → token-by-token via SSE upstream
//
// Streaming is used by the admin dashboard so the assistant feels
// responsive even on long answers. Falls back to chat() when the
// caller doesn't pass deltas.

const fetch = require('node-fetch');
const { env } = require('../../config/env');
const log = require('../../utils/logger');
const { SYSTEM_PROMPT } = require('./prompts/system');

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

function getKey() {
  return env.ANTHROPIC_API_KEY || env.AI_API_KEY || '';
}

function isConfigured() {
  return !!getKey();
}

function buildUserMessage(question, context) {
  let block = `Question: ${question}\n\n`;
  if (context) {
    block += `Données dashboard (JSON):\n\`\`\`json\n${JSON.stringify(
      context,
      null,
      2
    )}\n\`\`\``;
  }
  return block;
}

async function chat({ question, context }) {
  if (!isConfigured()) {
    return { ok: false, error: 'ANTHROPIC_API_KEY not set' };
  }
  const model = env.AI_MODEL || DEFAULT_MODEL;
  try {
    const res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'x-api-key': getKey(),
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: buildUserMessage(question, context) },
        ],
      }),
      timeout: 30_000,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: json?.error?.message || `Anthropic HTTP ${res.status}`,
      };
    }
    const text = (json.content || [])
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('\n')
      .trim();
    return { ok: true, text, model, provider: 'anthropic' };
  } catch (err) {
    log.error('Anthropic chat failed', err.message);
    return { ok: false, error: err.message };
  }
}

// Stream Anthropic SSE upstream and call onDelta(textChunk) for each
// content_block_delta event. Caller controls how to surface deltas
// (forward as its own SSE to the browser, log, etc.).
async function streamChat({ question, context, onDelta, onDone, onError }) {
  if (!isConfigured()) {
    onError && onError(new Error('ANTHROPIC_API_KEY not set'));
    return;
  }
  const model = env.AI_MODEL || DEFAULT_MODEL;
  try {
    const res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'x-api-key': getKey(),
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        model,
        max_tokens: 800,
        stream: true,
        system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: buildUserMessage(question, context) },
        ],
      }),
      timeout: 30_000,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      onError && onError(new Error(`Anthropic HTTP ${res.status}: ${body.slice(0, 200)}`));
      return;
    }

    // node-fetch v2 gives a Node Readable stream
    const decoder = new TextDecoder();
    let buffer = '';
    res.body.on('data', (chunk) => {
      buffer += decoder.decode(chunk, { stream: true });
      let idx;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const event = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const dataLine = event
          .split('\n')
          .find((l) => l.startsWith('data: '));
        if (!dataLine) continue;
        const payload = dataLine.slice(6).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const json = JSON.parse(payload);
          if (
            json.type === 'content_block_delta' &&
            json.delta?.type === 'text_delta'
          ) {
            onDelta && onDelta(json.delta.text);
          }
        } catch {
          // skip malformed
        }
      }
    });
    res.body.on('end', () => {
      onDone && onDone();
    });
    res.body.on('error', (err) => {
      onError && onError(err);
    });
  } catch (err) {
    log.error('Anthropic stream failed', err.message);
    onError && onError(err);
  }
}

module.exports = { chat, streamChat, isConfigured };
