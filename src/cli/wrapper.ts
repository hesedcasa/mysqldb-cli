import readline from 'readline';

import { getCurrentVersion, printAvailableCommands, printCommandDetail } from '../commands/index.js';
import { COMMANDS } from '../config/index.js';
import {
  clearClients,
  createIssue,
  deleteIssue,
  getIssue,
  getProject,
  getUser,
  listBoards,
  listIssues,
  listProjects,
  loadConfig,
  testConnection,
  updateIssue,
} from '../utils/index.js';
import type { Config } from '../utils/index.js';

/**
 * Main CLI class for Jira API interaction
 */
export class wrapper {
  private rl: readline.Interface;
  private config: Config | null = null;
  private currentProfile: string | null = null;
  private currentFormat: 'table' | 'json' | 'toon' = 'json';

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'jira> ',
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
      console.error('1. .claude/jira-connector.local.md exists');
      console.error('2. The file contains valid Jira profiles in YAML frontmatter');
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
      const newFormat = trimmed.substring(7).trim() as 'table' | 'json' | 'toon';
      if (['table', 'json', 'toon'].includes(newFormat)) {
        this.currentFormat = newFormat;
        console.log(`✓ Output format set to: ${newFormat}`);
      } else {
        console.error('ERROR: Invalid format. Choose: table, json, or toon');
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
    const firstSpaceIndex = trimmed.indexOf(' ');
    const command = firstSpaceIndex === -1 ? trimmed : trimmed.substring(0, firstSpaceIndex);
    const arg = firstSpaceIndex === -1 ? '' : trimmed.substring(firstSpaceIndex + 1).trim();

    if (arg === '-h') {
      printCommandDetail(command);
      this.rl.prompt();
      return;
    }

    await this.runCommand(command, arg);
  }

  /**
   * Runs a Jira API command
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
        case 'list-projects':
          result = await listProjects(profile, format);
          break;

        case 'get-project':
          if (!args.projectIdOrKey) {
            console.error('ERROR: "projectIdOrKey" parameter is required');
            this.rl.prompt();
            return;
          }
          result = await getProject(profile, args.projectIdOrKey, format);
          break;

        case 'list-issues':
          result = await listIssues(profile, args.jql, args.maxResults, args.startAt, format);
          break;

        case 'get-issue':
          if (!args.issueIdOrKey) {
            console.error('ERROR: "issueIdOrKey" parameter is required');
            this.rl.prompt();
            return;
          }
          result = await getIssue(profile, args.issueIdOrKey, format);
          break;

        case 'create-issue':
          if (!args.fields) {
            console.error('ERROR: "fields" parameter is required');
            this.rl.prompt();
            return;
          }
          result = await createIssue(profile, args.fields, format);
          break;

        case 'update-issue':
          if (!args.issueIdOrKey || !args.fields) {
            console.error('ERROR: "issueIdOrKey" and "fields" parameters are required');
            this.rl.prompt();
            return;
          }
          result = await updateIssue(profile, args.issueIdOrKey, args.fields, format);
          break;

        case 'delete-issue':
          if (!args.issueIdOrKey) {
            console.error('ERROR: "issueIdOrKey" parameter is required');
            this.rl.prompt();
            return;
          }
          result = await deleteIssue(profile, args.issueIdOrKey);
          break;

        case 'list-boards':
          result = await listBoards(profile, args.projectIdOrKey, args.type, format);
          break;

        case 'get-user':
          result = await getUser(profile, args.accountId, args.username, format);
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
Jira API CLI v${version}

Current Settings:
  Profile: ${currentProfile}
  Format:  ${currentFormat}

Usage:

commands              list all available Jira API commands
<command> -h          quick help on <command>
<command> <arg>       run <command> with JSON argument
profile <name>        switch to a different Jira profile
profiles              list all available profiles
format <type>         set output format (table, json, toon)
clear                 clear the screen
exit, quit, q         exit the CLI

All commands:

${commandList}

Examples:
  list-projects
  get-project {"projectIdOrKey":"PROJ"}
  list-issues {"jql":"project = PROJ AND status = Open","maxResults":10}
  get-issue {"issueIdOrKey":"PROJ-123"}
  create-issue {"fields":{"summary":"New task","project":{"key":"PROJ"},"issuetype":{"name":"Task"}}}
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
      clearClients();
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
   * Disconnects from Jira and closes the CLI
   */
  private async disconnect(): Promise<void> {
    console.log('\nClosing Jira connections...');
    clearClients();
    this.rl.close();
  }
}
