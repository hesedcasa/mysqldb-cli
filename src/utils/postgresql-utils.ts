import { encode } from '@toon-format/toon';
import pg from 'pg';

import type { Config } from './config-loader.js';
import { getPostgreSQLConnectionOptions, getPostgreSQLSchema } from './config-loader.js';
import type {
  ConnectionTestResult,
  DatabaseListResult,
  DatabaseUtil,
  ExplainResult,
  IndexResult,
  OutputFormat,
  QueryResult,
  TableListResult,
  TableStructureResult,
} from './database.js';
import {
  analyzeQuery,
  applyDefaultLimit,
  checkBlacklist,
  getQueryType,
  requiresConfirmation,
} from './query-validator.js';

const { Pool } = pg;

type PoolClient = pg.PoolClient;
type QueryResultRow = Record<string, unknown>;
type FieldDef = pg.FieldDef;

/**
 * PostgreSQL Database Utility Module
 * Provides core database operations with safety validation and formatting
 */
export class PostgreSQLUtil implements DatabaseUtil {
  private config: Config;
  private connectionPool: Map<string, pg.Pool>;

  constructor(config: Config) {
    this.config = config;
    this.connectionPool = new Map();
  }

  /**
   * Get or create PostgreSQL connection pool for a profile
   */
  private async getPool(profileName: string): Promise<pg.Pool> {
    if (this.connectionPool.has(profileName)) {
      return this.connectionPool.get(profileName)!;
    }

    const options = getPostgreSQLConnectionOptions(this.config, profileName);
    const pool = new Pool(options);
    this.connectionPool.set(profileName, pool);

    return pool;
  }

  /**
   * Format query results as table
   */
  private formatAsTable(rows: QueryResultRow[], fields: FieldDef[]): string {
    if (!rows || rows.length === 0) {
      return 'No results';
    }

    const columnNames = fields.map(f => f.name);
    const columnWidths = columnNames.map(name => {
      const dataWidth = Math.max(...rows.map(row => String(row[name] ?? '').length));
      return Math.max(name.length, dataWidth, 3);
    });

    // Header
    let table = '\u250c' + columnWidths.map(w => '\u2500'.repeat(w + 2)).join('\u252c') + '\u2510\n';
    table += '\u2502 ' + columnNames.map((name, i) => name.padEnd(columnWidths[i])).join(' \u2502 ') + ' \u2502\n';
    table += '\u251c' + columnWidths.map(w => '\u2500'.repeat(w + 2)).join('\u253c') + '\u2524\n';

    // Rows
    for (const row of rows) {
      table +=
        '\u2502 ' +
        columnNames
          .map((name, i) => {
            const value = row[name] ?? 'NULL';
            return String(value).padEnd(columnWidths[i]);
          })
          .join(' \u2502 ') +
        ' \u2502\n';
    }

    table += '\u2514' + columnWidths.map(w => '\u2500'.repeat(w + 2)).join('\u2534') + '\u2518';

    return table;
  }

  /**
   * Format query results as JSON
   */
  private formatAsJson(rows: QueryResultRow[]): string {
    return JSON.stringify(rows, null, 2);
  }

  /**
   * Format query results as CSV
   */
  private formatAsCsv(rows: QueryResultRow[], fields: FieldDef[]): string {
    if (!rows || rows.length === 0) {
      return '';
    }

    const columnNames = fields.map(f => f.name);
    let csv = columnNames.join(',') + '\n';

    for (const row of rows) {
      const values = columnNames.map(name => {
        const value = row[name] ?? '';
        const str = String(value);
        // Escape quotes and wrap in quotes if contains comma or quote
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      });
      csv += values.join(',') + '\n';
    }

    return csv;
  }

  /**
   * Format query results as TOON (Token-Oriented Object Notation)
   */
  private formatAsToon(rows: QueryResultRow[]): string {
    if (!rows || rows.length === 0) {
      return '';
    }

    // Convert special types (Date, Buffer) to serializable values for TOON
    const serializedRows = rows.map(row => {
      const serialized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        if (value instanceof Date) {
          // Check if date is valid before converting
          if (!isNaN(value.getTime())) {
            serialized[key] = value.toISOString();
          } else {
            serialized[key] = null;
          }
        } else if (Buffer.isBuffer(value)) {
          // Convert Buffer to base64 string
          serialized[key] = value.toString('base64');
        } else {
          serialized[key] = value;
        }
      }
      return serialized;
    });

    return encode(serializedRows);
  }

  /**
   * Validate query and execute if safe
   */
  async executeQuery(profileName: string, query: string, format: OutputFormat = 'table'): Promise<QueryResult> {
    // Validate query against blacklist
    const blacklistCheck = checkBlacklist(query, this.config.safety.blacklisted_operations);
    if (!blacklistCheck.allowed) {
      return {
        success: false,
        error: `ERROR: ${blacklistCheck.reason}\n\nThis operation is blocked by safety rules and cannot be executed.`,
      };
    }

    // Check if confirmation required
    const confirmationCheck = requiresConfirmation(query, this.config.safety.require_confirmation_for);
    if (confirmationCheck.required) {
      return {
        success: false,
        requiresConfirmation: true,
        message: `WARNING: ${confirmationCheck.message}\n\nQuery: ${query}\n\nThis is a destructive operation. Please confirm you want to proceed.`,
      };
    }

    // Analyze query for warnings
    const warnings = analyzeQuery(query);
    let warningText = '';
    if (warnings.length > 0) {
      warningText =
        '\u26a0\ufe0f  Query Analysis:\n' +
        warnings.map(w => `  [${w.level.toUpperCase()}] ${w.message}\n  \u2192 ${w.suggestion}`).join('\n') +
        '\n\n';
    }

    // Apply default limit for SELECT queries
    let finalQuery = query;
    const queryType = getQueryType(query);
    if (queryType === 'SELECT') {
      finalQuery = applyDefaultLimit(query, this.config.safety.default_limit);
      if (finalQuery !== query) {
        warningText += `\u2139\ufe0f  Applied default LIMIT ${this.config.safety.default_limit}\n\n`;
      }
    }

    let client: PoolClient | null = null;
    try {
      const pool = await this.getPool(profileName);
      client = await pool.connect();
      const result = await client.query(finalQuery);

      let output = '';
      if (queryType === 'SELECT' || queryType === 'SHOW' || queryType === 'DESCRIBE' || queryType === 'EXPLAIN') {
        const rowCount = result.rows.length;
        output += `Query executed successfully. Rows returned: ${rowCount}\n\n`;

        if (format === 'json') {
          output += this.formatAsJson(result.rows);
        } else if (format === 'csv') {
          output += this.formatAsCsv(result.rows, result.fields);
        } else if (format === 'toon') {
          output += this.formatAsToon(result.rows);
        } else {
          output += this.formatAsTable(result.rows, result.fields);
        }
      } else {
        // INSERT, UPDATE, DELETE, DDL
        const affectedRows = result.rowCount ?? 0;
        output += `Query executed successfully.\n`;
        output += `Affected rows: ${affectedRows}\n`;
      }

      return {
        success: true,
        result: warningText + output,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `ERROR: ${errorMessage}`,
      };
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * List all databases
   */
  async listDatabases(profileName: string): Promise<DatabaseListResult> {
    let client: PoolClient | null = null;
    try {
      const pool = await this.getPool(profileName);
      client = await pool.connect();
      const result = await client.query(
        'SELECT datname as "Database" FROM pg_database WHERE datistemplate = false ORDER BY datname'
      );
      const databases = result.rows.map(row => row.Database as string);
      return {
        success: true,
        databases,
        result: `Databases:\n${databases.map(db => `  \u2022 ${db}`).join('\n')}`,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `ERROR: ${errorMessage}`,
      };
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * List all tables in current database
   */
  async listTables(profileName: string): Promise<TableListResult> {
    let client: PoolClient | null = null;
    try {
      const pool = await this.getPool(profileName);
      client = await pool.connect();
      const schema = getPostgreSQLSchema(this.config, profileName);
      const result = await client.query(
        'SELECT tablename as "Tables" FROM pg_tables WHERE schemaname = $1 ORDER BY tablename',
        [schema]
      );
      const tables = result.rows.map(row => row.Tables as string);

      return {
        success: true,
        tables,
        result: `Tables in schema '${schema}':\n${tables.map(table => `  \u2022 ${table}`).join('\n')}`,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `ERROR: ${errorMessage}`,
      };
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Describe table structure
   */
  async describeTable(
    profileName: string,
    table: string,
    format: OutputFormat = 'table'
  ): Promise<TableStructureResult> {
    let client: PoolClient | null = null;
    try {
      const pool = await this.getPool(profileName);
      client = await pool.connect();
      const schema = getPostgreSQLSchema(this.config, profileName);
      const result = await client.query(
        `SELECT
          c.column_name as "Field",
          c.data_type as "Type",
          c.is_nullable as "Null",
          c.column_default as "Default",
          CASE
            WHEN pk.column_name IS NOT NULL THEN 'PRI'
            ELSE ''
          END as "Key"
        FROM information_schema.columns c
        LEFT JOIN (
          SELECT ku.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku
            ON tc.constraint_name = ku.constraint_name
            AND tc.table_schema = ku.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_name = $1
            AND tc.table_schema = $2
        ) pk ON c.column_name = pk.column_name
        WHERE c.table_name = $1 AND c.table_schema = $2
        ORDER BY c.ordinal_position`,
        [table, schema]
      );

      let output = '';
      if (format === 'json') {
        output += this.formatAsJson(result.rows);
      } else if (format === 'toon') {
        output += this.formatAsToon(result.rows);
      } else {
        output += this.formatAsTable(result.rows, result.fields);
      }

      return {
        success: true,
        structure: result.rows,
        result: output,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `ERROR: ${errorMessage}`,
      };
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Show table indexes
   */
  async showIndexes(profileName: string, table: string, format: OutputFormat = 'table'): Promise<IndexResult> {
    let client: PoolClient | null = null;
    try {
      const pool = await this.getPool(profileName);
      client = await pool.connect();
      const schema = getPostgreSQLSchema(this.config, profileName);
      const result = await client.query(
        `SELECT
          schemaname as "Schema",
          tablename as "Table",
          indexname as "Key_name",
          indexdef as "Index_definition"
        FROM pg_indexes
        WHERE tablename = $1 AND schemaname = $2`,
        [table, schema]
      );

      let output = '';
      if (format === 'json') {
        output += this.formatAsJson(result.rows);
      } else if (format === 'toon') {
        output += this.formatAsToon(result.rows);
      } else {
        output += this.formatAsTable(result.rows, result.fields);
      }

      return {
        success: true,
        indexes: result.rows,
        result: output,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `ERROR: ${errorMessage}`,
      };
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Explain query execution plan
   */
  async explainQuery(profileName: string, query: string, format: OutputFormat = 'table'): Promise<ExplainResult> {
    let client: PoolClient | null = null;
    try {
      const pool = await this.getPool(profileName);
      client = await pool.connect();
      const result = await client.query(`EXPLAIN ${query}`);

      let output = '';
      if (format === 'json') {
        output += this.formatAsJson(result.rows);
      } else if (format === 'toon') {
        output += this.formatAsToon(result.rows);
      } else {
        output += this.formatAsTable(result.rows, result.fields);
      }

      return {
        success: true,
        plan: result.rows,
        result: output,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `ERROR: ${errorMessage}`,
      };
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Test database connection
   */
  async testConnection(profileName: string): Promise<ConnectionTestResult> {
    let client: PoolClient | null = null;
    try {
      const pool = await this.getPool(profileName);
      client = await pool.connect();
      const result = await client.query('SELECT version() as version, current_database() as current_database');

      const info = result.rows[0];
      return {
        success: true,
        version: info.version as string,
        database: info.current_database as string,
        result: `\u2705 Connection successful!\n\nProfile: ${profileName}\nPostgreSQL Version: ${info.version}\nCurrent Database: ${info.current_database}`,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `ERROR: ${errorMessage}`,
      };
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    for (const pool of this.connectionPool.values()) {
      await pool.end();
    }
    this.connectionPool.clear();
  }
}
