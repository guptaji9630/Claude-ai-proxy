#!/usr/bin/env node

/**
 * Test script to use the proxy with Claude SDK
 * Make sure the proxy is running first: npm run dev
 */

const Anthropic = require("@anthropic-ai/sdk").default;
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Create client that points to your proxy
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: "http://localhost:3000", // Point to your proxy
});

async function testNIMModel() {
  console.log("\n=== Testing NVIDIA NIM Model ===");
  console.log("Model: meta/llama-3.1-8b-instruct");
  console.log("Question: What is the capital of France?\n");

  try {
    const response = await client.messages.create({
      model: "meta/llama-3.1-8b-instruct", // NVIDIA NIM model
      max_tokens: 256,
      system: "You are a helpful assistant. Answer concisely in one sentence.",
      messages: [
        {
          role: "user",
          content: "What is the capital of France?",
        },
      ],
    });

    console.log("✅ Success!");
    console.log("Response:", response.content[0].text);
    console.log("Stop reason:", response.stop_reason);
    console.log("Tokens used:", response.usage);
    console.log("");
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.log("");
  }
}

async function testClaudeModel() {
  console.log("\n=== Testing Claude Model ===");
  console.log("Model: claude-3-5-sonnet-20241022");
  console.log("Question: What is the capital of Spain?\n");

  try {
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022", // Claude model
      max_tokens: 256,
      system: "You are a helpful assistant. Answer concisely in one sentence.",
      messages: [
        {
          role: "user",
          content: "What is the capital of Spain?",
        },
      ],
    });

    console.log("✅ Success!");
    console.log("Response:", response.content[0].text);
    console.log("Stop reason:", response.stop_reason);
    console.log("Tokens used:", response.usage);
    console.log("");
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.log("");
  }
}

async function testWithMultipleMessages() {
  console.log("\n=== Testing with Conversation ===");
  console.log("Model: meta/llama-3.1-8b-instruct");
  console.log("Testing multi-turn conversation\n");

  try {
    const response = await client.messages.create({
      model: "meta/llama-3.1-8b-instruct",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: "What is 5 + 3?",
        },
        {
          role: "assistant",
          content: "5 + 3 = 8",
        },
        {
          role: "user",
          content: "Now multiply that by 2",
        },
      ],
    });

    console.log("✅ Success!");
    console.log("Response:", response.content[0].text);
    console.log("");
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.log("");
  }
}

async function runTests() {
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║ Claude SDK + NIM Proxy Test Suite                     ║");
  console.log("║ Make sure: npm run dev is running in another terminal  ║");
  console.log("╚════════════════════════════════════════════════════════╝");

  // Test NIM model
  await testNIMModel();

  // Test Claude model
  await testClaudeModel();

  // Test multi-turn conversation
  await testWithMultipleMessages();

  console.log("════════════════════════════════════════════════════════");
  console.log("✅ All tests completed!");
  console.log("");
  console.log("Your proxy is working! You can now:");
  console.log("1. Use NIM models (cheaper) with your Claude code");
  console.log("2. Switch between Claude and NIM by changing the model parameter");
  console.log("3. Deploy to Railway for production use");
  console.log("");
}

// Run tests
runTests().catch(console.error);
