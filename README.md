# MySQL CLI

[![npm mysqldb-cli package](https://img.shields.io/npm/v/mysqldb-cli.svg)](https://npmjs.org/package/mysqldb-cli)

A powerful command-line interface for MySQL database interaction with built-in safety features and multiple output formats.

## Features

- 💻 **Interactive REPL** for database exploration and queries
- 🚀 **Headless mode** for one-off command execution
- 🔐 **Multi-profile support** for managing different database connections
- 📊 **Multiple output formats**: table, JSON, or CSV
- 🛡️ **Safety features** for destructive operations (DELETE, UPDATE, DROP, etc.)
- 🔧 **Database introspection** tools (list databases/tables, describe schema, show indexes)
- ⚡ **Query execution** with EXPLAIN support
- ✅ **Connection testing** for quick diagnostics

## Requirements

- [Node.js](https://nodejs.org/) v22.0 or newer
- [npm](https://www.npmjs.com/)
- MySQL 5.7+ or MySQL 8.0+

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
    host: localhost
    port: 3306
    user: root
    password: password
    database: mydb

  production:
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

# MySQL Connection Profiles

This file stores your MySQL database connection profiles.
```

### Configuration Options

- **profiles**: Named database connection profiles
  - `host`: Database server hostname or IP
  - `port`: MySQL port (default: 3306)
  - `user`: Database username
  - `password`: Database password
  - `database`: Default database name
  - `ssl`: Enable SSL connection (optional)

- **safety**: Query safety settings
  - `default_limit`: Default row limit for SELECT queries
  - `require_confirmation_for`: Operations requiring confirmation in interactive mode
  - `blacklisted_operations`: Completely blocked operations

- **defaultProfile**: Profile name to use when none specified
- **defaultFormat**: Default output format (`table`, `json`, or `csv`)

## Quick Start

### Interactive Mode

Start the CLI and interact with MySQL through a REPL:

```bash
npx mysqldb-cli
```

Once started, you'll see the `mysql>` prompt:

```
MySQL CLI v1.0.0
Connected to profile: local

Usage:

commands         list all available commands
<command> -h     quick help on <command>
<command> <arg>  run <command> with argument
clear            clear the screen
exit, quit, q    exit the CLI

mysql> commands
Available commands:
  query              Execute a SQL query
  list-databases     List all databases
  list-tables        List all tables in current database
  describe-table     Describe table structure
  show-indexes       Show table indexes
  explain-query      Explain query execution plan
  test-connection    Test database connection

mysql> list-tables
Tables in database 'mydb':
  - users
  - posts
  - comments

mysql> describe-table '{"table":"users"}'
Table: users
┌────────────┬──────────────┬──────┬─────┬─────────┬──────────────────┐
│ Field      │ Type         │ Null │ Key │ Default │ Extra            │
├────────────┼──────────────┼──────┼─────┼─────────┼──────────────────┤
│ id         │ int          │ NO   │ PRI │ NULL    │ auto_increment   │
│ username   │ varchar(50)  │ NO   │ UNI │ NULL    │                  │
│ email      │ varchar(100) │ NO   │ UNI │ NULL    │                  │
│ created_at │ timestamp    │ YES  │     │ NULL    │                  │
└────────────┴──────────────┴──────┴─────┴─────────┴──────────────────┘

mysql> query '{"query":"SELECT * FROM users LIMIT 5"}'
┌────┬──────────┬────────────────────┬─────────────────────┐
│ id │ username │ email              │ created_at          │
├────┼──────────┼────────────────────┼─────────────────────┤
│ 1  │ alice    │ alice@example.com  │ 2025-01-15 10:30:00 │
│ 2  │ bob      │ bob@example.com    │ 2025-01-16 14:20:00 │
│ 3  │ charlie  │ charlie@example.com│ 2025-01-17 09:15:00 │
└────┴──────────┴────────────────────┴─────────────────────┘

mysql> exit
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

The CLI provides **7 MySQL database commands**:

### query

Execute a SQL query on the database.

**Parameters:**

- `query` (required): string - SQL query to execute
- `profile` (optional): string - Database profile name (default: configured default profile)
- `format` (optional): string - Output format: `table`, `json`, or `csv` (default: `table`)

**Examples:**

```bash
# Interactive mode
mysql> query '{"query":"SELECT * FROM users LIMIT 10"}'
mysql> query '{"query":"SELECT * FROM users","format":"json"}'
mysql> query '{"query":"SELECT * FROM users","profile":"production","format":"csv"}'

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
mysql> list-databases
mysql> list-databases '{"profile":"production"}'

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
mysql> list-tables
mysql> list-tables '{"profile":"local"}'

# Headless mode
npx mysqldb-cli list-tables
npx mysqldb-cli list-tables '{"profile":"production"}'
```

### describe-table

Show the structure of a specific table (columns, types, keys, etc.).

**Parameters:**

- `table` (required): string - Table name to describe
- `profile` (optional): string - Database profile name (default: configured default profile)

**Examples:**

```bash
# Interactive mode
mysql> describe-table '{"table":"users"}'
mysql> describe-table '{"table":"posts","profile":"production"}'

# Headless mode
npx mysqldb-cli describe-table '{"table":"users"}'
npx mysqldb-cli describe-table '{"table":"orders","profile":"production"}'
```

### show-indexes

Display all indexes for a specific table.

**Parameters:**

- `table` (required): string - Table name to show indexes for
- `profile` (optional): string - Database profile name (default: configured default profile)

**Examples:**

```bash
# Interactive mode
mysql> show-indexes '{"table":"users"}'
mysql> show-indexes '{"table":"posts","profile":"local"}'

# Headless mode
npx mysqldb-cli show-indexes '{"table":"users"}'
npx mysqldb-cli show-indexes '{"table":"orders","profile":"production"}'
```

### explain-query

Show the execution plan for a SQL query (useful for performance optimization).

**Parameters:**

- `query` (required): string - SQL query to explain
- `profile` (optional): string - Database profile name (default: configured default profile)

**Examples:**

```bash
# Interactive mode
mysql> explain-query '{"query":"SELECT * FROM users WHERE email = 'alice@example.com'"}'
mysql> explain-query '{"query":"SELECT u.*, p.* FROM users u JOIN posts p ON u.id = p.user_id"}'

# Headless mode
npx mysqldb-cli explain-query '{"query":"SELECT * FROM users WHERE id = 1"}'
npx mysqldb-cli explain-query '{"query":"SELECT * FROM orders WHERE created_at > NOW() - INTERVAL 7 DAY"}'
```

### test-connection

Test the connection to a specific database profile.

**Parameters:**

- `profile` (optional): string - Database profile name (default: configured default profile)

**Examples:**

```bash
# Interactive mode
mysql> test-connection
mysql> test-connection '{"profile":"production"}'

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

The CLI includes built-in safety features to prevent accidental data loss:

1. **Confirmation Required**: Destructive operations (DELETE, UPDATE, DROP, TRUNCATE, ALTER) require confirmation in interactive mode
2. **Blacklisted Operations**: Certain dangerous operations (like DROP DATABASE) are completely blocked
3. **No Multiple Statements**: Prevents SQL injection via multiple statement execution
4. **Connection Timeout**: 10-second timeout prevents hanging connections
5. **Query Validation**: Validates queries before execution

## Use Cases

### Database Exploration

```bash
# Start the CLI
npx mysqldb-cli

# Explore the database
mysql> list-databases
mysql> list-tables
mysql> describe-table '{"table":"users"}'
mysql> show-indexes '{"table":"users"}'
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
mysql> explain-query '{"query":"SELECT * FROM users WHERE email = 'test@example.com'"}'

# Check if indexes are being used
mysql> show-indexes '{"table":"users"}'
```

### Multi-Environment Management

```bash
# Test production connection
npx mysqldb-cli test-connection '{"profile":"production"}'

# Compare table structures
npx mysqldb-cli describe-table '{"table":"users","profile":"local"}'
npx mysqldb-cli describe-table '{"table":"users","profile":"production"}'

# Check production data
npx mysqldb-cli query '{"query":"SELECT COUNT(*) FROM users","profile":"production"}'
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
