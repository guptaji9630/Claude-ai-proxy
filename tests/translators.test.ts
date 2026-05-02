import { translateClaudeToNIM, validateNIMRequest } from '../src/translators/claudeToNim';
import { translateNIMToClaude, validateNIMResponse } from '../src/translators/nimToClaude';
import { ClaudeMessagesRequest } from '../src/middleware/validation';

describe('Translators', () => {
  describe('Claude to NIM Translation', () => {
    it('should translate basic Claude request to NIM format', () => {
      const claudeRequest: ClaudeMessagesRequest = {
        model: 'meta/llama-3.1-70b-instruct',
        messages: [
          { role: 'user', content: 'Hello, how are you?' },
        ],
        max_tokens: 1024,
      };

      const nimRequest = translateClaudeToNIM(claudeRequest);

      expect(nimRequest.model).toBe('meta/llama-3.1-70b-instruct');
      expect(nimRequest.messages).toHaveLength(1);
      expect(nimRequest.messages[0]).toEqual({
        role: 'user',
        content: 'Hello, how are you?',
      });
      expect(nimRequest.max_tokens).toBe(1024);
      expect(nimRequest.temperature).toBe(0.2); // NIM default
      expect(nimRequest.top_p).toBe(0.7); // NIM default
    });

    it('should preserve explicit temperature and top_p values', () => {
      const claudeRequest: ClaudeMessagesRequest = {
        model: 'meta/llama-3.1-70b-instruct',
        messages: [{ role: 'user', content: 'test' }],
        temperature: 0.5,
        top_p: 0.9,
      };

      const nimRequest = translateClaudeToNIM(claudeRequest);

      expect(nimRequest.temperature).toBe(0.5);
      expect(nimRequest.top_p).toBe(0.9);
    });

    it('should convert Claude system prompt to NIM format', () => {
      const claudeRequest: ClaudeMessagesRequest = {
        model: 'meta/llama-3.1-70b-instruct',
        system: 'You are a helpful assistant.',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const nimRequest = translateClaudeToNIM(claudeRequest);

      expect(nimRequest.messages).toHaveLength(2);
      expect(nimRequest.messages[0]).toEqual({
        role: 'system',
        content: 'You are a helpful assistant.',
      });
      expect(nimRequest.messages[1]).toEqual({
        role: 'user',
        content: 'Hello',
      });
    });

    it('should handle streaming parameter', () => {
      const claudeRequest: ClaudeMessagesRequest = {
        model: 'meta/llama-3.1-70b-instruct',
        messages: [{ role: 'user', content: 'test' }],
        stream: true,
      };

      const nimRequest = translateClaudeToNIM(claudeRequest);

      expect(nimRequest.stream).toBe(true);
    });

    it('should validate NIM request structure', () => {
      const claudeRequest: ClaudeMessagesRequest = {
        model: 'meta/llama-3.1-70b-instruct',
        messages: [{ role: 'user', content: 'test' }],
      };

      const nimRequest = translateClaudeToNIM(claudeRequest);
      const validation = validateNIMRequest(nimRequest);

      expect(validation.valid).toBe(true);
    });
  });

  describe('NIM to Claude Response Translation', () => {
    it('should translate basic NIM response to Claude format', () => {
      const nimResponse = {
        id: 'cmpl-abc123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'meta/llama-3.1-70b-instruct',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello! I am doing well, thank you for asking.',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 15,
          completion_tokens: 20,
          total_tokens: 35,
        },
      };

      const claudeResponse = translateNIMToClaude(nimResponse);

      expect(claudeResponse.type).toBe('message');
      expect(claudeResponse.role).toBe('assistant');
      expect(claudeResponse.model).toBe('meta/llama-3.1-70b-instruct');
      expect(claudeResponse.content).toHaveLength(1);
      expect(claudeResponse.content[0].type).toBe('text');
      expect(claudeResponse.content[0].text).toBe(
        'Hello! I am doing well, thank you for asking.'
      );
      expect(claudeResponse.stop_reason).toBe('end_turn');
      expect(claudeResponse.usage.input_tokens).toBe(15);
      expect(claudeResponse.usage.output_tokens).toBe(20);
    });

    it('should map finish_reason to stop_reason', () => {
      const nimResponse = {
        id: 'cmpl-abc123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'meta/llama-3.1-70b-instruct',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'test' },
            finish_reason: 'length',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      };

      const claudeResponse = translateNIMToClaude(nimResponse);

      expect(claudeResponse.stop_reason).toBe('max_tokens');
    });

    it('should validate NIM response structure', () => {
      const validResponse = {
        id: 'test',
        object: 'chat.completion',
        created: 1234567890,
        model: 'test',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'test' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      };

      const validation = validateNIMResponse(validResponse);
      expect(validation.valid).toBe(true);
    });

    it('should reject invalid NIM response', () => {
      const invalidResponse = { choices: [] };

      const validation = validateNIMResponse(invalidResponse);
      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
    });
  });

  describe('Round-trip translation', () => {
    it('should handle Claude -> NIM -> Claude conversion', () => {
      const originalClaudeRequest: ClaudeMessagesRequest = {
        model: 'meta/llama-3.1-70b-instruct',
        system: 'You are helpful.',
        messages: [
          { role: 'user', content: 'What is 2+2?' },
          { role: 'assistant', content: '2+2 equals 4.' },
          { role: 'user', content: 'Thanks!' },
        ],
        temperature: 0.7,
        max_tokens: 500,
      };

      // Translate to NIM
      const nimRequest = translateClaudeToNIM(originalClaudeRequest);

      // Verify structure
      expect(nimRequest.messages).toHaveLength(4); // system + 3 messages
      expect(nimRequest.messages[0].role).toBe('system');
      expect(nimRequest.temperature).toBe(0.7); // Preserved explicit value

      // Simulate NIM response
      const nimResponse = {
        id: 'cmpl-xyz',
        object: 'chat.completion',
        created: 1234567890,
        model: 'meta/llama-3.1-70b-instruct',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'You are welcome!' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 50, completion_tokens: 10, total_tokens: 60 },
      };

      // Translate back to Claude
      const claudeResponse = translateNIMToClaude(nimResponse);

      // Verify Claude format
      expect(claudeResponse.type).toBe('message');
      expect(claudeResponse.content[0].type).toBe('text');
      expect(claudeResponse.content[0].text).toBe('You are welcome!');
      expect(claudeResponse.stop_reason).toBe('end_turn');
    });
  });
});
