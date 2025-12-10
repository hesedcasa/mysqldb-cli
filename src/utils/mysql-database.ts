/**
 * Direct database query execution
 * Supports both MySQL and PostgreSQL databases based on profile configuration
 */
import { loadConfig } from './config-loader.js';
import type { Config } from './config-loader.js';
import type { DatabaseFactory } from './database-factory.js';
import { createDatabaseFactory } from './database-factory.js';
import type {
  ConnectionTestResult,
  DatabaseListResult,
  ExplainResult,
  IndexResult,
  QueryResult,
  TableListResult,
  TableStructureResult,
} from './database.js';

const projectRoot = process.env.CLAUDE_PROJECT_ROOT || process.cwd();

let dbFactory: DatabaseFactory | null = null;
let cachedConfig: Config | null = null;

/**
 * Initialize database factory
 */
function initDB(): DatabaseFactory {
  if (dbFactory) return dbFactory;

  try {
    cachedConfig = loadConfig(projectRoot);
    dbFactory = createDatabaseFactory(cachedConfig);
    return dbFactory;
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
  const factory = initDB();
  const db = factory.getUtilForProfile(profile);
  return await db.executeQuery(profile, query, format);
}

/**
 * List all databases
 * @param profile - Database profile name
 */
export async function listDatabases(profile: string): Promise<DatabaseListResult> {
  const factory = initDB();
  const db = factory.getUtilForProfile(profile);
  return await db.listDatabases(profile);
}

/**
 * List all tables in current database
 * @param profile - Database profile name
 */
export async function listTables(profile: string): Promise<TableListResult> {
  const factory = initDB();
  const db = factory.getUtilForProfile(profile);
  return await db.listTables(profile);
}

/**
 * Describe table structure
 * @param profile - Database profile name
 * @param table - Table name
 * @param format - Output format (table, json, toon)
 */
export async function describeTable(
  profile: string,
  table: string,
  format: 'table' | 'json' | 'toon' = 'table'
): Promise<TableStructureResult> {
  const factory = initDB();
  const db = factory.getUtilForProfile(profile);
  return await db.describeTable(profile, table, format);
}

/**
 * Show table indexes
 * @param profile - Database profile name
 * @param table - Table name
 * @param format - Output format (table, json, toon)
 */
export async function showIndexes(
  profile: string,
  table: string,
  format: 'table' | 'json' | 'toon' = 'table'
): Promise<IndexResult> {
  const factory = initDB();
  const db = factory.getUtilForProfile(profile);
  return await db.showIndexes(profile, table, format);
}

/**
 * Explain query execution plan
 * @param profile - Database profile name
 * @param query - SQL query to explain
 * @param format - Output format (table, json, toon)
 */
export async function explainQuery(
  profile: string,
  query: string,
  format: 'table' | 'json' | 'toon' = 'table'
): Promise<ExplainResult> {
  const factory = initDB();
  const db = factory.getUtilForProfile(profile);
  return await db.explainQuery(profile, query, format);
}

/**
 * Test database connection
 * @param profile - Database profile name
 */
export async function testConnection(profile: string): Promise<ConnectionTestResult> {
  const factory = initDB();
  const db = factory.getUtilForProfile(profile);
  return await db.testConnection(profile);
}

/**
 * Close all database connections
 */
export async function closeConnections(): Promise<void> {
  if (dbFactory) {
    await dbFactory.closeAll();
    dbFactory = null;
    cachedConfig = null;
  }
}
