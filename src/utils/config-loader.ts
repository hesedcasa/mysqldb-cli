import fs from 'fs';
import type { ConnectionOptions as MySQL2ConnectionOptions } from 'mysql2/promise';
import path from 'path';
import yaml from 'yaml';

/**
 * MySQL connection profile configuration
 */
interface MySQLProfile {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean;
}

/**
 * Safety configuration for query execution
 */
interface SafetyConfig {
  default_limit: number;
  require_confirmation_for: string[];
  blacklisted_operations: string[];
}

/**
 * Main configuration structure
 */
export interface Config {
  profiles: Record<string, MySQLProfile>;
  safety: SafetyConfig;
  defaultProfile: string;
  defaultFormat: 'table' | 'json' | 'csv' | 'toon';
}

/**
 * MySQL connection options for mysql2 driver
 */
type ConnectionOptions = Pick<
  MySQL2ConnectionOptions,
  'host' | 'port' | 'user' | 'password' | 'database' | 'ssl' | 'connectTimeout' | 'multipleStatements'
>;

/**
 * Load MySQL connection profiles from .claude/mysql-connector.local.md
 *
 * @param projectRoot - Project root directory
 * @returns Configuration object with profiles and settings
 */
export function loadConfig(projectRoot: string): Config {
  const configPath = path.join(projectRoot, '.claude', 'mysql-connector.local.md');

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Configuration file not found at ${configPath}\n` +
        `Please create .claude/mysql-connector.local.md with your database profiles.`
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
    const required: Array<keyof MySQLProfile> = ['host', 'port', 'user', 'password', 'database'];
    for (const field of required) {
      if (!profile[field]) {
        throw new Error(`Profile "${profileName}" missing required field: ${field}`);
      }
    }
  }

  return {
    profiles: config.profiles,
    safety: config.safety || {
      default_limit: 100,
      require_confirmation_for: ['DELETE', 'UPDATE', 'DROP', 'TRUNCATE', 'ALTER'],
      blacklisted_operations: ['DROP DATABASE'],
    },
    defaultProfile: config.defaultProfile || Object.keys(config.profiles)[0],
    defaultFormat: config.defaultFormat || 'table',
  };
}

/**
 * Get connection options for a specific profile
 *
 * @param config - Configuration object
 * @param profileName - Profile name
 * @returns MySQL connection options
 */
export function getConnectionOptions(config: Config, profileName: string): ConnectionOptions {
  const profile = config.profiles[profileName];

  if (!profile) {
    const availableProfiles = Object.keys(config.profiles).join(', ');
    throw new Error(`Profile "${profileName}" not found. Available profiles: ${availableProfiles}`);
  }

  const options: ConnectionOptions = {
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
