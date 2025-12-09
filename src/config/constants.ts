/**
 * Database CLI Commands Configuration
 * Supports MySQL and PostgreSQL databases
 */

/**
 * Available database commands
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
  'Execute a SQL query (MySQL/PostgreSQL)',
  'List all databases (MySQL/PostgreSQL)',
  'List all tables in current database/schema (MySQL/PostgreSQL)',
  'Describe table structure (MySQL/PostgreSQL)',
  'Show table indexes (MySQL/PostgreSQL)',
  'Explain query execution plan (MySQL/PostgreSQL)',
  'Test database connection (MySQL/PostgreSQL)',
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

Note: SQL syntax should match your database type (MySQL or PostgreSQL)

Example:
query '{"query":"SELECT * FROM users","profile":"local","format":"table"}'`,
  `
Parameters:
- profile (optional): string - Database profile name (default: configured default profile)

Note: Lists all databases accessible to the connection user
- MySQL: Uses SHOW DATABASES
- PostgreSQL: Queries pg_database

Example:
list-databases '{"profile":"local"}'`,
  `
Parameters:
- profile (optional): string - Database profile name (default: configured default profile)

Note: Lists tables in the current database
- MySQL: Uses SHOW TABLES in the configured database
- PostgreSQL: Lists tables in the configured schema (default: public)

Example:
list-tables '{"profile":"local"}'`,
  `
Parameters:
- table (required): string - Table name to describe
- profile (optional): string - Database profile name (default: configured default profile)
- format (optional): string - Output format: table, json, or toon (default: table)

Note: Shows column information for the specified table
- MySQL: Uses DESCRIBE
- PostgreSQL: Queries information_schema.columns

Example:
describe-table '{"table":"users","profile":"local","format":"json"}'`,
  `
Parameters:
- table (required): string - Table name to show indexes for
- profile (optional): string - Database profile name (default: configured default profile)
- format (optional): string - Output format: table, json, or toon (default: table)

Note: Shows index information for the specified table
- MySQL: Uses SHOW INDEXES FROM
- PostgreSQL: Queries pg_indexes

Example:
show-indexes '{"table":"users","profile":"local","format":"json"}'`,
  `
Parameters:
- query (required): string - SQL query to explain
- profile (optional): string - Database profile name (default: configured default profile)
- format (optional): string - Output format: table, json, or toon (default: table)

Note: Shows query execution plan
- MySQL: Uses EXPLAIN
- PostgreSQL: Uses EXPLAIN

Example:
explain-query '{"query":"SELECT * FROM users WHERE id = 1","profile":"local","format":"json"}'`,
  `
Parameters:
- profile (optional): string - Database profile name (default: configured default profile)

Note: Tests connection and shows database version
- MySQL: Shows MySQL version
- PostgreSQL: Shows PostgreSQL version

Example:
test-connection '{"profile":"local"}'`,
];
