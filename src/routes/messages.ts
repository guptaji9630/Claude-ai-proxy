import { Router, Request, Response, NextFunction } from 'express';
import { validateMessagesRequest, ClaudeMessagesRequest } from '../middleware/validation';
import { detectBackend } from '../translators/modelDetector';
import { translateClaudeToNIM } from '../translators/claudeToNim';
import { translateNIMToClaude } from '../translators/nimToClaude';
import { createClaudeClient, createNIMClient } from '../utils/apiClient';
import { ProxyError } from '../middleware/errorHandler';

const router = Router();

/**
 * POST /v1/messages
 * Main endpoint for Claude-format requests
 * Accepts either Claude or NIM model names and routes appropriately
 */
router.post(
  '/v1/messages',
  validateMessagesRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as ClaudeMessagesRequest;
      const backend = detectBackend(body.model);

      if (backend === 'claude') {
        // Route to Claude API
        await handleClaudeRequest(body, res);
      } else {
        // Route to NVIDIA NIM API
        await handleNIMRequest(body, res);
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Handle request going to Claude API
 */
async function handleClaudeRequest(
  claudeRequest: ClaudeMessagesRequest,
  res: Response
): Promise<void> {
  const client = createClaudeClient();

  // Pass through Claude request with minimal changes
  // Only need to handle the auth header, which the client does internally
  const response = await client.callClaude('/v1/messages', claudeRequest);

  res.status(200).json(response);
}

/**
 * Handle request going to NVIDIA NIM API
 */
async function handleNIMRequest(
  claudeRequest: ClaudeMessagesRequest,
  res: Response
): Promise<void> {
  const client = createNIMClient();

  // Translate Claude request to NIM format
  const nimRequest = translateClaudeToNIM(claudeRequest);

  // Check if streaming is requested
  if (claudeRequest.stream) {
    // Handle streaming response
    await handleNIMStream(client, nimRequest, res);
  } else {
    // Handle regular response
    const nimResponse = await client.callNIM('/v1/chat/completions', nimRequest);
    const claudeResponse = translateNIMToClaude(nimResponse as any);

    res.status(200).json(claudeResponse);
  }
}

/**
 * Handle streaming responses from NIM
 * Translates the NIM response into the Claude Server-Sent Events (SSE) format
 * that Claude Code CLI and the Anthropic SDK expect.
 *
 * Claude SSE event order:
 *   message_start → content_block_start → ping → content_block_delta(s)
 *   → content_block_stop → message_delta → message_stop
 */
async function handleNIMStream(
  client: any,
  nimRequest: any,
  res: Response
): Promise<void> {
  try {
    // Fetch the full NIM response (buffered); true NIM streaming can be
    // layered on top later without changing the SSE contract below.
    const nimClient = createNIMClient();
    const nimResponse = await nimClient.callNIM('/v1/chat/completions', {
      ...nimRequest,
      stream: false, // always buffer for now
    });

    const claudeResponse = translateNIMToClaude(nimResponse as any);

    // --- Set up SSE headers ---
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const writeEvent = (eventType: string, data: object) => {
      res.write(`event: ${eventType}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // 1. message_start
    writeEvent('message_start', {
      type: 'message_start',
      message: {
        id: claudeResponse.id,
        type: 'message',
        role: 'assistant',
        content: [],
        model: claudeResponse.model,
        stop_reason: null,
        stop_sequence: null,
        usage: {
          input_tokens: claudeResponse.usage.input_tokens,
          output_tokens: 0,
        },
      },
    });

    // 2. content_block_start
    writeEvent('content_block_start', {
      type: 'content_block_start',
      index: 0,
      content_block: { type: 'text', text: '' },
    });

    // 3. ping
    writeEvent('ping', { type: 'ping' });

    // 4. content_block_delta — send the full text as one delta
    const text = claudeResponse.content[0]?.text ?? '';
    writeEvent('content_block_delta', {
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'text_delta', text },
    });

    // 5. content_block_stop
    writeEvent('content_block_stop', {
      type: 'content_block_stop',
      index: 0,
    });

    // 6. message_delta (stop_reason + final usage)
    writeEvent('message_delta', {
      type: 'message_delta',
      delta: {
        stop_reason: claudeResponse.stop_reason,
        stop_sequence: null,
      },
      usage: { output_tokens: claudeResponse.usage.output_tokens },
    });

    // 7. message_stop
    writeEvent('message_stop', { type: 'message_stop' });

    res.end();
  } catch (error) {
    if (!res.headersSent) {
      throw error;
    }
    res.end();
  }
}

/**
 * GET /health
 * Health check endpoint for deployment
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /v1/models
 * Returns a simple list of supported models
 * (Optional - not required by Claude SDK)
 */
router.get('/v1/models', (req: Request, res: Response) => {
  res.status(200).json({
    object: 'list',
    data: [
      { id: 'claude-opus-4-7', owned_by: 'anthropic', type: 'claude' },
      { id: 'claude-opus-4-1', owned_by: 'anthropic', type: 'claude' },
      { id: 'claude-3-5-sonnet-20241022', owned_by: 'anthropic', type: 'claude' },
      { id: 'meta/llama-3.1-8b-instruct', owned_by: 'meta', type: 'nim' },
      { id: 'meta/llama-3.1-70b-instruct', owned_by: 'meta', type: 'nim' },
      { id: 'mistralai/mistral-7b-instruct', owned_by: 'mistralai', type: 'nim' },
    ],
  });
});

export default router;
