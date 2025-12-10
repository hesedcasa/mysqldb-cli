/**
 * Database abstraction interface
 * Defines the contract for database utility implementations (MySQL, PostgreSQL)
 */

/**
 * Query execution result for SELECT/SHOW/DESCRIBE/EXPLAIN queries
 */
export interface QueryResult {
  success: boolean;
  result?: string;
  error?: string;
  requiresConfirmation?: boolean;
  message?: string;
}

/**
 * Database list result
 */
export interface DatabaseListResult {
  success: boolean;
  databases?: string[];
  result?: string;
  error?: string;
}

/**
 * Table list result
 */
export interface TableListResult {
  success: boolean;
  tables?: string[];
  result?: string;
  error?: string;
}

/**
 * Table structure result
 */
export interface TableStructureResult {
  success: boolean;
  structure?: Record<string, unknown>[];
  result?: string;
  error?: string;
}

/**
 * Index information result
 */
export interface IndexResult {
  success: boolean;
  indexes?: Record<string, unknown>[];
  result?: string;
  error?: string;
}

/**
 * Query plan result
 */
export interface ExplainResult {
  success: boolean;
  plan?: Record<string, unknown>[];
  result?: string;
  error?: string;
}

/**
 * Connection test result
 */
export interface ConnectionTestResult {
  success: boolean;
  version?: string;
  database?: string;
  result?: string;
  error?: string;
}

/**
 * Output format type
 */
export type OutputFormat = 'table' | 'json' | 'csv' | 'toon';

/**
 * Database utility interface
 * All database implementations must implement this interface
 */
export interface DatabaseUtil {
  /**
   * Execute SQL query
   * @param profileName - Profile name to use
   * @param query - SQL query to execute
   * @param format - Output format
   */
  executeQuery(profileName: string, query: string, format?: OutputFormat): Promise<QueryResult>;

  /**
   * List all databases
   * @param profileName - Profile name to use
   */
  listDatabases(profileName: string): Promise<DatabaseListResult>;

  /**
   * List all tables in current database
   * @param profileName - Profile name to use
   */
  listTables(profileName: string): Promise<TableListResult>;

  /**
   * Describe table structure
   * @param profileName - Profile name to use
   * @param table - Table name
   * @param format - Output format
   */
  describeTable(profileName: string, table: string, format?: OutputFormat): Promise<TableStructureResult>;

  /**
   * Show table indexes
   * @param profileName - Profile name to use
   * @param table - Table name
   * @param format - Output format
   */
  showIndexes(profileName: string, table: string, format?: OutputFormat): Promise<IndexResult>;

  /**
   * Explain query execution plan
   * @param profileName - Profile name to use
   * @param query - Query to explain
   * @param format - Output format
   */
  explainQuery(profileName: string, query: string, format?: OutputFormat): Promise<ExplainResult>;

  /**
   * Test database connection
   * @param profileName - Profile name to use
   */
  testConnection(profileName: string): Promise<ConnectionTestResult>;

  /**
   * Close all connections
   */
  closeAll(): Promise<void>;
}
