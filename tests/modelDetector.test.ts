import { detectBackend, validateModelName } from '../src/translators/modelDetector';

describe('Model Detector', () => {
  describe('detectBackend', () => {
    it('should detect Claude models', () => {
      expect(detectBackend('claude-opus-4-7')).toBe('claude');
      expect(detectBackend('claude-3-5-sonnet-20241022')).toBe('claude');
      expect(detectBackend('claude-3-haiku')).toBe('claude');
    });

    it('should detect NIM models', () => {
      expect(detectBackend('meta/llama-3.1-70b-instruct')).toBe('nim');
      expect(detectBackend('mistralai/mistral-7b-instruct')).toBe('nim');
      expect(detectBackend('google/gemma-7b')).toBe('nim');
      expect(detectBackend('qwen/qwen2.5-7b-instruct')).toBe('nim');
    });

    it('should default to NIM for empty or invalid input', () => {
      expect(detectBackend('')).toBe('nim');
      expect(detectBackend(null as any)).toBe('nim');
    });

    it('should be case-insensitive for Claude', () => {
      expect(detectBackend('CLAUDE-OPUS-4-7')).toBe('claude');
      expect(detectBackend('Claude-Opus-4-7')).toBe('claude');
    });
  });

  describe('validateModelName', () => {
    it('should validate Claude model names', () => {
      expect(validateModelName('claude-opus-4-7')).toBe(true);
      expect(validateModelName('claude-3.5-sonnet')).toBe(true);
      expect(validateModelName('claude-haiku-3')).toBe(true);
    });

    it('should validate NIM model names in vendor/model format', () => {
      expect(validateModelName('meta/llama-3.1-70b-instruct')).toBe(true);
      expect(validateModelName('mistralai/mistral-7b-instruct')).toBe(true);
      expect(validateModelName('google/gemma-7b')).toBe(true);
    });

    it('should reject invalid model names', () => {
      expect(validateModelName('')).toBe(false);
      expect(validateModelName('invalid')).toBe(false);
      expect(validateModelName('claude')).toBe(false);
      // Note: no-vendor/model is technically valid format, even if vendor is uncommon
      expect(validateModelName('/missing-vendor')).toBe(false);
      expect(validateModelName('vendor/')).toBe(false);
    });

    it('should handle null or undefined', () => {
      expect(validateModelName(null as any)).toBe(false);
      expect(validateModelName(undefined as any)).toBe(false);
    });
  });
});
