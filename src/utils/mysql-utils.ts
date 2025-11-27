import { encode } from '@toon-format/toon';
import mysql from 'mysql2/promise';
import type { Connection, FieldPacket, OkPacket, RowDataPacket } from 'mysql2/promise';

import type { Config } from './config-loader.js';
import { getConnectionOptions } from './config-loader.js';
import {
  analyzeQuery,
  applyDefaultLimit,
  checkBlacklist,
  getQueryType,
  requiresConfirmation,
} from './query-validator.js';

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
  structure?: RowDataPacket[];
  result?: string;
  error?: string;
}

/**
 * Index information result
 */
export interface IndexResult {
  success: boolean;
  indexes?: RowDataPacket[];
  result?: string;
  error?: string;
}

/**
 * Query plan result
 */
export interface ExplainResult {
  success: boolean;
  plan?: RowDataPacket[];
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
 * MySQL Database Utility Module
 * Provides core database operations with safety validation and formatting
 */
export class MySQLUtil {
  private config: Config;
  private connectionPool: Map<string, Connection>;

  constructor(config: Config) {
    this.config = config;
    this.connectionPool = new Map();
  }

  /**
   * Get or create MySQL connection for a profile
   */
  async getConnection(profileName: string): Promise<Connection> {
    if (this.connectionPool.has(profileName)) {
      return this.connectionPool.get(profileName)!;
    }

    const options = getConnectionOptions(this.config, profileName);
    const connection = await mysql.createConnection(options);
    this.connectionPool.set(profileName, connection);

    return connection;
  }

  /**
   * Format query results as table
   */
  formatAsTable(rows: RowDataPacket[], fields: FieldPacket[]): string {
    if (!rows || rows.length === 0) {
      return 'No results';
    }

    const columnNames = fields.map(f => f.name);
    const columnWidths = columnNames.map(name => {
      const dataWidth = Math.max(...rows.map(row => String(row[name] ?? '').length));
      return Math.max(name.length, dataWidth, 3);
    });

    // Header
    let table = '┌' + columnWidths.map(w => '─'.repeat(w + 2)).join('┬') + '┐\n';
    table += '│ ' + columnNames.map((name, i) => name.padEnd(columnWidths[i])).join(' │ ') + ' │\n';
    table += '├' + columnWidths.map(w => '─'.repeat(w + 2)).join('┼') + '┤\n';

    // Rows
    for (const row of rows) {
      table +=
        '│ ' +
        columnNames
          .map((name, i) => {
            const value = row[name] ?? 'NULL';
            return String(value).padEnd(columnWidths[i]);
          })
          .join(' │ ') +
        ' │\n';
    }

    table += '└' + columnWidths.map(w => '─'.repeat(w + 2)).join('┴') + '┘';

    return table;
  }

  /**
   * Format query results as JSON
   */
  formatAsJson(rows: RowDataPacket[]): string {
    return JSON.stringify(rows, null, 2);
  }

  /**
   * Format query results as CSV
   */
  formatAsCsv(rows: RowDataPacket[], fields: FieldPacket[]): string {
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
  formatAsToon(rows: RowDataPacket[]): string {
    if (!rows || rows.length === 0) {
      return '';
    }

    return encode(rows);
  }

  /**
   * Validate query and execute if safe
   */
  async executeQuery(
    profileName: string,
    query: string,
    format: 'table' | 'json' | 'csv' | 'toon' = 'table'
  ): Promise<QueryResult> {
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
        '⚠️  Query Analysis:\n' +
        warnings.map(w => `  [${w.level.toUpperCase()}] ${w.message}\n  → ${w.suggestion}`).join('\n') +
        '\n\n';
    }

    // Apply default limit for SELECT queries
    let finalQuery = query;
    const queryType = getQueryType(query);
    if (queryType === 'SELECT') {
      finalQuery = applyDefaultLimit(query, this.config.safety.default_limit);
      if (finalQuery !== query) {
        warningText += `ℹ️  Applied default LIMIT ${this.config.safety.default_limit}\n\n`;
      }
    }

    try {
      const connection = await this.getConnection(profileName);
      const [rows, fields] = await connection.query(finalQuery);

      let result = '';
      if (queryType === 'SELECT' || queryType === 'SHOW' || queryType === 'DESCRIBE' || queryType === 'EXPLAIN') {
        const rowCount = Array.isArray(rows) ? rows.length : 0;
        result += `Query executed successfully. Rows returned: ${rowCount}\n\n`;

        if (format === 'json') {
          result += this.formatAsJson(rows as RowDataPacket[]);
        } else if (format === 'csv') {
          result += this.formatAsCsv(rows as RowDataPacket[], fields as FieldPacket[]);
        } else if (format === 'toon') {
          result += this.formatAsToon(rows as RowDataPacket[]);
        } else {
          result += this.formatAsTable(rows as RowDataPacket[], fields as FieldPacket[]);
        }
      } else {
        // INSERT, UPDATE, DELETE, DDL
        const okPacket = rows as OkPacket;
        const affectedRows = okPacket.affectedRows ?? 0;
        const insertId = okPacket.insertId ?? null;
        result += `Query executed successfully.\n`;
        result += `Affected rows: ${affectedRows}\n`;
        if (insertId) {
          result += `Insert ID: ${insertId}\n`;
        }
      }

      return {
        success: true,
        result: warningText + result,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `ERROR: ${errorMessage}`,
      };
    }
  }

  /**
   * List all databases
   */
  async listDatabases(profileName: string): Promise<DatabaseListResult> {
    try {
      const connection = await this.getConnection(profileName);
      const [rows] = await connection.query('SHOW DATABASES');
      const databases = (rows as RowDataPacket[]).map(row => row.Database as string);
      return {
        success: true,
        databases,
        result: `Databases:\n${databases.map(db => `  • ${db}`).join('\n')}`,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `ERROR: ${errorMessage}`,
      };
    }
  }

  /**
   * List all tables in current database
   */
  async listTables(profileName: string): Promise<TableListResult> {
    try {
      const connection = await this.getConnection(profileName);
      const [rows] = await connection.query('SHOW TABLES');

      const rowsArray = rows as RowDataPacket[];
      const tableKey = Object.keys(rowsArray[0])[0];
      const tables = rowsArray.map(row => row[tableKey] as string);

      return {
        success: true,
        tables,
        result: `Tables in database:\n${tables.map(table => `  • ${table}`).join('\n')}`,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `ERROR: ${errorMessage}`,
      };
    }
  }

  /**
   * Describe table structure
   */
  async describeTable(profileName: string, table: string): Promise<TableStructureResult> {
    try {
      const connection = await this.getConnection(profileName);
      const [rows, fields] = await connection.query(`DESCRIBE ${table}`);

      return {
        success: true,
        structure: rows as RowDataPacket[],
        result: `Structure of table "${table}":\n\n${this.formatAsTable(rows as RowDataPacket[], fields as FieldPacket[])}`,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `ERROR: ${errorMessage}`,
      };
    }
  }

  /**
   * Show table indexes
   */
  async showIndexes(profileName: string, table: string): Promise<IndexResult> {
    try {
      const connection = await this.getConnection(profileName);
      const [rows, fields] = await connection.query(`SHOW INDEXES FROM ${table}`);

      return {
        success: true,
        indexes: rows as RowDataPacket[],
        result: `Indexes on table "${table}":\n\n${this.formatAsTable(rows as RowDataPacket[], fields as FieldPacket[])}`,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `ERROR: ${errorMessage}`,
      };
    }
  }

  /**
   * Explain query execution plan
   */
  async explainQuery(profileName: string, query: string): Promise<ExplainResult> {
    try {
      const connection = await this.getConnection(profileName);
      const [rows, fields] = await connection.query(`EXPLAIN ${query}`);

      return {
        success: true,
        plan: rows as RowDataPacket[],
        result: `Execution plan for query:\n${query}\n\n${this.formatAsTable(rows as RowDataPacket[], fields as FieldPacket[])}`,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `ERROR: ${errorMessage}`,
      };
    }
  }

  /**
   * Test database connection
   */
  async testConnection(profileName: string): Promise<ConnectionTestResult> {
    try {
      const connection = await this.getConnection(profileName);
      const [rows] = await connection.query('SELECT VERSION() as version, DATABASE() as current_database');

      const info = (rows as RowDataPacket[])[0];
      return {
        success: true,
        version: info.version as string,
        database: info.current_database as string,
        result: `✅ Connection successful!\n\nProfile: ${profileName}\nMySQL Version: ${info.version}\nCurrent Database: ${info.current_database}`,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `ERROR: ${errorMessage}`,
      };
    }
  }

  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    for (const connection of this.connectionPool.values()) {
      await connection.end();
    }
    this.connectionPool.clear();
  }
}
