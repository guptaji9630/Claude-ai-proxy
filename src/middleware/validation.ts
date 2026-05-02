import { Request, Response, NextFunction } from 'express';
import { ProxyError } from './errorHandler';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; [key: string]: unknown }>;
}

export interface ClaudeMessagesRequest {
  model: string;
  messages: ClaudeMessage[];
  max_tokens?: number;
  system?: string | Array<{ type: string; text?: string; [key: string]: unknown }>;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stream?: boolean;
  [key: string]: unknown;
}

/**
 * Validates incoming Claude API request format
 */
export function validateMessagesRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const body = req.body as unknown;

  if (!body || typeof body !== 'object') {
    throw new ProxyError(400, 'invalid_request_format', 'Request body must be a JSON object');
  }

  const request = body as Record<string, unknown>;

  // Validate required fields
  if (!request.model || typeof request.model !== 'string') {
    throw new ProxyError(
      400,
      'invalid_request_format',
      'Request must include a "model" field with a string value'
    );
  }

  if (!Array.isArray(request.messages)) {
    throw new ProxyError(
      400,
      'invalid_request_format',
      'Request must include a "messages" field with an array value'
    );
  }

  if (request.messages.length === 0) {
    throw new ProxyError(
      400,
      'invalid_request_format',
      'Request "messages" array must not be empty'
    );
  }

  // Validate message format
  for (let i = 0; i < request.messages.length; i++) {
    const msg = request.messages[i];
    if (!msg || typeof msg !== 'object') {
      throw new ProxyError(
        400,
        'invalid_request_format',
        `Message at index ${i} is not a valid object`
      );
    }

    const msgObj = msg as Record<string, unknown>;
    if (!msgObj.role || typeof msgObj.role !== 'string') {
      throw new ProxyError(
        400,
        'invalid_request_format',
        `Message at index ${i} must have a "role" field`
      );
    }

    if (msgObj.role !== 'user' && msgObj.role !== 'assistant') {
      throw new ProxyError(
        400,
        'invalid_request_format',
        `Message at index ${i} has invalid role "${msgObj.role}". Must be "user" or "assistant"`
      );
    }

    if (!msgObj.content) {
      throw new ProxyError(
        400,
        'invalid_request_format',
        `Message at index ${i} must have a "content" field`
      );
    }
  }

  // Validate optional numeric fields
  if (request.max_tokens !== undefined) {
    if (typeof request.max_tokens !== 'number' || request.max_tokens <= 0) {
      throw new ProxyError(
        400,
        'invalid_request_format',
        'Field "max_tokens" must be a positive number'
      );
    }
  }

  if (request.temperature !== undefined) {
    if (typeof request.temperature !== 'number' || request.temperature < 0 || request.temperature > 2) {
      throw new ProxyError(
        400,
        'invalid_request_format',
        'Field "temperature" must be a number between 0 and 2'
      );
    }
  }

  if (request.top_p !== undefined) {
    if (typeof request.top_p !== 'number' || request.top_p <= 0 || request.top_p > 1) {
      throw new ProxyError(
        400,
        'invalid_request_format',
        'Field "top_p" must be a number between 0 and 1'
      );
    }
  }

  next();
}
