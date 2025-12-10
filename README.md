# MySQL/PostgreSQL CLI

[![npm mysqldb-cli package](https://img.shields.io/npm/v/mysqldb-cli.svg)](https://npmjs.org/package/mysqldb-cli)

A powerful command-line interface for MySQL and PostgreSQL database interaction with built-in safety features and multiple output formats.

## Features

- 🗄️ **Multi-database support**: Works with both MySQL and PostgreSQL
- 💻 **Interactive REPL** for database exploration and queries
- 🚀 **Headless mode** for one-off command execution
- 🔐 **Multi-profile support** for managing different database connections
- 📊 **Multiple output formats**: table, JSON, CSV or TOON
- 🛡️ **Safety features** for destructive operations (DELETE, UPDATE, DROP, etc.)
- 🔧 **Database introspection** tools (list databases/tables, describe schema, show indexes)
- ⚡ **Query execution** with EXPLAIN support
- ✅ **Connection testing** for quick diagnostics

## Requirements

- [Node.js](https://nodejs.org/) v22.0 or newer
- [npm](https://www.npmjs.com/)
- MySQL 5.7+ / MySQL 8.0+ or PostgreSQL 12+

## Installation

```bash
npm install -g mysqldb-cli
```

## Configuration

Create a configuration file at `.claude/mysql-connector.local.md` in your project root:

```markdown
---
profiles:
  local:
    type: mysql
    host: localhost
    port: 3306
    user: root
    password: password
    database: mydb

  postgres_local:
    type: postgresql
    host: localhost
    port: 5432
    user: postgres
    password: password
    database: mydb
    schema: public

  production:
    type: mysql
    host: prod.example.com
    port: 3306
    user: app_user
    password: secure_password
    database: production_db
    ssl: true

safety:
  default_limit: 100
  require_confirmation_for:
    - DELETE
    - UPDATE
    - DROP
    - TRUNCATE
    - ALTER
  blacklisted_operations:
    - DROP DATABASE

defaultProfile: local
defaultFormat: table
---

# Database Connection Profiles

This file stores your MySQL and PostgreSQL database connection profiles.
```

### Configuration Options

- **profiles**: Named database connection profiles
  - `type`: Database type - `mysql` or `postgresql` (optional, defaults to `mysql` for backward compatibility)
  - `host`: Database server hostname or IP
  - `port`: Database port (MySQL: 3306, PostgreSQL: 5432)
  - `user`: Database username
  - `password`: Database password
  - `database`: Default database name
  - `ssl`: Enable SSL connection (optional)
  - `schema`: PostgreSQL schema name (optional, defaults to `public`, PostgreSQL only)

- **safety**: Query safety settings
  - `default_limit`: Default row limit for SELECT queries
  - `require_confirmation_for`: Operations requiring confirmation in interactive mode
  - `blacklisted_operations`: Completely blocked operations

- **defaultProfile**: Profile name to use when none specified
- **defaultFormat**: Default output format (`table`, `json`, `csv` or `toon`)

## Quick Start

### Interactive Mode

Start the CLI and interact with your database through a REPL:

```bash
npx mysqldb-cli
```

Once started, you'll see the `sql>` (or `postgres>` for PostgreSQL profiles) prompt:

```
MySQL CLI v1.0.0
Connected to profile: local

Usage:

commands         list all available commands
<command> -h     quick help on <command>
<command> <arg>  run <command> with argument
clear            clear the screen
exit, quit, q    exit the CLI

sql> commands
Available commands:
  query              Execute a SQL query
  list-databases     List all databases
  list-tables        List all tables in current database
  describe-table     Describe table structure
  show-indexes       Show table indexes
  explain-query      Explain query execution plan
  test-connection    Test database connection

sql> list-tables
Tables in database 'mydb':
  - users
  - posts
  - comments

sql> describe-table '{"table":"users"}'
Table: users
┌────────────┬──────────────┬──────┬─────┬─────────┬──────────────────┐
│ Field      │ Type         │ Null │ Key │ Default │ Extra            │
├────────────┼──────────────┼──────┼─────┼─────────┼──────────────────┤
│ id         │ int          │ NO   │ PRI │ NULL    │ auto_increment   │
│ username   │ varchar(50)  │ NO   │ UNI │ NULL    │                  │
│ email      │ varchar(100) │ NO   │ UNI │ NULL    │                  │
│ created_at │ timestamp    │ YES  │     │ NULL    │                  │
└────────────┴──────────────┴──────┴─────┴─────────┴──────────────────┘

sql> query '{"query":"SELECT * FROM users LIMIT 5"}'
┌────┬──────────┬────────────────────┬─────────────────────┐
│ id │ username │ email              │ created_at          │
├────┼──────────┼────────────────────┼─────────────────────┤
│ 1  │ alice    │ alice@example.com  │ 2025-01-15 10:30:00 │
│ 2  │ bob      │ bob@example.com    │ 2025-01-16 14:20:00 │
│ 3  │ charlie  │ charlie@example.com│ 2025-01-17 09:15:00 │
└────┴──────────┴────────────────────┴─────────────────────┘

sql> exit
```

### Headless Mode

Execute single commands without starting the interactive REPL:

```bash
# General format
npx mysqldb-cli <command> '<json_arguments>'

# Examples
npx mysqldb-cli test-connection '{"profile":"local"}'
npx mysqldb-cli list-databases
npx mysqldb-cli list-tables '{"profile":"production"}'
npx mysqldb-cli describe-table '{"table":"users"}'
npx mysqldb-cli query '{"query":"SELECT COUNT(*) FROM users","format":"json"}'
npx mysqldb-cli explain-query '{"query":"SELECT * FROM users WHERE id = 1"}'
```

### Command Line Options

```bash
# Show version
npx mysqldb-cli --version
npx mysqldb-cli -v

# List all commands
npx mysqldb-cli --commands

# Get help for specific command
npx mysqldb-cli query -h
npx mysqldb-cli describe-table -h

# General help
npx mysqldb-cli --help
npx mysqldb-cli -h
```

## Available Commands

The CLI provides **7 database commands** that work with both MySQL and PostgreSQL:

### query

Execute a SQL query on the database.

**Parameters:**

- `query` (required): string - SQL query to execute
- `profile` (optional): string - Database profile name (default: configured default profile)
- `format` (optional): string - Output format: `table`, `json`, `csv` or `toon` (default: `table`)

**Examples:**

```bash
# Interactive mode
sql> query '{"query":"SELECT * FROM users LIMIT 10"}'
sql> query '{"query":"SELECT * FROM users","format":"json"}'
sql> query '{"query":"SELECT * FROM users","profile":"production","format":"csv"}'

# Headless mode
npx mysqldb-cli query '{"query":"SELECT * FROM users LIMIT 10"}'
npx mysqldb-cli query '{"query":"SELECT COUNT(*) FROM posts","format":"json"}'
```

### list-databases

List all databases accessible with the current credentials.

**Parameters:**

- `profile` (optional): string - Database profile name (default: configured default profile)

**Examples:**

```bash
# Interactive mode
sql> list-databases
sql> list-databases '{"profile":"production"}'

# Headless mode
npx mysqldb-cli list-databases
npx mysqldb-cli list-databases '{"profile":"production"}'
```

### list-tables

List all tables in the current database.

**Parameters:**

- `profile` (optional): string - Database profile name (default: configured default profile)

**Examples:**

```bash
# Interactive mode
sql> list-tables
sql> list-tables '{"profile":"local"}'

# Headless mode
npx mysqldb-cli list-tables
npx mysqldb-cli list-tables '{"profile":"production"}'
```

### describe-table

Show the structure of a specific table (columns, types, keys, etc.).

**Parameters:**

- `table` (required): string - Table name to describe
- `profile` (optional): string - Database profile name (default: configured default profile)
- `format` (optional): string - Output format: `table`, `json`, or `toon` (default: `table`)

**Examples:**

```bash
# Interactive mode
sql> describe-table '{"table":"users","format":"json"}'
sql> describe-table '{"table":"posts","profile":"production"}'

# Headless mode
npx mysqldb-cli describe-table '{"table":"users","format":"toon"}'
npx mysqldb-cli describe-table '{"table":"orders","profile":"production"}'
```

### show-indexes

Display all indexes for a specific table.

**Parameters:**

- `table` (required): string - Table name to show indexes for
- `profile` (optional): string - Database profile name (default: configured default profile)
- `format` (optional): string - Output format: `table`, `json`, or `toon` (default: `table`)

**Examples:**

```bash
# Interactive mode
sql> show-indexes '{"table":"users","format":"json"}'
sql> show-indexes '{"table":"posts","profile":"local"}'

# Headless mode
npx mysqldb-cli show-indexes '{"table":"users","format":"toon"}'
npx mysqldb-cli show-indexes '{"table":"orders","profile":"production"}'
```

### explain-query

Show the execution plan for a SQL query (useful for performance optimization).

**Parameters:**

- `query` (required): string - SQL query to explain
- `profile` (optional): string - Database profile name (default: configured default profile)
- `format` (optional): string - Output format: `table`, `json`, or `toon` (default: `table`)

**Examples:**

```bash
# Interactive mode
sql> explain-query '{"query":"SELECT * FROM users WHERE email = 'alice@example.com'","format":"json"}'
sql> explain-query '{"query":"SELECT u.*, p.* FROM users u JOIN posts p ON u.id = p.user_id"}'

# Headless mode
npx mysqldb-cli explain-query '{"query":"SELECT * FROM users WHERE id = 1","format":"toon"}'
npx mysqldb-cli explain-query '{"query":"SELECT * FROM orders WHERE created_at > NOW() - INTERVAL 7 DAY"}'
```

### test-connection

Test the connection to a specific database profile.

**Parameters:**

- `profile` (optional): string - Database profile name (default: configured default profile)

**Examples:**

```bash
# Interactive mode
sql> test-connection
sql> test-connection '{"profile":"production"}'

# Headless mode
npx mysqldb-cli test-connection
npx mysqldb-cli test-connection '{"profile":"production"}'
```

## Output Formats

### Table Format (default)

Human-readable table output with aligned columns:

```
┌────┬──────────┬───────────────────┐
│ id │ username │ email             │
├────┼──────────┼───────────────────┤
│ 1  │ alice    │ alice@example.com │
└────┴──────────┴───────────────────┘
```

### JSON Format

Machine-readable JSON output:

```json
{
  "success": true,
  "result": [
    {
      "id": 1,
      "username": "alice",
      "email": "alice@example.com"
    }
  ],
  "rowCount": 1
}
```

### CSV Format

Comma-separated values for spreadsheet import:

```csv
id,username,email
1,alice,alice@example.com
2,bob,bob@example.com
```

## Safety Features

The CLI includes built-in safety features to prevent accidental data loss across both MySQL and PostgreSQL:

1. **Confirmation Required**: Destructive operations (DELETE, UPDATE, DROP, TRUNCATE, ALTER) require confirmation in interactive mode
2. **Blacklisted Operations**: Certain dangerous operations (like DROP DATABASE) are completely blocked
3. **No Multiple Statements**: Prevents SQL injection via multiple statement execution (MySQL)
4. **Connection Timeout**: 10-second timeout prevents hanging connections
5. **Query Validation**: Validates queries before execution
6. **Default Row Limits**: Automatically applies LIMIT clauses to unbounded SELECT queries

## Use Cases

### Database Exploration

```bash
# Start the CLI
npx mysqldb-cli

# Explore the database
sql> list-databases
sql> list-tables
sql> describe-table '{"table":"users"}'
sql> show-indexes '{"table":"users"}'
```

### Quick Queries

```bash
# Check user count
npx mysqldb-cli query '{"query":"SELECT COUNT(*) as total FROM users"}'

# Get recent orders
npx mysqldb-cli query '{"query":"SELECT * FROM orders ORDER BY created_at DESC LIMIT 10"}'

# Export data as JSON
npx mysqldb-cli query '{"query":"SELECT * FROM products","format":"json"}' > products.json
```

### Query Optimization

```bash
# Analyze query performance
sql> explain-query '{"query":"SELECT * FROM users WHERE email = 'test@example.com'"}'

# Check if indexes are being used
sql> show-indexes '{"table":"users"}'
```

### Multi-Environment Management

```bash
# Test production connection
npx mysqldb-cli test-connection '{"profile":"production"}'

# Compare table structures across different databases
npx mysqldb-cli describe-table '{"table":"users","profile":"local"}'
npx mysqldb-cli describe-table '{"table":"users","profile":"postgres_local"}'

# Check production data
npx mysqldb-cli query '{"query":"SELECT COUNT(*) FROM users","profile":"production"}'

# Work with PostgreSQL schemas
npx mysqldb-cli list-tables '{"profile":"postgres_local"}'
```

## Development

See [CLAUDE.md](./CLAUDE.md) for detailed development instructions.

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Run tests
npm test
npm run test:watch
npm run test:coverage

# Format code
npm run format
```

## License

Apache-2.0
