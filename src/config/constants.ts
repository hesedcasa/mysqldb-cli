/**
 * Jira API CLI Commands Configuration
 */

/**
 * Available Jira API commands
 */
export const COMMANDS: string[] = [
  'list-projects',
  'get-project',
  'list-issues',
  'get-issue',
  'create-issue',
  'update-issue',
  'delete-issue',
  'list-boards',
  'get-user',
  'test-connection',
];

/**
 * Brief descriptions for each command
 */
export const COMMANDS_INFO: string[] = [
  'List all accessible projects',
  'Get details of a specific project',
  'List issues using JQL query',
  'Get details of a specific issue',
  'Create a new issue',
  'Update an existing issue',
  'Delete an issue',
  'List agile boards',
  'Get user information',
  'Test Jira API connection',
];

/**
 * Detailed parameter information for each command
 */
export const COMMANDS_DETAIL: string[] = [
  `
Parameters:
- profile (optional): string - Jira profile name (default: configured default profile)
- format (optional): string - Output format: table, json, or toon (default: json)

Example:
list-projects '{"profile":"cloud","format":"json"}'`,
  `
Parameters:
- projectIdOrKey (required): string - Project ID or project key
- profile (optional): string - Jira profile name (default: configured default profile)
- format (optional): string - Output format: table, json, or toon (default: json)

Example:
get-project '{"projectIdOrKey":"PROJ","profile":"cloud","format":"json"}'`,
  `
Parameters:
- jql (optional): string - JQL query to filter issues (default: all issues)
- maxResults (optional): number - Maximum number of results (default: 50)
- startAt (optional): number - Starting index for pagination (default: 0)
- profile (optional): string - Jira profile name (default: configured default profile)
- format (optional): string - Output format: table, json, or toon (default: json)

Example:
list-issues '{"jql":"project = PROJ AND status = Open","maxResults":10,"profile":"cloud","format":"json"}'`,
  `
Parameters:
- issueIdOrKey (required): string - Issue ID or issue key
- profile (optional): string - Jira profile name (default: configured default profile)
- format (optional): string - Output format: table, json, or toon (default: json)

Example:
get-issue '{"issueIdOrKey":"PROJ-123","profile":"cloud","format":"json"}'`,
  `
Parameters:
- fields (required): object - Issue fields including summary, project, issuetype, etc.
- profile (optional): string - Jira profile name (default: configured default profile)
- format (optional): string - Output format: table, json, or toon (default: json)

Example:
create-issue '{"fields":{"summary":"New issue","project":{"key":"PROJ"},"issuetype":{"name":"Task"}},"profile":"cloud","format":"json"}'`,
  `
Parameters:
- issueIdOrKey (required): string - Issue ID or issue key to update
- fields (required): object - Issue fields to update
- profile (optional): string - Jira profile name (default: configured default profile)
- format (optional): string - Output format: table, json, or toon (default: json)

Example:
update-issue '{"issueIdOrKey":"PROJ-123","fields":{"summary":"Updated summary"},"profile":"cloud","format":"json"}'`,
  `
Parameters:
- issueIdOrKey (required): string - Issue ID or issue key to delete
- profile (optional): string - Jira profile name (default: configured default profile)

Example:
delete-issue '{"issueIdOrKey":"PROJ-123","profile":"cloud"}'`,
  `
Parameters:
- projectIdOrKey (optional): string - Filter boards by project
- type (optional): string - Board type (scrum, kanban, simple)
- profile (optional): string - Jira profile name (default: configured default profile)
- format (optional): string - Output format: table, json, or toon (default: json)

Example:
list-boards '{"projectIdOrKey":"PROJ","type":"scrum","profile":"cloud","format":"json"}'`,
  `
Parameters:
- accountId (optional): string - User account ID
- username (optional): string - Username (deprecated, use accountId)
- profile (optional): string - Jira profile name (default: configured default profile)
- format (optional): string - Output format: table, json, or toon (default: json)

Example:
get-user '{"accountId":"5b10a2844c20165700ede21g","profile":"cloud","format":"json"}'`,
  `
Parameters:
- profile (optional): string - Jira profile name (default: configured default profile)

Example:
test-connection '{"profile":"cloud"}'`,
];
