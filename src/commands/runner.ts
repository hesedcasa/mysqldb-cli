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

/**
 * Execute a Jira API command in headless mode
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
      case 'list-projects':
        result = await listProjects(profile, format);
        break;

      case 'get-project':
        if (!args.projectIdOrKey) {
          console.error('ERROR: "projectIdOrKey" parameter is required');
          process.exit(1);
        }
        result = await getProject(profile, args.projectIdOrKey, format);
        break;

      case 'list-issues':
        result = await listIssues(profile, args.jql, args.maxResults, args.startAt, format);
        break;

      case 'get-issue':
        if (!args.issueIdOrKey) {
          console.error('ERROR: "issueIdOrKey" parameter is required');
          process.exit(1);
        }
        result = await getIssue(profile, args.issueIdOrKey, format);
        break;

      case 'create-issue':
        if (!args.fields) {
          console.error('ERROR: "fields" parameter is required');
          process.exit(1);
        }
        result = await createIssue(profile, args.fields, format);
        break;

      case 'update-issue':
        if (!args.issueIdOrKey || !args.fields) {
          console.error('ERROR: "issueIdOrKey" and "fields" parameters are required');
          process.exit(1);
        }
        result = await updateIssue(profile, args.issueIdOrKey, args.fields, format);
        break;

      case 'delete-issue':
        if (!args.issueIdOrKey) {
          console.error('ERROR: "issueIdOrKey" parameter is required');
          process.exit(1);
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
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }

    // Display result
    if (result.success) {
      console.log(result.result);
    } else {
      console.error(result.error);
      process.exit(1);
    }

    // Clear clients
    clearClients();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error executing command:', errorMessage);
    clearClients();
    process.exit(1);
  }
};
