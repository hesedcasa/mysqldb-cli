/**
 * MySQL CLI Commands Configuration
 */

/**
 * Available MySQL commands
 */
export const COMMANDS: string[] = [
  'query',
  'list-databases',
  'list-tables',
  'describe-table',
  'show-indexes',
  'explain-query',
  'test-connection',
];

/**
 * Brief descriptions for each command
 */
export const COMMANDS_INFO: string[] = [
  'Execute a SQL query',
  'List all databases',
  'List all tables in current database',
  'Describe table structure',
  'Show table indexes',
  'Explain query execution plan',
  'Test database connection',
];

/**
 * Detailed parameter information for each command
 */
export const COMMANDS_DETAIL: string[] = [
  `
Parameters:
- query (required): string - SQL query to execute
- profile (optional): string - Database profile name (default: configured default profile)
- format (optional): string - Output format: table, json, csv, or toon (default: table)

Example:
query '{"query":"SELECT * FROM users","profile":"local","format":"table"}'`,
  `
Parameters:
- profile (optional): string - Database profile name (default: configured default profile)

Example:
list-databases '{"profile":"local"}'`,
  `
Parameters:
- profile (optional): string - Database profile name (default: configured default profile)

Example:
list-tables '{"profile":"local"}'`,
  `
Parameters:
- table (required): string - Table name to describe
- profile (optional): string - Database profile name (default: configured default profile)

Example:
describe-table '{"table":"users","profile":"local"}'`,
  `
Parameters:
- table (required): string - Table name to show indexes for
- profile (optional): string - Database profile name (default: configured default profile)

Example:
show-indexes '{"table":"users","profile":"local"}'`,
  `
Parameters:
- query (required): string - SQL query to explain
- profile (optional): string - Database profile name (default: configured default profile)

Example:
explain-query '{"query":"SELECT * FROM users WHERE id = 1","profile":"local"}'`,
  `
Parameters:
- profile (optional): string - Database profile name (default: configured default profile)

Example:
test-connection '{"profile":"local"}'`,
];
