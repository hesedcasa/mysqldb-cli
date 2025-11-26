#!/usr/bin/env node

import { wrapper } from './cli/index.js';
import { parseArguments } from './utils/index.js';

/**
 * Main entry point for the MySQL CLI
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const shouldContinue = await parseArguments(args);

  if (shouldContinue) {
    return;
  }

  // Start interactive CLI mode
  const cli = new wrapper();
  await cli.connect();
  await cli.start();
}

// Run the CLI
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
