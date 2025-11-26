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

This is a **MySQL CLI tool** that provides both interactive REPL and headless modes for database operations with built-in safety features.

### Project Structure

```
src/
├── index.ts (29 lines)                    # Main entry point
├── cli/
│   ├── index.ts                           # Barrel export
│   └── wrapper.ts (319 lines)             # CLI class with REPL logic
├── commands/
│   ├── index.ts                           # Barrel export
│   ├── helpers.ts (45 lines)              # Command info helpers
│   └── runner.ts (105 lines)              # Headless command execution
├── config/
│   ├── index.ts                           # Barrel export
│   └── constants.ts (83 lines)            # Command definitions
└── utils/
    ├── index.ts                           # Barrel export
    ├── argParser.ts (74 lines)            # Command-line argument parser
    ├── config-loader.ts (135 lines)       # YAML config file loader
    ├── mysql-database.ts (117 lines)      # Database operation wrapper
    ├── mysql-utils.ts                     # Core MySQL utility class
    └── query-validator.ts (133 lines)     # SQL safety validation

tests/
├── unit/
│   └── utils/
│       ├── config-loader.test.ts          # Tests for config loading
│       ├── mysql-utils.test.ts            # Tests for MySQL utilities
│       └── query-validator.test.ts        # Tests for query validation
└── integration/
    └── mysql-database.test.ts             # Integration tests for database ops
```

### Core Components

#### Entry Point (`src/index.ts`)

- Bootstraps the application
- Parses command-line arguments via `parseArguments()`
- Routes to interactive REPL or headless mode

#### CLI Module (`src/cli/`)

- **wrapper class**: Main orchestrator managing:
  - `connect()` - Loads configuration from `.claude/mysql-connector.local.md`
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
  - `loadConfig(projectRoot)` - Loads `.claude/mysql-connector.local.md`
  - `getConnectionOptions(config, profileName)` - Builds mysql2 connection options
  - TypeScript interfaces: `Config`, `MySQLProfile`, `SafetyConfig`, `ConnectionOptions`
- `mysql-database.ts` - Database operation wrapper functions
  - Exports: `executeQuery()`, `listDatabases()`, `listTables()`, `describeTable()`, `showIndexes()`, `explainQuery()`, `testConnection()`, `closeConnections()`
  - Manages singleton `MySQLUtil` instance
- `mysql-utils.ts` - Core MySQL utility class
  - `MySQLUtil` class - Connection pooling and query execution
  - Implements all 7 database commands with safety validation
  - Formats results as table, JSON, or CSV
- `query-validator.ts` - SQL safety validation
  - `checkBlacklist()` - Blocks dangerous operations (e.g., DROP DATABASE)
  - `requiresConfirmation()` - Detects destructive operations (DELETE, UPDATE, DROP, TRUNCATE, ALTER)
  - `analyzeQuery()` - Provides warnings for risky queries
  - `applyDefaultLimit()` - Adds LIMIT clause to unbounded SELECT queries

### Configuration System

The CLI loads database profiles from `.claude/mysql-connector.local.md` with YAML frontmatter:

```yaml
---
profiles:
  local:
    host: localhost
    port: 3306
    user: root
    password: password
    database: mydb

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
```

**Key behaviors:**

- Profiles are referenced by name in commands
- Multiple profiles support different environments (local, production, etc.)
- Safety settings prevent accidental data loss
- Configuration is validated on load with clear error messages

### REPL Interface

- Custom prompt: `mysql>`
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

## Available Commands

The CLI provides **7 MySQL database commands**:

1. **query** - Execute SQL query with optional format (table/json/csv)
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
mysql> commands                          # List all 7 commands
mysql> help                              # Show help
mysql> profiles                          # List available profiles
mysql> profile production                # Switch profile
mysql> format json                       # Change output format
mysql> query '{"query":"SELECT * FROM users LIMIT 10"}'
mysql> describe-table '{"table":"users"}'
mysql> exit                              # Exit

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

- Reads and parses `.claude/mysql-connector.local.md`
- Extracts YAML frontmatter with database profiles
- Validates required fields for each profile
- Provides default values for safety settings
- Builds mysql2 connection options

### MySQL Database (`utils/mysql-database.ts`)

- Wrapper functions for all database operations
- Manages singleton MySQLUtil instance
- Exports clean async functions for each command

### MySQL Utils (`utils/mysql-utils.ts`)

- Core database interaction logic
- Connection pooling per profile
- Query execution with safety validation
- Result formatting (table, JSON, CSV)
- All 7 command implementations

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
- **Configuration**: YAML frontmatter in `.claude/mysql-connector.local.md`

## Dependencies

**Runtime**:

- `mysql2@^3.15.3` - MySQL client for Node.js
- `yaml@^2.8.1` - YAML parser for config files

**Development**:

- `typescript@^5.0.0` - TypeScript compiler
- `tsx@^4.0.0` - TypeScript execution runtime
- `vitest@^4.0.9` - Test framework
- `eslint@^9.39.1` - Linting
- `prettier@3.6.2` - Code formatting
- `ts-prune@^0.10.3` - Find unused exports

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
│       ├── mysql-utils.test.ts        # MySQL utility functions
│       └── query-validator.test.ts    # Query safety validation
└── integration/
    └── mysql-database.test.ts         # Database operations end-to-end
```

## Important Notes

1. **Configuration Required**: CLI requires `.claude/mysql-connector.local.md` with valid database profiles
2. **ES2022 Modules**: Project uses `"type": "module"` - no CommonJS
3. **Safety First**: Built-in protections prevent accidental data loss
4. **Multi-Profile**: Supports multiple database environments (local, production, etc.)
5. **Flexible Output**: Table, JSON, or CSV formats for different use cases
6. **Connection Pooling**: Reuses connections per profile for better performance

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
