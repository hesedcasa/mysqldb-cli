/**
 * Database Factory
 * Creates the appropriate database utility based on configuration
 */
import type { Config, DatabaseType } from './config-loader.js';
import { getDatabaseType } from './config-loader.js';
import type { DatabaseUtil } from './database.js';
import { MySQLUtil } from './mysql-utils.js';
import { PostgreSQLUtil } from './postgresql-utils.js';

/**
 * Map of profile names to their database utilities
 * Allows mixed MySQL and PostgreSQL profiles in the same configuration
 */
interface DatabaseUtilMap {
  mysql: MySQLUtil | null;
  postgresql: PostgreSQLUtil | null;
}

/**
 * Database factory that manages database utilities for different profiles
 */
export class DatabaseFactory {
  private config: Config;
  private utils: DatabaseUtilMap;

  constructor(config: Config) {
    this.config = config;
    this.utils = {
      mysql: null,
      postgresql: null,
    };
  }

  /**
   * Get the database utility for a specific profile
   * Lazily creates utilities as needed
   *
   * @param profileName - Profile name
   * @returns Database utility for the profile's database type
   */
  getUtilForProfile(profileName: string): DatabaseUtil {
    const dbType = getDatabaseType(this.config, profileName);
    return this.getUtilForType(dbType);
  }

  /**
   * Get the database utility for a specific database type
   * Lazily creates utilities as needed
   *
   * @param dbType - Database type
   * @returns Database utility for the database type
   */
  getUtilForType(dbType: DatabaseType): DatabaseUtil {
    if (dbType === 'postgresql') {
      if (!this.utils.postgresql) {
        this.utils.postgresql = new PostgreSQLUtil(this.config);
      }
      return this.utils.postgresql;
    } else {
      // Default to MySQL
      if (!this.utils.mysql) {
        this.utils.mysql = new MySQLUtil(this.config);
      }
      return this.utils.mysql;
    }
  }

  /**
   * Close all database connections
   */
  async closeAll(): Promise<void> {
    if (this.utils.mysql) {
      await this.utils.mysql.closeAll();
      this.utils.mysql = null;
    }
    if (this.utils.postgresql) {
      await this.utils.postgresql.closeAll();
      this.utils.postgresql = null;
    }
  }
}

/**
 * Create a database factory from configuration
 *
 * @param config - Configuration object
 * @returns Database factory instance
 */
export function createDatabaseFactory(config: Config): DatabaseFactory {
  return new DatabaseFactory(config);
}
