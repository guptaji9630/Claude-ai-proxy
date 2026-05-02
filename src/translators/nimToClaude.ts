/**
 * NVIDIA NIM API response format (OpenAI-compatible)
 */
export interface NIMResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Claude API response format
 */
export interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  model: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Translates NVIDIA NIM response back to Claude format
 * 
 * Key changes:
 * - choices[0].message.content → content[0].text
 * - finish_reason → stop_reason (with mapping: "stop" → "end_turn")
 * - completion_tokens → output_tokens
 * - prompt_tokens → input_tokens
 */
export function translateNIMToClaude(nimResponse: NIMResponse): ClaudeResponse {
  const choice = nimResponse.choices[0];

  // Map NIM stop reasons to Claude stop reasons
  const stopReasonMap: Record<string, string> = {
    'stop': 'end_turn',
    'length': 'max_tokens',
    'content_filter': 'stop_sequence',
  };

  const stopReason = stopReasonMap[choice.finish_reason] || choice.finish_reason;

  return {
    id: nimResponse.id,
    type: 'message',
    role: 'assistant',
    model: nimResponse.model,
    content: [
      {
        type: 'text',
        text: choice.message.content,
      },
    ],
    stop_reason: stopReason,
    usage: {
      input_tokens: nimResponse.usage.prompt_tokens,
      output_tokens: nimResponse.usage.completion_tokens,
    },
  };
}

/**
 * Validates NIM response structure
 */
export function validateNIMResponse(response: unknown): { valid: boolean; error?: string } {
  if (!response || typeof response !== 'object') {
    return { valid: false, error: 'response must be an object' };
  }

  const resp = response as Record<string, unknown>;

  if (!Array.isArray(resp.choices) || resp.choices.length === 0) {
    return { valid: false, error: 'response must have choices array' };
  }

  const choice = (resp.choices as any[])[0];
  if (!choice.message || typeof choice.message.content !== 'string') {
    return { valid: false, error: 'choice must have message with string content' };
  }

  if (!resp.usage || typeof resp.usage !== 'object') {
    return { valid: false, error: 'response must have usage object' };
  }

  return { valid: true };
}
