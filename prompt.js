#!/usr/bin/env node
// JSON Prompt Generator for Nano Banana 2
// Usage: node prompt.js "your plain English description"
// No LLMs, no API calls, no tokens.

const text = process.argv.slice(2).join(" ").trim();

if (!text) {
  console.error('Usage: node prompt.js "your prompt here"');
  console.error('Example: node prompt.js "a rainy Tokyo alley at night, neon reflections, 35mm film"');
  process.exit(1);
}

const { parsePrompt } = require("./parsePrompt");

const result = parsePrompt(text);
console.log(JSON.stringify(result, null, 2));
