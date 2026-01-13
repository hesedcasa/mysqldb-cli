import { COMMANDS, COMMANDS_DETAIL, COMMANDS_INFO } from '../config/index.js';

/**
 * Prints all available MySQL commands with their descriptions
 */
export const printAvailableCommands = (): void => {
  console.log('\nAvailable SQL commands:');
  COMMANDS.forEach((name, i) => {
    const info = COMMANDS_INFO[i];
    console.log(`${i + 1}. ${name}: ${info}`);
  });
};

/**
 * Prints detailed information about a specific command
 * @param command - The command name to get details for
 */
export const printCommandDetail = (command: string): void => {
  const name = (command || '').trim();
  if (!name) {
    console.log('Please provide a command name.');
    printAvailableCommands();
    return;
  }

  const idx = COMMANDS.indexOf(name);
  if (idx === -1) {
    console.log(`Unknown command: ${name}`);
    printAvailableCommands();
    return;
  }

  const info = COMMANDS_INFO[idx] || 'No additional information available.';
  const detail = (COMMANDS_DETAIL[idx] || '').trim();

  console.log(`${name}\n${info}${detail ? `\n${detail}` : ''}`);
};

export const getCurrentVersion = (): string => {
  // If moved update release-please config
  // x-release-please-start-version
  const VERSION = '1.4.0';
  // x-release-please-end
  return VERSION;
};
