/**
 * Direct database query execution
 */
import { loadConfig } from './config-loader.js';
import { MySQLUtil } from './mysql-utils.js';
import type {
  ConnectionTestResult,
  DatabaseListResult,
  ExplainResult,
  IndexResult,
  QueryResult,
  TableListResult,
  TableStructureResult,
} from './mysql-utils.js';

const projectRoot = process.env.CLAUDE_PROJECT_ROOT || process.cwd();

let dbUtil: MySQLUtil | null = null;

/**
 * Initialize database utility
 */
async function initDB(): Promise<MySQLUtil> {
  if (dbUtil) return dbUtil;

  try {
    const config = loadConfig(projectRoot);
    dbUtil = new MySQLUtil(config);
    return dbUtil;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to initialize database: ${errorMessage}`);
  }
}

/**
 * Execute SQL query
 * @param query - SQL query to execute
 * @param profile - Database profile name
 * @param format - Output format (table, json, csv, toon)
 */
export async function executeQuery(
  query: string,
  profile: string,
  format: 'table' | 'json' | 'csv' | 'toon' = 'table'
): Promise<QueryResult> {
  const db = await initDB();
  return await db.executeQuery(profile, query, format);
}

/**
 * List all databases
 * @param profile - Database profile name
 */
export async function listDatabases(profile: string): Promise<DatabaseListResult> {
  const db = await initDB();
  return await db.listDatabases(profile);
}

/**
 * List all tables in current database
 * @param profile - Database profile name
 */
export async function listTables(profile: string): Promise<TableListResult> {
  const db = await initDB();
  return await db.listTables(profile);
}

/**
 * Describe table structure
 * @param profile - Database profile name
 * @param table - Table name
 */
export async function describeTable(profile: string, table: string): Promise<TableStructureResult> {
  const db = await initDB();
  return await db.describeTable(profile, table);
}

/**
 * Show table indexes
 * @param profile - Database profile name
 * @param table - Table name
 */
export async function showIndexes(profile: string, table: string): Promise<IndexResult> {
  const db = await initDB();
  return await db.showIndexes(profile, table);
}

/**
 * Explain query execution plan
 * @param profile - Database profile name
 * @param query - SQL query to explain
 */
export async function explainQuery(profile: string, query: string): Promise<ExplainResult> {
  const db = await initDB();
  return await db.explainQuery(profile, query);
}

/**
 * Test database connection
 * @param profile - Database profile name
 */
export async function testConnection(profile: string): Promise<ConnectionTestResult> {
  const db = await initDB();
  return await db.testConnection(profile);
}

/**
 * Close all database connections
 */
export async function closeConnections(): Promise<void> {
  if (dbUtil) {
    await dbUtil.closeAll();
    dbUtil = null;
  }
}
