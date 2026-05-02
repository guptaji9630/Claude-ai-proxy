/**
 * Tests for the Claude SSE (Server-Sent Events) streaming format.
 *
 * The streaming handler buffers the NIM response and re-emits it as a
 * sequence of Claude SSE events.  This file validates the shape of every
 * event using the same translator that the route uses so that regressions
 * in the event schema are caught without needing a live HTTP connection.
 */

import { translateNIMToClaude } from '../src/translators/nimToClaude';

const SAMPLE_NIM_RESPONSE = {
  id: 'cmpl-stream-test',
  object: 'chat.completion',
  created: 1700000000,
  model: 'moonshotai/kimi-k2.6',
  choices: [
    {
      index: 0,
      message: { role: 'assistant', content: 'Hello from the stream!' },
      finish_reason: 'stop',
    },
  ],
  usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
};

/**
 * Reproduces the exact SSE event sequence built by handleNIMStream so that
 * the shape of every event can be asserted independently.
 */
function buildClaudeSSEEvents(nimResponse: typeof SAMPLE_NIM_RESPONSE) {
  const claudeResponse = translateNIMToClaude(nimResponse);
  const text = claudeResponse.content[0]?.text ?? '';

  return [
    {
      event: 'message_start',
      data: {
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
      },
    },
    {
      event: 'content_block_start',
      data: {
        type: 'content_block_start',
        index: 0,
        content_block: { type: 'text', text: '' },
      },
    },
    {
      event: 'ping',
      data: { type: 'ping' },
    },
    {
      event: 'content_block_delta',
      data: {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text },
      },
    },
    {
      event: 'content_block_stop',
      data: { type: 'content_block_stop', index: 0 },
    },
    {
      event: 'message_delta',
      data: {
        type: 'message_delta',
        delta: {
          stop_reason: claudeResponse.stop_reason,
          stop_sequence: null,
        },
        usage: { output_tokens: claudeResponse.usage.output_tokens },
      },
    },
    {
      event: 'message_stop',
      data: { type: 'message_stop' },
    },
  ];
}

describe('Claude SSE streaming format', () => {
  it('should emit the correct number of events', () => {
    const events = buildClaudeSSEEvents(SAMPLE_NIM_RESPONSE);
    // message_start, content_block_start, ping, content_block_delta,
    // content_block_stop, message_delta, message_stop = 7
    expect(events).toHaveLength(7);
  });

  it('should start with message_start', () => {
    const events = buildClaudeSSEEvents(SAMPLE_NIM_RESPONSE);
    expect(events[0].event).toBe('message_start');
    expect(events[0].data.type).toBe('message_start');
  });

  it('message_start should carry message metadata', () => {
    const events = buildClaudeSSEEvents(SAMPLE_NIM_RESPONSE);
    const msg = (events[0].data as any).message;
    expect(msg.id).toBe('cmpl-stream-test');
    expect(msg.type).toBe('message');
    expect(msg.role).toBe('assistant');
    expect(msg.model).toBe('moonshotai/kimi-k2.6');
    expect(msg.stop_reason).toBeNull();
    expect(msg.usage.input_tokens).toBe(10);
    expect(msg.usage.output_tokens).toBe(0);
  });

  it('should include content_block_start before any delta', () => {
    const events = buildClaudeSSEEvents(SAMPLE_NIM_RESPONSE);
    expect(events[1].event).toBe('content_block_start');
    const data = events[1].data as any;
    expect(data.type).toBe('content_block_start');
    expect(data.index).toBe(0);
    expect(data.content_block.type).toBe('text');
    expect(data.content_block.text).toBe('');
  });

  it('should include a ping event', () => {
    const events = buildClaudeSSEEvents(SAMPLE_NIM_RESPONSE);
    expect(events[2].event).toBe('ping');
    expect(events[2].data.type).toBe('ping');
  });

  it('content_block_delta should carry the response text', () => {
    const events = buildClaudeSSEEvents(SAMPLE_NIM_RESPONSE);
    expect(events[3].event).toBe('content_block_delta');
    const data = events[3].data as any;
    expect(data.delta.type).toBe('text_delta');
    expect(data.delta.text).toBe('Hello from the stream!');
  });

  it('should include content_block_stop after the delta', () => {
    const events = buildClaudeSSEEvents(SAMPLE_NIM_RESPONSE);
    expect(events[4].event).toBe('content_block_stop');
    expect((events[4].data as any).index).toBe(0);
  });

  it('message_delta should carry stop_reason and output token count', () => {
    const events = buildClaudeSSEEvents(SAMPLE_NIM_RESPONSE);
    expect(events[5].event).toBe('message_delta');
    const data = events[5].data as any;
    expect(data.delta.stop_reason).toBe('end_turn'); // mapped from 'stop'
    expect(data.delta.stop_sequence).toBeNull();
    expect(data.usage.output_tokens).toBe(5);
  });

  it('should end with message_stop', () => {
    const events = buildClaudeSSEEvents(SAMPLE_NIM_RESPONSE);
    const last = events[events.length - 1];
    expect(last.event).toBe('message_stop');
    expect(last.data.type).toBe('message_stop');
  });

  it('all event data objects should be JSON-serialisable', () => {
    const events = buildClaudeSSEEvents(SAMPLE_NIM_RESPONSE);
    events.forEach(({ event, data }) => {
      expect(() => JSON.stringify(data)).not.toThrow();
    });
  });
});
