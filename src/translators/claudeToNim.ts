import { ClaudeMessagesRequest } from '../middleware/validation';

export interface NIMRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  [key: string]: unknown;
}

/**
 * Translates a Claude-format request to NVIDIA NIM format
 * 
 * Key changes:
 * - System prompt: moves from top-level param to first message with role="system"
 * - Temperature default: Claude uses 1.0, NIM uses 0.2
 * - top_p default: Claude uses 1.0, NIM uses 0.7
 * - Content format: normalizes all content to string format
 */
export function translateClaudeToNIM(claudeRequest: ClaudeMessagesRequest): NIMRequest {
  const messages: NIMRequest['messages'] = [];

  // Add system message first if present
  if (claudeRequest.system) {
    let systemContent = '';
    
    if (typeof claudeRequest.system === 'string') {
      systemContent = claudeRequest.system;
    } else if (Array.isArray(claudeRequest.system)) {
      // System can be an array of content blocks in Claude
      systemContent = claudeRequest.system
        .map((block: any) => {
          if (typeof block === 'string') return block;
          if (block.type === 'text' && block.text) return block.text;
          return '';
        })
        .join('\n');
    }

    if (systemContent) {
      messages.push({
        role: 'system',
        content: systemContent,
      });
    }
  }

  // Add user/assistant messages
  for (const msg of claudeRequest.messages) {
    let content = '';

    if (typeof msg.content === 'string') {
      content = msg.content;
    } else if (Array.isArray(msg.content)) {
      // Handle content blocks
      content = msg.content
        .map((block: any) => {
          if (typeof block === 'string') return block;
          if (block.type === 'text' && block.text) return block.text;
          // Skip non-text content types for now (images, tools, etc.)
          return '';
        })
        .filter((c: string) => c.length > 0)
        .join('\n');
    }

    messages.push({
      role: msg.role,
      content,
    });
  }

  const nimRequest: NIMRequest = {
    model: claudeRequest.model,
    messages,
    stream: claudeRequest.stream ?? false,
  };

  // Set max_tokens if specified
  if (claudeRequest.max_tokens) {
    nimRequest.max_tokens = claudeRequest.max_tokens;
  }

  // Handle temperature with NIM defaults
  if (claudeRequest.temperature !== undefined) {
    nimRequest.temperature = claudeRequest.temperature;
  } else {
    // NIM default is 0.2 (more deterministic)
    nimRequest.temperature = 0.2;
  }

  // Handle top_p with NIM defaults
  if (claudeRequest.top_p !== undefined) {
    nimRequest.top_p = claudeRequest.top_p;
  } else {
    // NIM default is 0.7
    nimRequest.top_p = 0.7;
  }

  // Pass through other parameters if needed (stop_sequences, etc.)
  if (claudeRequest.stop_sequences) {
    nimRequest.stop = claudeRequest.stop_sequences;
  }

  return nimRequest;
}

/**
 * Validates a NIM request is properly formatted
 */
export function validateNIMRequest(request: NIMRequest): { valid: boolean; error?: string } {
  if (!request.model) {
    return { valid: false, error: 'model field is required' };
  }

  if (!Array.isArray(request.messages) || request.messages.length === 0) {
    return { valid: false, error: 'messages array must not be empty' };
  }

  for (let i = 0; i < request.messages.length; i++) {
    const msg = request.messages[i];
    if (!msg.role || !msg.content) {
      return { valid: false, error: `message at index ${i} missing role or content` };
    }
  }

  return { valid: true };
}
