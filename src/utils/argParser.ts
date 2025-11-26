import { getCurrentVersion, printAvailableCommands, printCommandDetail, runCommand } from '../commands/index.js';
import { COMMANDS } from '../config/index.js';

/**
 * Result of parsing command line arguments
 */
export interface ParseResult {
  shouldExit: boolean;
  configPath?: string;
}

/**
 * Parses and handles command line arguments
 * @param args - Command line arguments (process.argv.slice(2))
 * @returns ParseResult with shouldExit flag and optional configPath
 */
export const parseArguments = async (args: string[]): Promise<ParseResult> => {
  let configPath: string | undefined;
  for (let i = 0; i < args.length; i++) {
    // Config file flag
    if (args[i] === '--config' || args[i] === '-c') {
      if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        configPath = args[i + 1];
        i++; // Skip next arg as it's the config path
      } else {
        console.error('ERROR: --config/-c flag requires a file path argument');
        process.exit(1);
      }
      continue;
    }

    // Version flag
    if (args[i] === '--version' || args[i] === '-v') {
      console.log(getCurrentVersion());
      process.exit(0);
    }

    // List commands flag
    if (args[i] === '--commands') {
      printAvailableCommands();
      process.exit(0);
    }

    // Command-specific help
    if (i === 0 && args.length >= 2 && args[1] === '-h') {
      printCommandDetail(args[0]);
      process.exit(0);
    }

    // General help flag
    if (args[i] === '--help' || args[i] === '-h') {
      printGeneralHelp();
      process.exit(0);
    }

    // Execute command in headless mode
    if (i === 0 && args.length >= 1 && args[1] !== '-h' && COMMANDS.includes(args[0])) {
      const rest = args.slice(1);
      const params = (rest.find(a => !a.startsWith('-') && a !== configPath) ?? null) as string | null;
      const flag = (rest.find(a => a.startsWith('-') && a !== '--config' && a !== '-c') ?? null) as string | null;

      await runCommand(args[0], params, flag, configPath);
      process.exit(0);
    }
  }

  return { shouldExit: false, configPath };
};

/**
 * Prints general help message for the CLI
 */
const printGeneralHelp = (): void => {
  console.log(`
MySQL CLI

Usage:

npx mysqldb-cli                             start interactive CLI
npx mysqldb-cli --config <path>             use custom config file
npx mysqldb-cli --commands                  list all available commands
npx mysqldb-cli <command> -h                quick help on <command>
npx mysqldb-cli <command> <arg>             run command in headless mode

All commands:

${COMMANDS.join(', ')}

Flags:
  --config, -c <path>   Path to config file (default: .claude/mysql-connector.local.md)
  --version, -v         Show version number
  --help, -h            Show this help message
  --commands            List all available commands

Examples:
  npx mysqldb-cli --config /path/to/config.md
  npx mysqldb-cli -c ~/my-db-config.md query '{"query":"SELECT * FROM users LIMIT 5"}'
  npx mysqldb-cli describe-table '{"table":"users","profile":"local"}'
  npx mysqldb-cli list-databases '{"profile":"local"}'
  npx mysqldb-cli test-connection

Interactive mode special commands:
  profile <name>   - Switch database profile
  profiles         - List all available profiles
  format <type>    - Set output format (table, json, csv)
  clear            - Clear the screen
  exit, quit, q    - Exit the CLI

Configuration:
  Create .claude/mysql-connector.local.md with your database profiles in YAML frontmatter.
  Or use --config/-c to specify a custom config file path.

`);
};
