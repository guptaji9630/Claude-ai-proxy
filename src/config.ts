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
  const required = ['ANTHROPIC_API_KEY', 'NVIDIA_NIM_API_KEY'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      `Please check your .env file or set them in your deployment environment.`
    );
  }
}
