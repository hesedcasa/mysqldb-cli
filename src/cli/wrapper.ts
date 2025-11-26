import readline from 'readline';

import { getCurrentVersion, printAvailableCommands, printCommandDetail } from '../commands/index.js';
import { COMMANDS } from '../config/index.js';
import {
  closeConnections,
  describeTable,
  executeQuery,
  explainQuery,
  listDatabases,
  listTables,
  loadConfig,
  showIndexes,
  testConnection,
} from '../utils/index.js';
import type { Config } from '../utils/index.js';

/**
 * Main CLI class for MySQL database interaction
 */
export class wrapper {
  private rl: readline.Interface;
  private config: Config | null = null;
  private currentProfile: string | null = null;
  private currentFormat: 'table' | 'json' | 'csv' = 'table';

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'mysql> ',
    });
  }

  /**
   * Initialize the CLI and load configuration
   */
  async connect(): Promise<void> {
    try {
      const projectRoot = process.env.CLAUDE_PROJECT_ROOT || process.cwd();
      this.config = loadConfig(projectRoot);
      this.currentProfile = this.config.defaultProfile;
      this.currentFormat = this.config.defaultFormat;

      this.printHelp();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to load configuration:', errorMessage);
      console.error('\nMake sure:');
      console.error('1. .claude/mysql-connector.local.md exists');
      console.error('2. The file contains valid database profiles in YAML frontmatter');
      process.exit(1);
    }
  }

  /**
   * Handles user input commands
   * @param input - The raw user input string
   */
  private async handleCommand(input: string): Promise<void> {
    const trimmed = input.trim();

    if (!trimmed) {
      this.rl.prompt();
      return;
    }

    // Handle special commands
    if (trimmed === 'exit' || trimmed === 'quit' || trimmed === 'q') {
      await this.disconnect();
      return;
    }

    if (trimmed === 'help' || trimmed === '?') {
      this.printHelp();
      this.rl.prompt();
      return;
    }

    if (trimmed === 'commands') {
      printAvailableCommands();
      this.rl.prompt();
      return;
    }

    if (trimmed === 'clear') {
      console.clear();
      this.rl.prompt();
      return;
    }

    if (trimmed.startsWith('profile ')) {
      const newProfile = trimmed.substring(8).trim();
      if (this.config && this.config.profiles[newProfile]) {
        this.currentProfile = newProfile;
        console.log(`✓ Switched to profile: ${newProfile}`);
      } else {
        const available = this.config ? Object.keys(this.config.profiles).join(', ') : 'none';
        console.error(`ERROR: Profile "${newProfile}" not found. Available: ${available}`);
      }
      this.rl.prompt();
      return;
    }

    if (trimmed.startsWith('format ')) {
      const newFormat = trimmed.substring(7).trim() as 'table' | 'json' | 'csv';
      if (['table', 'json', 'csv'].includes(newFormat)) {
        this.currentFormat = newFormat;
        console.log(`✓ Output format set to: ${newFormat}`);
      } else {
        console.error('ERROR: Invalid format. Choose: table, json, or csv');
      }
      this.rl.prompt();
      return;
    }

    if (trimmed === 'profiles') {
      if (this.config) {
        console.log('\nAvailable profiles:');
        Object.keys(this.config.profiles).forEach((name, i) => {
          const current = name === this.currentProfile ? ' (current)' : '';
          console.log(`${i + 1}. ${name}${current}`);
        });
      }
      this.rl.prompt();
      return;
    }

    // Parse command invocation: command [args...]
    const parts = trimmed.split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    if (args[0] === '-h') {
      printCommandDetail(command);
      this.rl.prompt();
      return;
    }

    await this.runCommand(command, args[0]);
  }

  /**
   * Runs a MySQL command
   * @param command - The command name to execute
   * @param arg - JSON string or null for the command arguments
   */
  private async runCommand(command: string, arg: string): Promise<void> {
    if (!this.config || !this.currentProfile) {
      console.log('Configuration not loaded!');
      this.rl.prompt();
      return;
    }

    try {
      // Parse arguments
      const args = arg && arg.trim() !== '' ? JSON.parse(arg) : {};
      const profile = args.profile || this.currentProfile;
      const format = args.format || this.currentFormat;

      let result;

      switch (command) {
        case 'query':
          if (!args.query) {
            console.error('ERROR: "query" parameter is required');
            this.rl.prompt();
            return;
          }
          result = await executeQuery(args.query, profile, format);
          break;

        case 'list-databases':
          result = await listDatabases(profile);
          break;

        case 'list-tables':
          result = await listTables(profile);
          break;

        case 'describe-table':
          if (!args.table) {
            console.error('ERROR: "table" parameter is required');
            this.rl.prompt();
            return;
          }
          result = await describeTable(profile, args.table);
          break;

        case 'show-indexes':
          if (!args.table) {
            console.error('ERROR: "table" parameter is required');
            this.rl.prompt();
            return;
          }
          result = await showIndexes(profile, args.table);
          break;

        case 'explain-query':
          if (!args.query) {
            console.error('ERROR: "query" parameter is required');
            this.rl.prompt();
            return;
          }
          result = await explainQuery(profile, args.query);
          break;

        case 'test-connection':
          result = await testConnection(profile);
          break;

        default:
          console.error(`Unknown command: ${command}. Type "commands" to see available commands.`);
          this.rl.prompt();
          return;
      }

      // Display result
      if (result.success) {
        console.log('\n' + result.result);
      } else {
        console.error('\n' + result.error);
        if ('requiresConfirmation' in result && result.requiresConfirmation) {
          console.log('\nNote: This operation requires confirmation.');
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error running command:', errorMessage);
    }

    this.rl.prompt();
  }

  /**
   * Prints help message
   */
  private printHelp(): void {
    const version = getCurrentVersion();
    const currentProfile = this.currentProfile || 'none';
    const currentFormat = this.currentFormat;
    const commandList = COMMANDS.join(', ');

    console.log(`
MySQL CLI v${version}

Current Settings:
  Profile: ${currentProfile}
  Format:  ${currentFormat}

Usage:

commands              list all available MySQL commands
<command> -h          quick help on <command>
<command> <arg>       run <command> with JSON argument
profile <name>        switch to a different database profile
profiles              list all available profiles
format <type>         set output format (table, json, csv)
clear                 clear the screen
exit, quit, q         exit the CLI

All commands:

${commandList}

Examples:
  query '{"query":"SELECT * FROM users LIMIT 5"}'
  describe-table '{"table":"users"}'
  list-databases
  test-connection

`);
  }

  /**
   * Starts the interactive REPL loop
   */
  async start(): Promise<void> {
    this.rl.prompt();

    this.rl.on('line', async line => {
      await this.handleCommand(line);
    });

    this.rl.on('close', async () => {
      await closeConnections();
      process.exit(0);
    });

    const gracefulShutdown = async () => {
      try {
        await this.disconnect();
      } catch (error) {
        console.error('Error during shutdown:', error);
      } finally {
        process.exit(0);
      }
    };

    ['SIGINT', 'SIGTERM'].forEach(sig => {
      process.on(sig, () => {
        gracefulShutdown();
      });
    });
  }

  /**
   * Disconnects from the database and closes the CLI
   */
  private async disconnect(): Promise<void> {
    console.log('\nClosing database connections...');
    await closeConnections();
    this.rl.close();
  }
}
