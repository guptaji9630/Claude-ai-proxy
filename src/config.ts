import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseUrl: process.env.CLAUDE_API_BASE_URL || 'https://api.anthropic.com',
    version: '2023-06-01',
  },
  nvidia: {
    apiKey: process.env.NVIDIA_NIM_API_KEY,
    baseUrl: process.env.NIM_API_BASE_URL || 'https://integrate.api.nvidia.com',
  },
};

// Validate required environment variables
export function validateConfig(): void {
  // NVIDIA_NIM_API_KEY is always required (NIM is the primary backend)
  if (!process.env.NVIDIA_NIM_API_KEY) {
    throw new Error(
      'Missing required environment variable: NVIDIA_NIM_API_KEY. ' +
      'Please check your .env file or set it in your deployment environment.'
    );
  }

  // ANTHROPIC_API_KEY is only needed when routing requests to the real Claude API
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn(
      'Warning: ANTHROPIC_API_KEY is not set. ' +
      'Requests routed to Claude models will fail. ' +
      'This is fine if you only intend to use NVIDIA NIM models.'
    );
  }
}
