import { describe, expect, it } from 'vitest';

import {
  analyzeQuery,
  applyDefaultLimit,
  checkBlacklist,
  getQueryType,
  requiresConfirmation,
} from '../../../src/utils/query-validator.js';

describe('query-validator', () => {
  describe('checkBlacklist', () => {
    it('should allow queries without blacklisted operations', () => {
      const result = checkBlacklist('SELECT * FROM users', ['DROP DATABASE']);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should block queries with blacklisted operations', () => {
      const result = checkBlacklist('DROP DATABASE production', ['DROP DATABASE']);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Operation "DROP DATABASE" is blacklisted and not allowed');
    });

    it('should be case insensitive', () => {
      const result = checkBlacklist('drop database test', ['DROP DATABASE']);
      expect(result.allowed).toBe(false);
    });

    it('should handle multiple blacklisted operations', () => {
      const blacklist = ['DROP DATABASE', 'DROP TABLE', 'TRUNCATE'];

      expect(checkBlacklist('DROP TABLE users', blacklist).allowed).toBe(false);
      expect(checkBlacklist('TRUNCATE logs', blacklist).allowed).toBe(false);
      expect(checkBlacklist('SELECT * FROM users', blacklist).allowed).toBe(true);
    });

    it('should trim whitespace before checking', () => {
      const result = checkBlacklist('  DROP DATABASE test  ', ['DROP DATABASE']);
      expect(result.allowed).toBe(false);
    });
  });

  describe('requiresConfirmation', () => {
    it('should not require confirmation for safe queries', () => {
      const result = requiresConfirmation('SELECT * FROM users', ['DELETE', 'UPDATE', 'DROP']);
      expect(result.required).toBe(false);
      expect(result.message).toBeUndefined();
    });

    it('should require confirmation for DELETE queries', () => {
      const result = requiresConfirmation('DELETE FROM users WHERE id = 1', ['DELETE']);
      expect(result.required).toBe(true);
      expect(result.message).toBe('This query contains a destructive operation: DELETE');
    });

    it('should require confirmation for UPDATE queries', () => {
      const result = requiresConfirmation('UPDATE users SET active = 0', ['UPDATE']);
      expect(result.required).toBe(true);
    });

    it('should require confirmation when operation is in middle of query', () => {
      const result = requiresConfirmation('SELECT * FROM users WHERE DELETE IS NOT NULL', ['DELETE']);
      expect(result.required).toBe(true);
    });

    it('should be case insensitive', () => {
      const result = requiresConfirmation('delete from users', ['DELETE']);
      expect(result.required).toBe(true);
    });

    it('should handle multiple confirmation operations', () => {
      const confirmOps = ['DELETE', 'UPDATE', 'DROP', 'TRUNCATE'];

      expect(requiresConfirmation('DELETE FROM users', confirmOps).required).toBe(true);
      expect(requiresConfirmation('UPDATE users SET name = "test"', confirmOps).required).toBe(true);
      expect(requiresConfirmation('DROP TABLE users', confirmOps).required).toBe(true);
      expect(requiresConfirmation('TRUNCATE TABLE logs', confirmOps).required).toBe(true);
    });
  });

  describe('getQueryType', () => {
    it('should identify SELECT queries', () => {
      expect(getQueryType('SELECT * FROM users')).toBe('SELECT');
      expect(getQueryType('  select id from users  ')).toBe('SELECT');
    });

    it('should identify INSERT queries', () => {
      expect(getQueryType('INSERT INTO users VALUES (1, "test")')).toBe('INSERT');
    });

    it('should identify UPDATE queries', () => {
      expect(getQueryType('UPDATE users SET name = "test"')).toBe('UPDATE');
    });

    it('should identify DELETE queries', () => {
      expect(getQueryType('DELETE FROM users WHERE id = 1')).toBe('DELETE');
    });

    it('should identify DROP queries', () => {
      expect(getQueryType('DROP TABLE users')).toBe('DROP');
    });

    it('should identify CREATE queries', () => {
      expect(getQueryType('CREATE TABLE users (id INT)')).toBe('CREATE');
    });

    it('should identify ALTER queries', () => {
      expect(getQueryType('ALTER TABLE users ADD COLUMN email VARCHAR(255)')).toBe('ALTER');
    });

    it('should identify TRUNCATE queries', () => {
      expect(getQueryType('TRUNCATE TABLE logs')).toBe('TRUNCATE');
    });

    it('should identify SHOW queries', () => {
      expect(getQueryType('SHOW TABLES')).toBe('SHOW');
    });

    it('should identify DESCRIBE queries', () => {
      expect(getQueryType('DESCRIBE users')).toBe('DESCRIBE');
    });

    it('should identify EXPLAIN queries', () => {
      expect(getQueryType('EXPLAIN SELECT * FROM users')).toBe('EXPLAIN');
    });

    it('should return UNKNOWN for unrecognized queries', () => {
      expect(getQueryType('INVALID QUERY')).toBe('UNKNOWN');
      expect(getQueryType('')).toBe('UNKNOWN');
    });

    it('should handle queries with extra whitespace', () => {
      expect(getQueryType('  SELECT  *  FROM  users  ')).toBe('SELECT');
    });
  });

  describe('analyzeQuery', () => {
    it('should warn about missing WHERE in UPDATE', () => {
      const warnings = analyzeQuery('UPDATE users SET active = 0');
      expect(warnings).toHaveLength(1);
      expect(warnings[0].level).toBe('warning');
      expect(warnings[0].message).toContain('Missing WHERE clause');
    });

    it('should warn about missing WHERE in DELETE', () => {
      const warnings = analyzeQuery('DELETE FROM users');
      expect(warnings).toHaveLength(1);
      expect(warnings[0].level).toBe('warning');
      expect(warnings[0].message).toContain('Missing WHERE clause');
    });

    it('should not warn about UPDATE with WHERE', () => {
      const warnings = analyzeQuery('UPDATE users SET active = 0 WHERE id = 1');
      const whereWarnings = warnings.filter(w => w.message.includes('WHERE'));
      expect(whereWarnings).toHaveLength(0);
    });

    it('should not warn about DELETE with WHERE', () => {
      const warnings = analyzeQuery('DELETE FROM users WHERE id = 1');
      const whereWarnings = warnings.filter(w => w.message.includes('WHERE'));
      expect(whereWarnings).toHaveLength(0);
    });

    it('should provide info about SELECT *', () => {
      const warnings = analyzeQuery('SELECT * FROM users');
      const selectStarWarning = warnings.find(w => w.message.includes('SELECT *'));
      expect(selectStarWarning).toBeDefined();
      expect(selectStarWarning?.level).toBe('info');
    });

    it('should not warn about SELECT with specific columns', () => {
      const warnings = analyzeQuery('SELECT id, name FROM users');
      const selectStarWarning = warnings.find(w => w.message.includes('SELECT *'));
      expect(selectStarWarning).toBeUndefined();
    });

    it('should provide info about missing LIMIT in SELECT', () => {
      const warnings = analyzeQuery('SELECT * FROM users');
      const limitWarning = warnings.find(w => w.message.includes('LIMIT'));
      expect(limitWarning).toBeDefined();
      expect(limitWarning?.level).toBe('info');
    });

    it('should not warn about SELECT with LIMIT', () => {
      const warnings = analyzeQuery('SELECT * FROM users LIMIT 10');
      const limitWarning = warnings.find(w => w.message.includes('LIMIT'));
      expect(limitWarning).toBeUndefined();
    });

    it('should return multiple warnings for problematic queries', () => {
      const warnings = analyzeQuery('SELECT * FROM users');
      expect(warnings.length).toBeGreaterThan(0);
      // Should have warnings for SELECT * and missing LIMIT
      expect(warnings.some(w => w.message.includes('SELECT *'))).toBe(true);
      expect(warnings.some(w => w.message.includes('LIMIT'))).toBe(true);
    });

    it('should return empty array for safe queries', () => {
      const warnings = analyzeQuery('SELECT id, name FROM users WHERE active = 1 LIMIT 10');
      expect(warnings).toHaveLength(0);
    });

    it('should include suggestions in warnings', () => {
      const warnings = analyzeQuery('UPDATE users SET active = 0');
      expect(warnings[0].suggestion).toBeDefined();
      expect(warnings[0].suggestion.length).toBeGreaterThan(0);
    });
  });

  describe('applyDefaultLimit', () => {
    it('should add LIMIT to SELECT queries without one', () => {
      const result = applyDefaultLimit('SELECT * FROM users', 100);
      expect(result).toBe('SELECT * FROM users LIMIT 100');
    });

    it('should not modify SELECT queries with existing LIMIT', () => {
      const query = 'SELECT * FROM users LIMIT 50';
      const result = applyDefaultLimit(query, 100);
      expect(result).toBe(query);
    });

    it('should not modify non-SELECT queries', () => {
      const queries = [
        'INSERT INTO users VALUES (1, "test")',
        'UPDATE users SET name = "test"',
        'DELETE FROM users WHERE id = 1',
        'CREATE TABLE users (id INT)',
      ];

      queries.forEach(query => {
        const result = applyDefaultLimit(query, 100);
        expect(result).toBe(query);
      });
    });

    it('should handle queries with extra whitespace', () => {
      const result = applyDefaultLimit('  SELECT * FROM users  ', 100);
      expect(result).toBe('SELECT * FROM users LIMIT 100');
    });

    it('should be case insensitive for SELECT detection', () => {
      const result = applyDefaultLimit('select * from users', 100);
      expect(result).toBe('select * from users LIMIT 100');
    });

    it('should be case insensitive for LIMIT detection', () => {
      const query = 'SELECT * FROM users limit 50';
      const result = applyDefaultLimit(query, 100);
      expect(result).toBe(query);
    });

    it('should use the specified default limit value', () => {
      expect(applyDefaultLimit('SELECT * FROM users', 50)).toBe('SELECT * FROM users LIMIT 50');
      expect(applyDefaultLimit('SELECT * FROM users', 200)).toBe('SELECT * FROM users LIMIT 200');
      expect(applyDefaultLimit('SELECT * FROM users', 1)).toBe('SELECT * FROM users LIMIT 1');
    });
  });
});
