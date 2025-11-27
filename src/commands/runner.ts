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

/**
 * Execute a MySQL command in headless mode
 * @param command - The command name to execute
 * @param arg - JSON string or null for the command arguments
 */
export const runCommand = async (
  command: string,
  arg: string | null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _flag: string | null
): Promise<void> => {
  try {
    // Load config to get default profile
    const projectRoot = process.env.CLAUDE_PROJECT_ROOT || process.cwd();
    const config = loadConfig(projectRoot);

    // Parse arguments
    const args = arg && arg.trim() !== '' ? JSON.parse(arg) : {};
    const profile = args.profile || config.defaultProfile;
    const format = args.format || config.defaultFormat;

    let result;

    switch (command) {
      case 'query':
        if (!args.query) {
          console.error('ERROR: "query" parameter is required');
          process.exit(1);
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
          process.exit(1);
        }
        result = await describeTable(profile, args.table, format);
        break;

      case 'show-indexes':
        if (!args.table) {
          console.error('ERROR: "table" parameter is required');
          process.exit(1);
        }
        result = await showIndexes(profile, args.table, format);
        break;

      case 'explain-query':
        if (!args.query) {
          console.error('ERROR: "query" parameter is required');
          process.exit(1);
        }
        result = await explainQuery(profile, args.query, format);
        break;

      case 'test-connection':
        result = await testConnection(profile);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }

    // Display result
    if (result.success) {
      console.log(result.result);
    } else {
      console.error(result.error);
      if ('requiresConfirmation' in result && result.requiresConfirmation) {
        console.error('\nTo execute destructive operations, use the interactive CLI mode.');
      }
      process.exit(1);
    }

    // Close all connections
    await closeConnections();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error executing command:', errorMessage);
    await closeConnections();
    process.exit(1);
  }
};
