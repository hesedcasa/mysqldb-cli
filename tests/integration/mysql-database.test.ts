import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  closeConnections,
  describeTable,
  executeQuery,
  explainQuery,
  listDatabases,
  listTables,
  showIndexes,
  testConnection,
} from '../../src/utils/mysql-database.js';

// Mock the config-loader module
vi.mock('../../src/utils/config-loader.js', () => ({
  loadConfig: vi.fn(() => ({
    profiles: {
      test: {
        host: 'localhost',
        port: 3306,
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
    defaultFormat: 'table' as const,
  })),
}));

describe('mysql-database (integration)', () => {
  afterEach(async () => {
    // Close connections after each test
    await closeConnections();
  });

  describe('executeQuery', () => {
    it('should reject blacklisted operations', async () => {
      const result = await executeQuery('DROP DATABASE production', 'test', 'table');

      expect(result.success).toBe(false);
      expect(result.error).toContain('blacklisted');
    });

    it('should require confirmation for DELETE queries', async () => {
      const result = await executeQuery('DELETE FROM users', 'test', 'table');

      expect(result.success).toBe(false);
      expect(result.requiresConfirmation).toBe(true);
      expect(result.message).toContain('destructive');
    });

    it('should require confirmation for UPDATE queries', async () => {
      const result = await executeQuery('UPDATE users SET active = 0', 'test', 'table');

      expect(result.success).toBe(false);
      expect(result.requiresConfirmation).toBe(true);
    });

    it('should require confirmation for DROP queries', async () => {
      const result = await executeQuery('DROP TABLE users', 'test', 'table');

      expect(result.success).toBe(false);
      expect(result.requiresConfirmation).toBe(true);
    });

    it('should require confirmation for TRUNCATE queries', async () => {
      const result = await executeQuery('TRUNCATE TABLE logs', 'test', 'table');

      expect(result.success).toBe(false);
      expect(result.requiresConfirmation).toBe(true);
    });

    it('should require confirmation for ALTER queries', async () => {
      const result = await executeQuery('ALTER TABLE users ADD COLUMN email VARCHAR(255)', 'test', 'table');

      expect(result.success).toBe(false);
      expect(result.requiresConfirmation).toBe(true);
    });
  });

  describe('closeConnections', () => {
    it('should close all database connections', async () => {
      // This test mainly verifies the function doesn't throw
      await closeConnections();
      await closeConnections(); // Should be safe to call multiple times

      expect(true).toBe(true);
    });
  });

  describe('Function exports', () => {
    it('should export all required functions', () => {
      expect(typeof executeQuery).toBe('function');
      expect(typeof listDatabases).toBe('function');
      expect(typeof listTables).toBe('function');
      expect(typeof describeTable).toBe('function');
      expect(typeof showIndexes).toBe('function');
      expect(typeof explainQuery).toBe('function');
      expect(typeof testConnection).toBe('function');
      expect(typeof closeConnections).toBe('function');
    });
  });

  describe('Error handling', () => {
    it('should handle validation correctly', async () => {
      // Test that validation errors are properly formatted
      const result = await executeQuery('DROP DATABASE production', 'test', 'table');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('blacklisted');
    });
  });
});
