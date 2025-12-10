# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

```bash
# Install dependencies
npm install

# Build the TypeScript source
npm run build

# Run the CLI (development mode with tsx)
npm start

# Run in development (same as start)
npm run dev

# Run tests
npm test                    # Run all tests once
npm run test:watch          # Run tests in watch mode
npm run test:ui             # Run tests with UI
npm run test:coverage       # Run tests with coverage report

# Code quality
npm run format              # Format code with ESLint and Prettier
npm run find-deadcode       # Find unused exports with ts-prune
npm run pre-commit          # Run format + find-deadcode
```

## Project Architecture

This is a **SQL CLI tool** that provides both interactive REPL and headless modes for database operations with built-in safety features.

### Project Structure

```
src/
├── index.ts (29 lines)                    # Main entry point
├── cli/
│   ├── index.ts                           # Barrel export
│   └── wrapper.ts (315 lines)             # CLI class with REPL logic
├── commands/
│   ├── index.ts                           # Barrel export
│   ├── helpers.ts (46 lines)              # Command info helpers
│   └── runner.ts (106 lines)              # Headless command execution
├── config/
│   ├── index.ts                           # Barrel export
│   └── constants.ts (113 lines)           # Command definitions
└── utils/
    ├── index.ts                           # Barrel export
    ├── argParser.ts (75 lines)            # Command-line argument parser
    ├── config-loader.ts (221 lines)       # YAML config file loader
    ├── database.ts (143 lines)            # Database interface definitions
    ├── database-factory.ts (93 lines)     # Database factory pattern
    ├── sql-database.ts (144 lines)        # Database operation facade
    ├── mysql-utils.ts (432 lines)         # MySQL implementation
    ├── postgresql-utils.ts (502 lines)    # PostgreSQL implementation
    └── query-validator.ts (141 lines)     # SQL safety validation

tests/
├── unit/
│   └── utils/
│       ├── config-loader.test.ts          # Tests for config loading
│       ├── database-factory.test.ts       # Tests for database factory
│       ├── mysql-utils.test.ts            # Tests for MySQL utilities
│       ├── postgresql-utils.test.ts       # Tests for PostgreSQL utilities
│       └── query-validator.test.ts        # Tests for query validation
└── integration/
    └── sql-database.test.ts               # Integration tests for database ops
```

### Core Components

#### Entry Point (`src/index.ts`)

- Bootstraps the application
- Parses command-line arguments via `parseArguments()`
- Routes to interactive REPL or headless mode

#### CLI Module (`src/cli/`)

- **wrapper class**: Main orchestrator managing:
  - `connect()` - Loads configuration from `.claude/sql-config.local.md`
  - `start()` - Initiates interactive REPL with readline interface
  - `handleCommand()` - Parses and processes user commands
  - `runCommand()` - Executes MySQL commands with result formatting
  - `disconnect()` - Graceful cleanup on exit signals (SIGINT/SIGTERM)

#### Commands Module (`src/commands/`)

- `helpers.ts` - Display command information and help
  - `printAvailableCommands()` - Lists all 7 available commands
  - `printCommandDetail(command)` - Shows detailed help for specific command
  - `getCurrentVersion()` - Reads version from package.json
- `runner.ts` - Execute commands in headless mode
  - `runCommand(command, arg, flag)` - Non-interactive command execution

#### Config Module (`src/config/`)

- `constants.ts` - Centralized configuration
  - `COMMANDS[]` - Array of 7 available MySQL command names
  - `COMMANDS_INFO[]` - Brief descriptions for each command
  - `COMMANDS_DETAIL[]` - Detailed parameter documentation

#### Utils Module (`src/utils/`)

- `argParser.ts` - Command-line argument handling
  - `parseArguments(args)` - Parses CLI flags and routes execution
- `config-loader.ts` - Configuration file management
  - `loadConfig(projectRoot)` - Loads `.claude/sql-config.local.md`
  - `getMySQLConnectionOptions(config, profileName)` - Builds mysql2 connection options
  - `getPostgreSQLConnectionOptions(config, profileName)` - Builds pg connection options
  - `getDatabaseType(config, profileName)` - Returns database type for profile
  - `getPostgreSQLSchema(config, profileName)` - Returns schema name for PostgreSQL
  - TypeScript interfaces: `Config`, `DatabaseProfile`, `SafetyConfig`, `MySQLConnectionOptions`, `PostgreSQLConnectionOptions`
- `database.ts` - Database abstraction layer
  - `DatabaseUtil` interface - Contract for all database implementations
  - Result types: `QueryResult`, `DatabaseListResult`, `TableListResult`, `TableStructureResult`, `IndexResult`, `ExplainResult`, `ConnectionTestResult`
  - `OutputFormat` type - 'table', 'json', 'csv', or 'toon'
- `database-factory.ts` - Database factory pattern
  - `DatabaseFactory` class - Creates and manages database utilities based on profile configuration
  - `getUtilForProfile(profileName)` - Returns appropriate database utility (MySQL or PostgreSQL)
  - `getUtilForType(dbType)` - Returns utility for specific database type
  - `closeAll()` - Closes all database connections
  - Supports mixed MySQL and PostgreSQL profiles in the same configuration
- `sql-database.ts` - Database operation facade
  - Exports: `executeQuery()`, `listDatabases()`, `listTables()`, `describeTable()`, `showIndexes()`, `explainQuery()`, `testConnection()`, `closeConnections()`
  - Manages singleton `DatabaseFactory` instance
  - Routes commands to appropriate database implementation (MySQL or PostgreSQL)
- `mysql-utils.ts` - MySQL implementation
  - `MySQLUtil` class implementing `DatabaseUtil` interface
  - Connection pooling per profile using mysql2
  - Implements all 7 database commands with safety validation
  - Formats results as table, JSON, CSV or TOON
- `postgresql-utils.ts` - PostgreSQL implementation
  - `PostgreSQLUtil` class implementing `DatabaseUtil` interface
  - Connection pooling per profile using pg
  - Implements all 7 database commands with safety validation
  - Schema-aware queries (defaults to 'public')
  - Formats results as table, JSON, CSV or TOON
- `query-validator.ts` - SQL safety validation
  - `checkBlacklist()` - Blocks dangerous operations (e.g., DROP DATABASE)
  - `requiresConfirmation()` - Detects destructive operations (DELETE, UPDATE, DROP, TRUNCATE, ALTER)
  - `analyzeQuery()` - Provides warnings for risky queries
  - `applyDefaultLimit()` - Adds LIMIT clause to unbounded SELECT queries

### Configuration System

The CLI loads database profiles from `.claude/sql-config.local.md` with YAML frontmatter:

```yaml
---
profiles:
  local:
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

safety:
  defaultLimit: 100
  requireConfirmationFor:
    - DELETE
    - UPDATE
    - DROP
    - TRUNCATE
    - ALTER
  blacklistedOperations:
    - DROP DATABASE

defaultProfile: local
defaultFormat: table
---
```

**Key behaviors:**

- Profiles are referenced by name in commands
- Multiple profiles support different environments (local, production, etc.)
- Safety settings prevent accidental data loss
- Configuration is validated on load with clear error messages

### REPL Interface

- Custom prompt: `sql>`
- **Special commands**: `help`, `commands`, `profiles`, `profile <name>`, `format <type>`, `clear`, `exit/quit/q`
- **Database commands**: 7 commands accepting JSON arguments
  1. `query` - Execute SQL queries
  2. `list-databases` - List all databases
  3. `list-tables` - List tables in current database
  4. `describe-table` - Show table structure
  5. `show-indexes` - Display table indexes
  6. `explain-query` - Show query execution plan
  7. `test-connection` - Test database connectivity

### Safety Features

1. **Query Validation** (`query-validator.ts`):
   - Blacklist check blocks dangerous operations entirely
   - Confirmation required for destructive operations in interactive mode
   - Auto-applies LIMIT to unbounded SELECT queries
   - Prevents multiple statement execution (SQL injection protection)

2. **Connection Security**:
   - 10-second connection timeout
   - `multipleStatements: false` prevents SQL injection
   - SSL support for production connections

3. **Interactive Mode Protections**:
   - Destructive operations require user confirmation
   - Warnings displayed for risky queries
   - Blacklisted operations completely blocked

4. **Headless Mode Restrictions**:
   - Destructive operations fail with error message
   - User directed to use interactive mode for confirmations

### TypeScript Configuration

- **Target**: ES2022 modules (package.json `"type": "module"`)
- **Output**: Compiles to `dist/` directory with modular structure
- **Declarations**: Generates `.d.ts` files for all modules
- **Source Maps**: Enabled for debugging

## Architecture Patterns

The codebase uses several design patterns to support multiple database types:

### 1. Factory Pattern

- **Location**: `database-factory.ts`
- **Purpose**: Creates appropriate database utility (MySQL or PostgreSQL) based on profile configuration
- **Benefits**: Single point of instantiation, lazy loading, supports mixed database types in one config

### 2. Strategy Pattern

- **Location**: `database.ts` interface with `mysql-utils.ts` and `postgresql-utils.ts` implementations
- **Purpose**: Different database implementations that share a common interface
- **Benefits**: Easy to add new database types, interchangeable at runtime

### 3. Facade Pattern

- **Location**: `sql-database.ts`
- **Purpose**: Simple async functions that hide the complexity of factory and utility management
- **Benefits**: Clean API for CLI, manages global state internally

### 4. Connection Pooling

- **MySQL**: Individual connections per profile stored in Map
- **PostgreSQL**: Connection pools per profile stored in Map
- **Benefits**: Reuses connections efficiently, isolates profiles

## Available Commands

The CLI provides **7 database commands** that work with both MySQL and PostgreSQL:

1. **query** - Execute SQL query with optional format (table/json/csv/toon)
2. **list-databases** - List all accessible databases
3. **list-tables** - List tables in current database
4. **describe-table** - Show table structure (columns, types, keys)
5. **show-indexes** - Display all indexes for a table
6. **explain-query** - Show query execution plan
7. **test-connection** - Test database connection

### Command Examples

```bash
# Start the CLI in interactive mode
npm start

# Inside the REPL:
sql> commands                          # List all 7 commands
sql> help                              # Show help
sql> profiles                          # List available profiles
sql> profile production                # Switch profile
sql> format json                       # Change output format
sql> query '{"query":"SELECT * FROM users LIMIT 10"}'
sql> describe-table '{"table":"users"}'
sql> exit                              # Exit

# Headless mode (one-off commands):
npx mysqldb-cli test-connection '{"profile":"local"}'
npx mysqldb-cli list-databases
npx mysqldb-cli query '{"query":"SELECT COUNT(*) FROM users","format":"json"}'
npx mysqldb-cli --commands        # List all commands
npx mysqldb-cli query -h          # Command-specific help
npx mysqldb-cli --help            # General help
npx mysqldb-cli --version         # Show version
```

## Code Structure & Module Responsibilities

### Entry Point (`index.ts`)

- Minimal bootstrapper
- Imports and coordinates other modules
- Handles top-level error catching

### CLI Class (`cli/wrapper.ts`)

- Interactive REPL management
- Configuration loading and profile switching
- User command processing
- Database command execution with result formatting
- Graceful shutdown handling

### Command Helpers (`commands/helpers.ts`)

- Pure functions for displaying command information
- No external dependencies except config
- Easy to test

### Command Runner (`commands/runner.ts`)

- Headless/non-interactive execution
- Single command → result → exit pattern
- Independent configuration loading per execution

### Constants (`config/constants.ts`)

- Single source of truth for all command definitions
- Command names, descriptions, and parameter documentation
- No logic, just data

### Config Loader (`utils/config-loader.ts`)

- Reads and parses `.claude/sql-config.local.md`
- Extracts YAML frontmatter with database profiles
- Validates required fields for each profile
- Provides default values for safety settings
- Builds mysql2 connection options

### Database Abstraction (`utils/database.ts`)

- TypeScript interfaces for all result types
- `DatabaseUtil` interface defining the contract for database implementations
- Output format types and shared type definitions

### Database Factory (`utils/database-factory.ts`)

- Creates and manages database utilities
- Lazy initialization of MySQL and PostgreSQL utilities
- Routes profile requests to correct database type
- Supports mixed MySQL and PostgreSQL profiles

### Database Facade (`utils/sql-database.ts`)

- Wrapper functions for all database operations
- Manages singleton DatabaseFactory instance
- Exports clean async functions for each command
- Routes to appropriate database implementation

### MySQL Implementation (`utils/mysql-utils.ts`)

- Implements DatabaseUtil interface
- Connection pooling per profile using mysql2
- Query execution with safety validation
- Result formatting (table, JSON, CSV, TOON)
- All 7 command implementations for MySQL

### PostgreSQL Implementation (`utils/postgresql-utils.ts`)

- Implements DatabaseUtil interface
- Connection pooling per profile using pg
- Schema-aware query execution
- Result formatting (table, JSON, CSV, TOON)
- All 7 command implementations for PostgreSQL
- Uses parameterized queries for safety

### Query Validator (`utils/query-validator.ts`)

- SQL safety checks (blacklist, confirmation, analysis)
- Query type detection
- Auto-limiting for unbounded SELECT queries
- Warning generation for risky patterns

### Argument Parser (`utils/argParser.ts`)

- CLI flag parsing (--help, --version, --commands, etc.)
- Routing logic for different execution modes
- Command detection and validation

### Key Implementation Details

- **Barrel Exports**: Each module directory has `index.ts` exporting public APIs
- **ES Modules**: All imports use `.js` extensions (TypeScript requirement)
- **Argument Parsing**: Supports JSON arguments for command parameters
- **Connection Pooling**: Reuses connections per profile for efficiency
- **Signal Handling**: Graceful shutdown on Ctrl+C (SIGINT) and SIGTERM
- **Error Handling**: Try-catch blocks with user-friendly error messages
- **Configuration**: YAML frontmatter in `.claude/sql-config.local.md`

## Dependencies

**Runtime**:

- `mysql2@^3.15.3` - MySQL client for Node.js
- `pg@^8.13.1` - PostgreSQL client for Node.js
- `@toon-format/toon@^2.0.0` - TOON format output
- `yaml@^2.8.1` - YAML parser for config files

**Development**:

- `typescript@^5.0.0` - TypeScript compiler
- `tsx@^4.0.0` - TypeScript execution runtime
- `vitest@^4.0.9` - Test framework
- `@vitest/coverage-v8@^4.0.9` - Coverage reporting
- `@vitest/ui@^4.0.9` - Test UI
- `eslint@^9.39.1` - Linting
- `prettier@3.7.4` - Code formatting
- `ts-prune@^0.10.3` - Find unused exports
- `@types/node@^24.10.1` - Node.js type definitions
- `@types/pg@^8.11.10` - PostgreSQL type definitions

## Testing

This project uses **Vitest** for testing with the following configuration:

- **Test Framework**: Vitest with globals enabled
- **Test Files**: `tests/**/*.test.ts`
- **Coverage**: V8 coverage provider with text, JSON, and HTML reports

### Running Tests

```bash
# Run all tests once
npm test

# Watch mode for development
npm run test:watch

# Run with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Test Structure

```
tests/
├── unit/
│   └── utils/
│       ├── config-loader.test.ts      # Config loading and validation
│       ├── database-factory.test.ts   # Database factory tests
│       ├── mysql-utils.test.ts        # MySQL utility functions
│       ├── postgresql-utils.test.ts   # PostgreSQL utility functions
│       └── query-validator.test.ts    # Query safety validation
└── integration/
    └── sql-database.test.ts           # Database operations end-to-end
```

## Important Notes

1. **Configuration Required**: CLI requires `.claude/sql-config.local.md` with valid database profiles
2. **ES2022 Modules**: Project uses `"type": "module"` - no CommonJS
3. **Safety First**: Built-in protections prevent accidental data loss
4. **Multi-Database**: Supports both MySQL and PostgreSQL with the same interface
5. **Multi-Profile**: Supports multiple database environments (local, production, etc.) with mixed database types
6. **Flexible Output**: Table, JSON, CSV or TOON formats for different use cases
7. **Connection Pooling**: Reuses connections per profile for better performance
8. **Factory Pattern**: Database utilities are created on-demand based on profile configuration

## Commit Message Convention

**Always use Conventional Commits format** for all commit messages and PR titles:

- `feat:` - New features or capabilities
- `fix:` - Bug fixes
- `docs:` - Documentation changes only
- `refactor:` - Code refactoring without changing functionality
- `test:` - Adding or modifying tests
- `chore:` - Maintenance tasks, dependency updates, build configuration

**Examples:**

```
feat: add CSV export format for query results
fix: handle connection timeout errors gracefully
docs: update configuration examples in README
refactor: extract query validation into separate module
test: add integration tests for database operations
chore: update mysql2 to latest version
```

When creating pull requests, the PR title must follow this format.
