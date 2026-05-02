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
 * Translates each chunk to Claude format
 */
async function handleNIMStream(
  client: any,
  nimRequest: any,
  res: Response
): Promise<void> {
  try {
    // Create a streaming request to NIM
    const nimClient = (createNIMClient() as any).client || createNIMClient();

    // We'll implement basic streaming support
    // For now, we'll buffer the response (can be improved with true streaming later)
    const response = await (nimClient as any).post('/v1/chat/completions', nimRequest, {
      headers: {
        'Authorization': `Bearer ${process.env.NVIDIA_NIM_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const claudeResponse = translateNIMToClaude(response.data as any);

    // For streaming, return each token as a separate event
    // This is a simplified implementation
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send the full response as a single stream event for now
    const streamEvent = {
      type: 'content_block_delta',
      index: 0,
      delta: {
        type: 'text_delta',
        text: claudeResponse.content[0].text,
      },
    };

    res.write(`data: ${JSON.stringify(streamEvent)}\n\n`);
    res.write('data: [DONE]\n\n');
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
