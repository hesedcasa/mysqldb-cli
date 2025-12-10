import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Config } from '../../../src/utils/config-loader.js';
import { DatabaseFactory, createDatabaseFactory } from '../../../src/utils/database-factory.js';
import { MySQLUtil } from '../../../src/utils/mysql-utils.js';
import { PostgreSQLUtil } from '../../../src/utils/postgresql-utils.js';

// Mock the getDatabaseType function
vi.mock('../../../src/utils/config-loader.js', () => ({
  getDatabaseType: vi.fn((config: Config, profileName: string) => {
    const profile = config.profiles[profileName];
    return profile?.type || 'mysql';
  }),
  getMySQLConnectionOptions: vi.fn(() => ({
    host: 'localhost',
    port: 3306,
    user: 'testuser',
    password: 'testpass',
    database: 'testdb',
    connectTimeout: 10000,
    multipleStatements: false,
  })),
  getPostgreSQLConnectionOptions: vi.fn(() => ({
    host: 'localhost',
    port: 5432,
    user: 'testuser',
    password: 'testpass',
    database: 'testdb',
    connectionTimeoutMillis: 10000,
  })),
  getPostgreSQLSchema: vi.fn(() => 'public'),
}));

describe('DatabaseFactory', () => {
  let mysqlConfig: Config;
  let postgresConfig: Config;
  let mixedConfig: Config;

  beforeEach(() => {
    mysqlConfig = {
      profiles: {
        local: {
          host: 'localhost',
          port: 3306,
          user: 'root',
          password: 'password',
          database: 'testdb',
        },
      },
      safety: {
        defaultLimit: 100,
        requireConfirmationFor: ['DELETE', 'UPDATE', 'DROP', 'TRUNCATE', 'ALTER'],
        blacklistedOperations: ['DROP DATABASE'],
      },
      defaultProfile: 'local',
      defaultFormat: 'table',
    };

    postgresConfig = {
      profiles: {
        local: {
          type: 'postgresql',
          host: 'localhost',
          port: 5432,
          user: 'postgres',
          password: 'password',
          database: 'testdb',
        },
      },
      safety: {
        defaultLimit: 100,
        requireConfirmationFor: ['DELETE', 'UPDATE', 'DROP', 'TRUNCATE', 'ALTER'],
        blacklistedOperations: ['DROP DATABASE'],
      },
      defaultProfile: 'local',
      defaultFormat: 'table',
    };

    mixedConfig = {
      profiles: {
        mysql: {
          type: 'mysql',
          host: 'localhost',
          port: 3306,
          user: 'root',
          password: 'password',
          database: 'mysql_db',
        },
        postgres: {
          type: 'postgresql',
          host: 'localhost',
          port: 5432,
          user: 'postgres',
          password: 'password',
          database: 'postgres_db',
        },
      },
      safety: {
        defaultLimit: 100,
        requireConfirmationFor: ['DELETE', 'UPDATE', 'DROP', 'TRUNCATE', 'ALTER'],
        blacklistedOperations: ['DROP DATABASE'],
      },
      defaultProfile: 'mysql',
      defaultFormat: 'table',
    };

    vi.clearAllMocks();
  });

  describe('createDatabaseFactory', () => {
    it('should create a DatabaseFactory instance', () => {
      const factory = createDatabaseFactory(mysqlConfig);
      expect(factory).toBeDefined();
      expect(factory).toBeInstanceOf(DatabaseFactory);
    });
  });

  describe('getUtilForProfile', () => {
    it('should return MySQLUtil for MySQL profiles', () => {
      const factory = createDatabaseFactory(mysqlConfig);
      const util = factory.getUtilForProfile('local');
      expect(util).toBeInstanceOf(MySQLUtil);
    });

    it('should return PostgreSQLUtil for PostgreSQL profiles', () => {
      const factory = createDatabaseFactory(postgresConfig);
      const util = factory.getUtilForProfile('local');
      expect(util).toBeInstanceOf(PostgreSQLUtil);
    });

    it('should return correct utility for mixed configuration', () => {
      const factory = createDatabaseFactory(mixedConfig);

      const mysqlUtil = factory.getUtilForProfile('mysql');
      expect(mysqlUtil).toBeInstanceOf(MySQLUtil);

      const postgresUtil = factory.getUtilForProfile('postgres');
      expect(postgresUtil).toBeInstanceOf(PostgreSQLUtil);
    });

    it('should cache and reuse utilities', () => {
      const factory = createDatabaseFactory(mysqlConfig);
      const util1 = factory.getUtilForProfile('local');
      const util2 = factory.getUtilForProfile('local');
      expect(util1).toBe(util2);
    });
  });

  describe('getUtilForType', () => {
    it('should return MySQLUtil for mysql type', () => {
      const factory = createDatabaseFactory(mysqlConfig);
      const util = factory.getUtilForType('mysql');
      expect(util).toBeInstanceOf(MySQLUtil);
    });

    it('should return PostgreSQLUtil for postgresql type', () => {
      const factory = createDatabaseFactory(mysqlConfig);
      const util = factory.getUtilForType('postgresql');
      expect(util).toBeInstanceOf(PostgreSQLUtil);
    });
  });

  describe('closeAll', () => {
    it('should close all utilities', async () => {
      const factory = createDatabaseFactory(mixedConfig);

      // Create both utilities
      factory.getUtilForProfile('mysql');
      factory.getUtilForProfile('postgres');

      // Should not throw
      await factory.closeAll();
      expect(true).toBe(true);
    });

    it('should be safe to call multiple times', async () => {
      const factory = createDatabaseFactory(mysqlConfig);
      factory.getUtilForProfile('local');

      await factory.closeAll();
      await factory.closeAll();
      expect(true).toBe(true);
    });
  });

  describe('default database type', () => {
    it('should default to MySQL when type is not specified', () => {
      const factory = createDatabaseFactory(mysqlConfig);
      const util = factory.getUtilForProfile('local');
      expect(util).toBeInstanceOf(MySQLUtil);
    });
  });
});
