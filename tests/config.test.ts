import { validateConfig } from '../src/config';

describe('validateConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should pass when both keys are set', () => {
    process.env.NVIDIA_NIM_API_KEY = 'nvapi-test';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    expect(() => validateConfig()).not.toThrow();
  });

  it('should pass when only NVIDIA_NIM_API_KEY is set (NIM-only usage)', () => {
    process.env.NVIDIA_NIM_API_KEY = 'nvapi-test';
    delete process.env.ANTHROPIC_API_KEY;
    // Should not throw – ANTHROPIC_API_KEY is optional
    expect(() => validateConfig()).not.toThrow();
  });

  it('should throw when NVIDIA_NIM_API_KEY is missing', () => {
    delete process.env.NVIDIA_NIM_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    expect(() => validateConfig()).toThrow('NVIDIA_NIM_API_KEY');
  });

  it('should throw when both keys are missing', () => {
    delete process.env.NVIDIA_NIM_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    expect(() => validateConfig()).toThrow('NVIDIA_NIM_API_KEY');
  });
});
