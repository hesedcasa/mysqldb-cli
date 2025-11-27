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

This is a **Jira API CLI tool** that provides both interactive REPL and headless modes for Jira operations.

### Project Structure

```
src/
├── index.ts (29 lines)                    # Main entry point
├── cli/
│   ├── index.ts                           # Barrel export
│   └── wrapper.ts (334 lines)             # CLI class with REPL logic
├── commands/
│   ├── index.ts                           # Barrel export
│   ├── helpers.ts (45 lines)              # Command info helpers
│   └── runner.ts (121 lines)              # Headless command execution
├── config/
│   ├── index.ts                           # Barrel export
│   └── constants.ts (122 lines)           # Command definitions
└── utils/
    ├── index.ts                           # Barrel export
    ├── argParser.ts (74 lines)            # Command-line argument parser
    ├── config-loader.ts (120 lines)       # YAML config file loader
    ├── jira-client.ts (167 lines)         # Jira API wrapper functions
    └── jira-utils.ts (433 lines)          # Core Jira utility class

tests/
├── unit/
│   └── utils/
│       └── config-loader.test.ts          # Tests for config loading
└── integration/
    └── jira-client.test.ts                # Integration tests for Jira ops
```

### Core Components

#### Entry Point (`src/index.ts`)

- Bootstraps the application
- Parses command-line arguments via `parseArguments()`
- Routes to interactive REPL or headless mode

#### CLI Module (`src/cli/`)

- **wrapper class**: Main orchestrator managing:
  - `connect()` - Loads configuration from `.claude/jira-connector.local.md`
  - `start()` - Initiates interactive REPL with readline interface
  - `handleCommand()` - Parses and processes user commands
  - `runCommand()` - Executes Jira commands with result formatting
  - `disconnect()` - Graceful cleanup on exit signals (SIGINT/SIGTERM)

#### Commands Module (`src/commands/`)

- `helpers.ts` - Display command information and help
  - `printAvailableCommands()` - Lists all 10 available commands
  - `printCommandDetail(command)` - Shows detailed help for specific command
  - `getCurrentVersion()` - Reads version from package.json
- `runner.ts` - Execute commands in headless mode
  - `runCommand(command, arg, flag)` - Non-interactive command execution

#### Config Module (`src/config/`)

- `constants.ts` - Centralized configuration
  - `COMMANDS[]` - Array of 10 available Jira command names
  - `COMMANDS_INFO[]` - Brief descriptions for each command
  - `COMMANDS_DETAIL[]` - Detailed parameter documentation

#### Utils Module (`src/utils/`)

- `argParser.ts` - Command-line argument handling
  - `parseArguments(args)` - Parses CLI flags and routes execution
- `config-loader.ts` - Configuration file management
  - `loadConfig(projectRoot)` - Loads `.claude/jira-connector.local.md`
  - `getJiraClientOptions(config, profileName)` - Builds jira.js client options
  - TypeScript interfaces: `Config`, `JiraProfile`, `JiraClientOptions`
- `jira-client.ts` - Jira API wrapper functions
  - Exports: `listProjects()`, `getProject()`, `listIssues()`, `getIssue()`, `createIssue()`, `updateIssue()`, `deleteIssue()`, `listBoards()`, `getUser()`, `testConnection()`, `clearClients()`
  - Manages singleton `JiraUtil` instance
- `jira-utils.ts` - Core Jira utility class
  - `JiraUtil` class - Client pooling and API calls
  - Implements all 10 Jira commands
  - Formats results as table, JSON or TOON

### Configuration System

The CLI loads Jira profiles from `.claude/jira-connector.local.md` with YAML frontmatter:

```yaml
---
profiles:
  cloud:
    host: https://your-domain.atlassian.net
    email: your-email@example.com
    apiToken: YOUR_API_TOKEN_HERE

defaultProfile: cloud
defaultFormat: json
---
```

**Key behaviors:**

- Profiles are referenced by name in commands
- Multiple profiles support different Jira instances (cloud, staging, etc.)
- Configuration is validated on load with clear error messages
- API tokens are used for authentication (basic auth)

### REPL Interface

- Custom prompt: `jira>`
- **Special commands**: `help`, `commands`, `profiles`, `profile <name>`, `format <type>`, `clear`, `exit/quit/q`
- **Jira commands**: 10 commands accepting JSON arguments
  1. `list-projects` - List all accessible projects
  2. `get-project` - Get details of a specific project
  3. `list-issues` - List issues using JQL query
  4. `get-issue` - Get details of a specific issue
  5. `create-issue` - Create a new issue
  6. `update-issue` - Update an existing issue
  7. `delete-issue` - Delete an issue
  8. `list-boards` - List agile boards
  9. `get-user` - Get user information
  10. `test-connection` - Test Jira API connection

### TypeScript Configuration

- **Target**: ES2022 modules (package.json `"type": "module"`)
- **Output**: Compiles to `dist/` directory with modular structure
- **Declarations**: Generates `.d.ts` files for all modules
- **Source Maps**: Enabled for debugging

## Available Commands

The CLI provides **10 Jira API commands**:

1. **list-projects** - List all accessible projects
2. **get-project** - Get details of a specific project
3. **list-issues** - List issues using JQL query
4. **get-issue** - Get details of a specific issue
5. **create-issue** - Create a new issue
6. **update-issue** - Update an existing issue
7. **delete-issue** - Delete an issue
8. **list-boards** - List agile boards (experimental)
9. **get-user** - Get user information
10. **test-connection** - Test Jira API connection

### Command Examples

```bash
# Start the CLI in interactive mode
npm start

# Inside the REPL:
jira> commands                          # List all 10 commands
jira> help                              # Show help
jira> profiles                          # List available profiles
jira> profile production                # Switch profile
jira> format json                       # Change output format
jira> list-projects
jira> get-issue '{"issueIdOrKey":"PROJ-123"}'
jira> list-issues '{"jql":"project = PROJ AND status = Open","maxResults":10}'
jira> exit                              # Exit

# Headless mode (one-off commands):
npx jira-cli test-connection '{"profile":"cloud"}'
npx jira-cli list-projects
npx jira-cli get-issue '{"issueIdOrKey":"PROJ-123","format":"json"}'
npx jira-cli --commands        # List all commands
npx jira-cli list-issues -h    # Command-specific help
npx jira-cli --help            # General help
npx jira-cli --version         # Show version
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
- Jira command execution with result formatting
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

- Reads and parses `.claude/jira-connector.local.md`
- Extracts YAML frontmatter with Jira profiles
- Validates required fields for each profile
- Provides default values for settings
- Builds jira.js client options

### Jira Client (`utils/jira-client.ts`)

- Wrapper functions for all Jira operations
- Manages singleton JiraUtil instance
- Exports clean async functions for each command

### Jira Utils (`utils/jira-utils.ts`)

- Core Jira API interaction logic
- Client pooling per profile
- API call execution
- Result formatting (table, JSON, TOON)
- All 10 command implementations

### Argument Parser (`utils/argParser.ts`)

- CLI flag parsing (--help, --version, --commands, etc.)
- Routing logic for different execution modes
- Command detection and validation

### Key Implementation Details

- **Barrel Exports**: Each module directory has `index.ts` exporting public APIs
- **ES Modules**: All imports use `.js` extensions (TypeScript requirement)
- **Argument Parsing**: Supports JSON arguments for command parameters
- **Client Pooling**: Reuses Jira clients per profile for efficiency
- **Signal Handling**: Graceful shutdown on Ctrl+C (SIGINT) and SIGTERM
- **Error Handling**: Try-catch blocks with user-friendly error messages
- **Configuration**: YAML frontmatter in `.claude/jira-connector.local.md`

## Dependencies

**Runtime**:

- `jira.js@^4.0.1` - Jira API client for Node.js
- `yaml@^2.8.1` - YAML parser for config files
- `@toon-format/toon@^2.0.0` - TOON format encoder

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
│       └── config-loader.test.ts      # Config loading and validation
└── integration/
    └── jira-client.test.ts            # Jira API operations end-to-end
```

## Important Notes

1. **Configuration Required**: CLI requires `.claude/jira-connector.local.md` with valid Jira profiles
2. **ES2022 Modules**: Project uses `"type": "module"` - no CommonJS
3. **API Authentication**: Uses Jira API tokens with basic authentication
4. **Multi-Profile**: Supports multiple Jira instances (cloud, staging, etc.)
5. **Flexible Output**: Table, JSON or TOON formats for different use cases
6. **Client Pooling**: Reuses clients per profile for better performance

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
feat: add list-boards command for agile boards
fix: handle connection timeout errors gracefully
docs: update configuration examples in README
refactor: extract API formatting into separate module
test: add integration tests for Jira operations
chore: update jira.js to latest version
```

When creating pull requests, the PR title must follow this format.
