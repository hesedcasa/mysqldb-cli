import type { FieldPacket, RowDataPacket } from 'mysql2/promise';
import { beforeEach, describe, expect, it } from 'vitest';

import type { Config } from '../../../src/utils/config-loader.js';
import { MySQLUtil } from '../../../src/utils/mysql-utils.js';

describe('MySQLUtil', () => {
  let mockConfig: Config;
  let mysqlUtil: MySQLUtil;

  beforeEach(() => {
    mockConfig = {
      profiles: {
        test: {
          host: 'localhost',
          port: 3306,
          user: 'testuser',
          password: 'testpass',
          database: 'testdb',
          ssl: false,
        },
        secure: {
          host: 'secure.example.com',
          port: 3307,
          user: 'secureuser',
          password: 'securepass',
          database: 'securedb',
          ssl: true,
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

    mysqlUtil = new MySQLUtil(mockConfig);
  });

  describe('formatAsTable', () => {
    it('should format simple rows as table', () => {
      const rows: RowDataPacket[] = [
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' },
      ] as RowDataPacket[];

      const fields: FieldPacket[] = [
        { name: 'id' } as FieldPacket,
        { name: 'name' } as FieldPacket,
        { name: 'email' } as FieldPacket,
      ];

      const result = mysqlUtil.formatAsTable(rows, fields);

      expect(result).toContain('id');
      expect(result).toContain('name');
      expect(result).toContain('email');
      expect(result).toContain('Alice');
      expect(result).toContain('Bob');
      expect(result).toContain('alice@example.com');
      expect(result).toContain('bob@example.com');
      // Check for table borders
      expect(result).toContain('┌');
      expect(result).toContain('┐');
      expect(result).toContain('└');
      expect(result).toContain('┘');
      expect(result).toContain('│');
      expect(result).toContain('─');
    });

    it('should handle NULL values', () => {
      const rows: RowDataPacket[] = [{ id: 1, name: 'Alice', email: null }] as RowDataPacket[];

      const fields: FieldPacket[] = [
        { name: 'id' } as FieldPacket,
        { name: 'name' } as FieldPacket,
        { name: 'email' } as FieldPacket,
      ];

      const result = mysqlUtil.formatAsTable(rows, fields);

      expect(result).toContain('NULL');
    });

    it('should return "No results" for empty result set', () => {
      const rows: RowDataPacket[] = [];
      const fields: FieldPacket[] = [];

      const result = mysqlUtil.formatAsTable(rows, fields);

      expect(result).toBe('No results');
    });

    it('should handle varying column widths', () => {
      const rows: RowDataPacket[] = [
        { id: 1, name: 'A', description: 'Short' },
        { id: 2, name: 'B', description: 'This is a much longer description' },
      ] as RowDataPacket[];

      const fields: FieldPacket[] = [
        { name: 'id' } as FieldPacket,
        { name: 'name' } as FieldPacket,
        { name: 'description' } as FieldPacket,
      ];

      const result = mysqlUtil.formatAsTable(rows, fields);

      expect(result).toContain('This is a much longer description');
      expect(result).toContain('Short');
    });
  });

  describe('formatAsJson', () => {
    it('should format rows as JSON', () => {
      const rows: RowDataPacket[] = [
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' },
      ] as RowDataPacket[];

      const result = mysqlUtil.formatAsJson(rows);

      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].id).toBe(1);
      expect(parsed[0].name).toBe('Alice');
      expect(parsed[1].name).toBe('Bob');
    });

    it('should format empty array as empty JSON array', () => {
      const rows: RowDataPacket[] = [];

      const result = mysqlUtil.formatAsJson(rows);

      expect(result).toBe('[]');
    });

    it('should handle NULL values in JSON', () => {
      const rows: RowDataPacket[] = [{ id: 1, name: 'Alice', email: null }] as RowDataPacket[];

      const result = mysqlUtil.formatAsJson(rows);

      const parsed = JSON.parse(result);
      expect(parsed[0].email).toBeNull();
    });
  });

  describe('formatAsCsv', () => {
    it('should format rows as CSV', () => {
      const rows: RowDataPacket[] = [
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' },
      ] as RowDataPacket[];

      const fields: FieldPacket[] = [
        { name: 'id' } as FieldPacket,
        { name: 'name' } as FieldPacket,
        { name: 'email' } as FieldPacket,
      ];

      const result = mysqlUtil.formatAsCsv(rows, fields);

      expect(result).toContain('id,name,email');
      expect(result).toContain('1,Alice,alice@example.com');
      expect(result).toContain('2,Bob,bob@example.com');
    });

    it('should escape commas in values', () => {
      const rows: RowDataPacket[] = [{ id: 1, name: 'Doe, John', email: 'john@example.com' }] as RowDataPacket[];

      const fields: FieldPacket[] = [
        { name: 'id' } as FieldPacket,
        { name: 'name' } as FieldPacket,
        { name: 'email' } as FieldPacket,
      ];

      const result = mysqlUtil.formatAsCsv(rows, fields);

      expect(result).toContain('"Doe, John"');
    });

    it('should escape quotes in values', () => {
      const rows: RowDataPacket[] = [
        { id: 1, name: 'John "Johnny" Doe', email: 'john@example.com' },
      ] as RowDataPacket[];

      const fields: FieldPacket[] = [
        { name: 'id' } as FieldPacket,
        { name: 'name' } as FieldPacket,
        { name: 'email' } as FieldPacket,
      ];

      const result = mysqlUtil.formatAsCsv(rows, fields);

      expect(result).toContain('"John ""Johnny"" Doe"');
    });

    it('should handle NULL values', () => {
      const rows: RowDataPacket[] = [{ id: 1, name: 'Alice', email: null }] as RowDataPacket[];

      const fields: FieldPacket[] = [
        { name: 'id' } as FieldPacket,
        { name: 'name' } as FieldPacket,
        { name: 'email' } as FieldPacket,
      ];

      const result = mysqlUtil.formatAsCsv(rows, fields);

      expect(result).toContain('1,Alice,');
    });

    it('should return empty string for empty result set', () => {
      const rows: RowDataPacket[] = [];
      const fields: FieldPacket[] = [];

      const result = mysqlUtil.formatAsCsv(rows, fields);

      expect(result).toBe('');
    });

    it('should escape newlines in values', () => {
      const rows: RowDataPacket[] = [{ id: 1, name: 'Alice', description: 'Line 1\nLine 2' }] as RowDataPacket[];

      const fields: FieldPacket[] = [
        { name: 'id' } as FieldPacket,
        { name: 'name' } as FieldPacket,
        { name: 'description' } as FieldPacket,
      ];

      const result = mysqlUtil.formatAsCsv(rows, fields);

      expect(result).toContain('"Line 1\nLine 2"');
    });
  });

  describe('formatAsToon', () => {
    it('should format rows as TOON', () => {
      const rows: RowDataPacket[] = [
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' },
      ] as RowDataPacket[];

      const result = mysqlUtil.formatAsToon(rows);

      // TOON format should be a string
      expect(typeof result).toBe('string');
      // Should contain some representation of the data
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return empty string for empty result set', () => {
      const rows: RowDataPacket[] = [];

      const result = mysqlUtil.formatAsToon(rows);

      expect(result).toBe('');
    });

    it('should handle NULL values in TOON', () => {
      const rows: RowDataPacket[] = [{ id: 1, name: 'Alice', email: null }] as RowDataPacket[];

      const result = mysqlUtil.formatAsToon(rows);

      // TOON should still produce output
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('executeQuery - validation', () => {
    it('should block blacklisted operations', async () => {
      const result = await mysqlUtil.executeQuery('test', 'DROP DATABASE production', 'table');

      expect(result.success).toBe(false);
      expect(result.error).toContain('blacklisted');
      expect(result.error).toContain('DROP DATABASE');
    });

    it('should require confirmation for destructive operations', async () => {
      const result = await mysqlUtil.executeQuery('test', 'DELETE FROM users', 'table');

      expect(result.success).toBe(false);
      expect(result.requiresConfirmation).toBe(true);
      expect(result.message).toContain('destructive');
    });

    it('should require confirmation for UPDATE operations', async () => {
      const result = await mysqlUtil.executeQuery('test', 'UPDATE users SET active = 0', 'table');

      expect(result.success).toBe(false);
      expect(result.requiresConfirmation).toBe(true);
    });

    it('should require confirmation for DROP operations', async () => {
      const result = await mysqlUtil.executeQuery('test', 'DROP TABLE users', 'table');

      expect(result.success).toBe(false);
      expect(result.requiresConfirmation).toBe(true);
    });

    it('should require confirmation for TRUNCATE operations', async () => {
      const result = await mysqlUtil.executeQuery('test', 'TRUNCATE TABLE logs', 'table');

      expect(result.success).toBe(false);
      expect(result.requiresConfirmation).toBe(true);
    });

    it('should require confirmation for ALTER operations', async () => {
      const result = await mysqlUtil.executeQuery('test', 'ALTER TABLE users ADD COLUMN email VARCHAR(255)', 'table');

      expect(result.success).toBe(false);
      expect(result.requiresConfirmation).toBe(true);
    });
  });
});
