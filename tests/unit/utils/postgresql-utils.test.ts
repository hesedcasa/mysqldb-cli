import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Config } from '../../../src/utils/config-loader.js';
import { PostgreSQLUtil } from '../../../src/utils/postgresql-utils.js';

// Mock pg module
vi.mock('pg', () => {
  const mockClient = {
    query: vi.fn(),
    release: vi.fn(),
  };

  const mockPool = {
    connect: vi.fn().mockResolvedValue(mockClient),
    end: vi.fn().mockResolvedValue(undefined),
  };

  return {
    default: {
      Pool: vi.fn(() => mockPool),
    },
  };
});

// Mock config-loader
vi.mock('../../../src/utils/config-loader.js', () => ({
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

describe('PostgreSQLUtil', () => {
  let postgresUtil: PostgreSQLUtil;
  let mockConfig: Config;

  beforeEach(() => {
    mockConfig = {
      profiles: {
        test: {
          type: 'postgresql',
          host: 'localhost',
          port: 5432,
          user: 'testuser',
          password: 'testpass',
          database: 'testdb',
        },
      },
      safety: {
        default_limit: 100,
        require_confirmation_for: ['DELETE', 'UPDATE', 'DROP', 'TRUNCATE', 'ALTER'],
        blacklisted_operations: ['DROP DATABASE'],
      },
      defaultProfile: 'test',
      defaultFormat: 'table',
    };
    postgresUtil = new PostgreSQLUtil(mockConfig);
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create a PostgreSQLUtil instance', () => {
      expect(postgresUtil).toBeDefined();
      expect(postgresUtil).toBeInstanceOf(PostgreSQLUtil);
    });
  });

  describe('executeQuery', () => {
    it('should reject blacklisted operations', async () => {
      const result = await postgresUtil.executeQuery('test', 'DROP DATABASE production');
      expect(result.success).toBe(false);
      expect(result.error).toContain('blacklisted');
    });

    it('should require confirmation for DELETE queries', async () => {
      const result = await postgresUtil.executeQuery('test', 'DELETE FROM users');
      expect(result.success).toBe(false);
      expect(result.requiresConfirmation).toBe(true);
      expect(result.message).toContain('destructive');
    });

    it('should require confirmation for UPDATE queries', async () => {
      const result = await postgresUtil.executeQuery('test', 'UPDATE users SET active = false');
      expect(result.success).toBe(false);
      expect(result.requiresConfirmation).toBe(true);
    });

    it('should require confirmation for DROP queries', async () => {
      const result = await postgresUtil.executeQuery('test', 'DROP TABLE users');
      expect(result.success).toBe(false);
      expect(result.requiresConfirmation).toBe(true);
    });

    it('should require confirmation for TRUNCATE queries', async () => {
      const result = await postgresUtil.executeQuery('test', 'TRUNCATE TABLE logs');
      expect(result.success).toBe(false);
      expect(result.requiresConfirmation).toBe(true);
    });

    it('should require confirmation for ALTER queries', async () => {
      const result = await postgresUtil.executeQuery('test', 'ALTER TABLE users ADD COLUMN email VARCHAR(255)');
      expect(result.success).toBe(false);
      expect(result.requiresConfirmation).toBe(true);
    });
  });

  describe('closeAll', () => {
    it('should close all database connections', async () => {
      await postgresUtil.closeAll();
      // Should not throw
      expect(true).toBe(true);
    });

    it('should be safe to call multiple times', async () => {
      await postgresUtil.closeAll();
      await postgresUtil.closeAll();
      expect(true).toBe(true);
    });
  });

  describe('interface compliance', () => {
    it('should have all required methods', () => {
      expect(typeof postgresUtil.executeQuery).toBe('function');
      expect(typeof postgresUtil.listDatabases).toBe('function');
      expect(typeof postgresUtil.listTables).toBe('function');
      expect(typeof postgresUtil.describeTable).toBe('function');
      expect(typeof postgresUtil.showIndexes).toBe('function');
      expect(typeof postgresUtil.explainQuery).toBe('function');
      expect(typeof postgresUtil.testConnection).toBe('function');
      expect(typeof postgresUtil.closeAll).toBe('function');
    });
  });
});
