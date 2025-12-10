import fs from 'fs';
import type { ConnectionOptions as MySQL2ConnectionOptions } from 'mysql2/promise';
import path from 'path';
import type { PoolConfig as PostgreSQLPoolConfig } from 'pg';
import yaml from 'yaml';

/**
 * Supported database types
 */
export type DatabaseType = 'mysql' | 'postgresql';

/**
 * Database connection profile configuration
 */
interface DatabaseProfile {
  type?: DatabaseType; // Defaults to 'mysql' for backward compatibility
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean;
  schema?: string; // PostgreSQL-specific: default schema (defaults to 'public')
}

/**
 * Safety configuration for query execution
 */
interface SafetyConfig {
  defaultLimit: number;
  requireConfirmationFor: string[];
  blacklistedOperations: string[];
}

/**
 * Main configuration structure
 */
export interface Config {
  profiles: Record<string, DatabaseProfile>;
  safety: SafetyConfig;
  defaultProfile: string;
  defaultFormat: 'table' | 'json' | 'csv' | 'toon';
}

/**
 * MySQL connection options for mysql2 driver
 */
type MySQLConnectionOptions = Pick<
  MySQL2ConnectionOptions,
  'host' | 'port' | 'user' | 'password' | 'database' | 'ssl' | 'connectTimeout' | 'multipleStatements'
>;

/**
 * PostgreSQL connection options for pg driver
 */
type PostgreSQLConnectionOptions = Pick<
  PostgreSQLPoolConfig,
  'host' | 'port' | 'user' | 'password' | 'database' | 'ssl' | 'connectionTimeoutMillis'
>;

/**
 * Load database connection profiles from .claude/sql-config.local.md
 *
 * @param projectRoot - Project root directory
 * @returns Configuration object with profiles and settings
 */
export function loadConfig(projectRoot: string): Config {
  const configPath = path.join(projectRoot, '.claude', 'sql-config.local.md');

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Configuration file not found at ${configPath}\n` +
        `Please create .claude/sql-config.local.md with your database profiles.`
    );
  }

  const content = fs.readFileSync(configPath, 'utf-8');

  // Extract YAML frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) {
    throw new Error(`Invalid configuration file format. Expected YAML frontmatter (---...---) at the beginning.`);
  }

  const frontmatter = frontmatterMatch[1];
  const config = yaml.parse(frontmatter) as Partial<Config>;

  // Validate configuration
  if (!config.profiles || typeof config.profiles !== 'object') {
    throw new Error('Configuration must include "profiles" object');
  }

  // Validate each profile
  for (const [profileName, profile] of Object.entries(config.profiles)) {
    const required: Array<keyof DatabaseProfile> = ['host', 'port', 'user', 'password', 'database'];
    for (const field of required) {
      if (profile[field] === undefined || profile[field] === null) {
        throw new Error(`Profile "${profileName}" missing required field: ${field}`);
      }
    }

    // Validate database type if specified
    if (profile.type && !['mysql', 'postgresql'].includes(profile.type)) {
      throw new Error(`Profile "${profileName}" has invalid type: ${profile.type}. Must be 'mysql' or 'postgresql'.`);
    }
  }

  return {
    profiles: config.profiles,
    safety: config.safety || {
      defaultLimit: 100,
      requireConfirmationFor: ['DELETE', 'UPDATE', 'DROP', 'TRUNCATE', 'ALTER'],
      blacklistedOperations: ['DROP DATABASE'],
    },
    defaultProfile: config.defaultProfile || Object.keys(config.profiles)[0],
    defaultFormat: config.defaultFormat || 'table',
  };
}

/**
 * Get database type for a profile (defaults to 'mysql' for backward compatibility)
 *
 * @param config - Configuration object
 * @param profileName - Profile name
 * @returns Database type
 */
export function getDatabaseType(config: Config, profileName: string): DatabaseType {
  const profile = config.profiles[profileName];

  if (!profile) {
    const availableProfiles = Object.keys(config.profiles).join(', ');
    throw new Error(`Profile "${profileName}" not found. Available profiles: ${availableProfiles}`);
  }

  return profile.type || 'mysql';
}

/**
 * Get MySQL connection options for a specific profile
 *
 * @param config - Configuration object
 * @param profileName - Profile name
 * @returns MySQL connection options
 */
export function getMySQLConnectionOptions(config: Config, profileName: string): MySQLConnectionOptions {
  const profile = config.profiles[profileName];

  if (!profile) {
    const availableProfiles = Object.keys(config.profiles).join(', ');
    throw new Error(`Profile "${profileName}" not found. Available profiles: ${availableProfiles}`);
  }

  const options: MySQLConnectionOptions = {
    host: profile.host,
    port: profile.port,
    user: profile.user,
    password: profile.password,
    database: profile.database,
    connectTimeout: 10000,
    multipleStatements: false, // Security: prevent SQL injection via multiple statements
  };

  // Only include SSL if explicitly set to true in profile
  if (profile.ssl) {
    options.ssl = {};
  }

  return options;
}

/**
 * Get PostgreSQL connection options for a specific profile
 *
 * @param config - Configuration object
 * @param profileName - Profile name
 * @returns PostgreSQL connection options
 */
export function getPostgreSQLConnectionOptions(config: Config, profileName: string): PostgreSQLConnectionOptions {
  const profile = config.profiles[profileName];

  if (!profile) {
    const availableProfiles = Object.keys(config.profiles).join(', ');
    throw new Error(`Profile "${profileName}" not found. Available profiles: ${availableProfiles}`);
  }

  const options: PostgreSQLConnectionOptions = {
    host: profile.host,
    port: profile.port,
    user: profile.user,
    password: profile.password,
    database: profile.database,
    connectionTimeoutMillis: 10000,
  };

  // Only include SSL if explicitly set to true in profile
  if (profile.ssl) {
    options.ssl = true;
  }

  return options;
}

/**
 * Get PostgreSQL schema for a profile (defaults to 'public')
 *
 * @param config - Configuration object
 * @param profileName - Profile name
 * @returns Schema name
 */
export function getPostgreSQLSchema(config: Config, profileName: string): string {
  const profile = config.profiles[profileName];

  if (!profile) {
    const availableProfiles = Object.keys(config.profiles).join(', ');
    throw new Error(`Profile "${profileName}" not found. Available profiles: ${availableProfiles}`);
  }

  return profile.schema || 'public';
}
