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

    it('should convert Date objects to ISO strings', () => {
      const testDate = new Date('2023-01-15T10:30:00.000Z');
      const rows: RowDataPacket[] = [{ id: 1, name: 'Alice', created_at: testDate }] as RowDataPacket[];

      const result = mysqlUtil.formatAsToon(rows);

      // Should contain the ISO string representation
      expect(result).toContain('2023-01-15T10:30:00.000Z');
    });

    it('should handle multiple Date objects in different rows', () => {
      const date1 = new Date('2023-01-15T10:30:00.000Z');
      const date2 = new Date('2024-06-20T15:45:30.000Z');
      const rows: RowDataPacket[] = [
        { id: 1, name: 'Alice', created_at: date1, updated_at: date1 },
        { id: 2, name: 'Bob', created_at: date2, updated_at: date2 },
      ] as RowDataPacket[];

      const result = mysqlUtil.formatAsToon(rows);

      expect(result).toContain('2023-01-15T10:30:00.000Z');
      expect(result).toContain('2024-06-20T15:45:30.000Z');
    });

    it('should convert invalid Date objects to null', () => {
      const invalidDate = new Date('invalid');
      const rows: RowDataPacket[] = [{ id: 1, name: 'Alice', created_at: invalidDate }] as RowDataPacket[];

      const result = mysqlUtil.formatAsToon(rows);

      // Should contain null for invalid date
      expect(result).toContain('null');
      // Should not throw an error
      expect(typeof result).toBe('string');
    });

    it('should convert Buffer objects to base64 strings', () => {
      const buffer = Buffer.from('Hello World');
      const rows: RowDataPacket[] = [{ id: 1, name: 'Alice', encrypted_data: buffer }] as RowDataPacket[];

      const result = mysqlUtil.formatAsToon(rows);

      // Should contain the base64 representation
      const expectedBase64 = buffer.toString('base64');
      expect(result).toContain(expectedBase64);
    });

    it('should handle Buffer objects with binary data', () => {
      const buffer = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello" in hex
      const rows: RowDataPacket[] = [{ id: 1, binary_field: buffer }] as RowDataPacket[];

      const result = mysqlUtil.formatAsToon(rows);

      const expectedBase64 = buffer.toString('base64');
      expect(result).toContain(expectedBase64);
    });

    it('should handle mixed Date, Buffer, and regular values', () => {
      const testDate = new Date('2023-01-15T10:30:00.000Z');
      const buffer = Buffer.from('encrypted');
      const rows: RowDataPacket[] = [
        {
          id: 1,
          name: 'Alice',
          email: 'alice@example.com',
          created_at: testDate,
          encrypted_field: buffer,
          is_active: true,
          age: 30,
        },
      ] as RowDataPacket[];

      const result = mysqlUtil.formatAsToon(rows);

      // Should contain all data types properly serialized
      expect(result).toContain('Alice');
      expect(result).toContain('alice@example.com');
      expect(result).toContain('2023-01-15T10:30:00.000Z');
      expect(result).toContain(buffer.toString('base64'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle rows with Date and null values together', () => {
      const testDate = new Date('2023-01-15T10:30:00.000Z');
      const rows: RowDataPacket[] = [
        { id: 1, name: 'Alice', created_at: testDate, deleted_at: null },
        { id: 2, name: 'Bob', created_at: null, deleted_at: testDate },
      ] as RowDataPacket[];

      const result = mysqlUtil.formatAsToon(rows);

      expect(result).toContain('2023-01-15T10:30:00.000Z');
      expect(result).toContain('null');
    });

    it('should handle empty Buffer objects', () => {
      const emptyBuffer = Buffer.from('');
      const rows: RowDataPacket[] = [{ id: 1, name: 'Alice', data: emptyBuffer }] as RowDataPacket[];

      const result = mysqlUtil.formatAsToon(rows);

      // Empty buffer should produce empty base64 string
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should preserve other data types unchanged', () => {
      const rows: RowDataPacket[] = [
        {
          id: 1,
          name: 'Alice',
          age: 30,
          is_active: true,
          balance: 123.45,
          metadata: { key: 'value' },
        },
      ] as RowDataPacket[];

      const result = mysqlUtil.formatAsToon(rows);

      // Should successfully format without errors
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
