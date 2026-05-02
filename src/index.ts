import express, { Express } from 'express';
import bodyParser from 'body-parser';
import { config, validateConfig } from './config';
import { loggingMiddleware } from './middleware/logging';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import messagesRouter from './routes/messages';

const app: Express = express();

// Validate configuration before starting
try {
  validateConfig();
} catch (error) {
  console.error('Configuration validation failed:', error);
  process.exit(1);
}

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(loggingMiddleware);

// Routes
app.use('/', messagesRouter);

// Error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = config.port;
const server = app.listen(PORT, () => {
  console.log(`Claude ↔ NVIDIA NIM Proxy Server`);
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Claude API: ${config.anthropic.baseUrl}`);
  console.log(`NIM API: ${config.nvidia.baseUrl}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default app;
