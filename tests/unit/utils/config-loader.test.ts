import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getConnectionOptions, loadConfig } from '../../../src/utils/config-loader.js';
import type { Config } from '../../../src/utils/config-loader.js';

describe('config-loader', () => {
  let testDir: string;

  beforeEach(() => {
    // Create a temporary directory for test configs
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mysql-cli-test-'));
    fs.mkdirSync(path.join(testDir, '.claude'));
  });

  afterEach(() => {
    // Clean up test directory
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('loadConfig', () => {
    it('should load valid configuration file', () => {
      const configContent = `---
profiles:
  local:
    host: localhost
    port: 3306
    user: root
    password: secret
    database: testdb
  production:
    host: prod.example.com
    port: 3306
    user: produser
    password: prodpass
    database: proddb
    ssl: true
safety:
  default_limit: 50
  require_confirmation_for:
    - DELETE
    - UPDATE
    - DROP
  blacklisted_operations:
    - DROP DATABASE
defaultProfile: local
defaultFormat: table
---

# MySQL Connection Profiles
`;

      const configPath = path.join(testDir, '.claude', 'mysql-connector.local.md');
      fs.writeFileSync(configPath, configContent);

      const config = loadConfig(testDir);

      expect(config.profiles).toBeDefined();
      expect(config.profiles.local).toBeDefined();
      expect(config.profiles.local.host).toBe('localhost');
      expect(config.profiles.local.port).toBe(3306);
      expect(config.profiles.local.user).toBe('root');
      expect(config.profiles.local.password).toBe('secret');
      expect(config.profiles.local.database).toBe('testdb');

      expect(config.profiles.production).toBeDefined();
      expect(config.profiles.production.ssl).toBe(true);

      expect(config.safety.default_limit).toBe(50);
      expect(config.safety.require_confirmation_for).toContain('DELETE');
      expect(config.safety.blacklisted_operations).toContain('DROP DATABASE');

      expect(config.defaultProfile).toBe('local');
      expect(config.defaultFormat).toBe('table');
    });

    it('should throw error if config file does not exist', () => {
      expect(() => loadConfig(testDir)).toThrow('Configuration file not found');
    });

    it('should throw error if frontmatter is missing', () => {
      const configContent = `# MySQL Connection Profiles

This is just markdown content without frontmatter.
`;

      const configPath = path.join(testDir, '.claude', 'mysql-connector.local.md');
      fs.writeFileSync(configPath, configContent);

      expect(() => loadConfig(testDir)).toThrow('Invalid configuration file format');
    });

    it('should throw error if profiles are missing', () => {
      const configContent = `---
safety:
  default_limit: 100
---
`;

      const configPath = path.join(testDir, '.claude', 'mysql-connector.local.md');
      fs.writeFileSync(configPath, configContent);

      expect(() => loadConfig(testDir)).toThrow('Configuration must include "profiles" object');
    });

    it('should throw error if profile is missing required fields', () => {
      const configContent = `---
profiles:
  incomplete:
    host: localhost
    port: 3306
    user: root
    # Missing password and database
---
`;

      const configPath = path.join(testDir, '.claude', 'mysql-connector.local.md');
      fs.writeFileSync(configPath, configContent);

      expect(() => loadConfig(testDir)).toThrow('missing required field');
    });

    it('should use default safety config if not provided', () => {
      const configContent = `---
profiles:
  local:
    host: localhost
    port: 3306
    user: root
    password: secret
    database: testdb
---
`;

      const configPath = path.join(testDir, '.claude', 'mysql-connector.local.md');
      fs.writeFileSync(configPath, configContent);

      const config = loadConfig(testDir);

      expect(config.safety).toBeDefined();
      expect(config.safety.default_limit).toBe(100);
      expect(config.safety.require_confirmation_for).toContain('DELETE');
      expect(config.safety.require_confirmation_for).toContain('UPDATE');
      expect(config.safety.blacklisted_operations).toContain('DROP DATABASE');
    });

    it('should use first profile as default if defaultProfile not specified', () => {
      const configContent = `---
profiles:
  first:
    host: localhost
    port: 3306
    user: root
    password: secret
    database: testdb
  second:
    host: localhost
    port: 3307
    user: user2
    password: pass2
    database: db2
---
`;

      const configPath = path.join(testDir, '.claude', 'mysql-connector.local.md');
      fs.writeFileSync(configPath, configContent);

      const config = loadConfig(testDir);

      expect(config.defaultProfile).toBe('first');
    });

    it('should use table as default format if not specified', () => {
      const configContent = `---
profiles:
  local:
    host: localhost
    port: 3306
    user: root
    password: secret
    database: testdb
---
`;

      const configPath = path.join(testDir, '.claude', 'mysql-connector.local.md');
      fs.writeFileSync(configPath, configContent);

      const config = loadConfig(testDir);

      expect(config.defaultFormat).toBe('table');
    });

    it('should handle optional ssl field', () => {
      const configContent = `---
profiles:
  with_ssl:
    host: localhost
    port: 3306
    user: root
    password: secret
    database: testdb
    ssl: true
  without_ssl:
    host: localhost
    port: 3307
    user: root
    password: secret
    database: testdb
---
`;

      const configPath = path.join(testDir, '.claude', 'mysql-connector.local.md');
      fs.writeFileSync(configPath, configContent);

      const config = loadConfig(testDir);

      expect(config.profiles.with_ssl.ssl).toBe(true);
      expect(config.profiles.without_ssl.ssl).toBeUndefined();
    });
  });

  describe('getConnectionOptions', () => {
    let config: Config;

    beforeEach(() => {
      const configContent = `---
profiles:
  local:
    host: localhost
    port: 3306
    user: root
    password: secret
    database: testdb
  secure:
    host: secure.example.com
    port: 3307
    user: secureuser
    password: securepass
    database: securedb
    ssl: true
---
`;

      const configPath = path.join(testDir, '.claude', 'mysql-connector.local.md');
      fs.writeFileSync(configPath, configContent);

      config = loadConfig(testDir);
    });

    it('should return correct connection options for profile', () => {
      const options = getConnectionOptions(config, 'local');

      expect(options.host).toBe('localhost');
      expect(options.port).toBe(3306);
      expect(options.user).toBe('root');
      expect(options.password).toBe('secret');
      expect(options.database).toBe('testdb');
      expect(options.ssl).toBeUndefined();
      expect(options.connectTimeout).toBe(10000);
      expect(options.multipleStatements).toBe(false);
    });

    it('should handle ssl option correctly', () => {
      const options = getConnectionOptions(config, 'secure');

      expect(options.ssl).toEqual({});
    });

    it('should not include ssl if not specified in profile', () => {
      const options = getConnectionOptions(config, 'local');

      expect(options.ssl).toBeUndefined();
    });

    it('should throw error for non-existent profile', () => {
      expect(() => getConnectionOptions(config, 'nonexistent')).toThrow('Profile "nonexistent" not found');
    });

    it('should list available profiles in error message', () => {
      try {
        getConnectionOptions(config, 'nonexistent');
        expect.fail('Should have thrown error');
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        expect(errorMessage).toContain('Available profiles:');
        expect(errorMessage).toContain('local');
        expect(errorMessage).toContain('secure');
      }
    });

    it('should always set connectTimeout to 10000', () => {
      const options = getConnectionOptions(config, 'local');
      expect(options.connectTimeout).toBe(10000);
    });

    it('should always set multipleStatements to false for security', () => {
      const options = getConnectionOptions(config, 'local');
      expect(options.multipleStatements).toBe(false);
    });
  });
});
