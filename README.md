# Jira API CLI

[![npm jira-api-cli package](https://img.shields.io/npm/v/jira-api-cli.svg)](https://npmjs.org/package/jira-api-cli)

A powerful command-line interface for Jira API interaction with support for issues, projects, boards, and multiple output formats.

## Features

- 💻 **Interactive REPL** for Jira exploration and management
- 🚀 **Headless mode** for one-off command execution and automation
- 🔐 **Multi-profile support** for managing different Jira instances
- 📊 **Multiple output formats**: table, JSON, or TOON
- 🎯 **Issue management**: create, read, update, delete issues
- 📋 **Project operations**: list and view project details
- 🔍 **JQL query support** for advanced issue searching
- 👤 **User management**: retrieve user information
- 📊 **Board support**: list agile boards (coming soon)
- ✅ **Connection testing** for quick diagnostics

## Requirements

- [Node.js](https://nodejs.org/) v20.0 or newer
- [npm](https://www.npmjs.com/)
- Jira Cloud account with API access

## Installation

```bash
npm install -g jira-api-cli
```

## Configuration

### Step 1: Create API Token

1. Go to [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Give it a label (e.g., "Jira CLI")
4. Copy the generated token

### Step 2: Create Configuration File

Create a configuration file at `.claude/jira-connector.local.md` in your project root:

```markdown
---
profiles:
  cloud:
    host: https://your-domain.atlassian.net
    email: your-email@example.com
    apiToken: YOUR_API_TOKEN_HERE

defaultProfile: cloud
defaultFormat: json
---

# Jira API Configuration

This file stores your Jira API connection profiles.
```

### Configuration Options

- **profiles**: Named Jira connection profiles
  - `host`: Your Jira Cloud instance URL (must start with https://)
  - `email`: Your Atlassian account email
  - `apiToken`: Your Jira API token

- **defaultProfile**: Profile name to use when none specified
- **defaultFormat**: Default output format (`table`, `json`, or `toon`)

### Multiple Profiles Example

```yaml
---
profiles:
  production:
    host: https://company.atlassian.net
    email: user@company.com
    apiToken: prod_token_here

  staging:
    host: https://company-staging.atlassian.net
    email: user@company.com
    apiToken: staging_token_here

defaultProfile: production
defaultFormat: json
---
```

## Quick Start

### Interactive Mode

Start the CLI and interact with Jira through a REPL:

```bash
npx jira-cli
```

Once started, you'll see the `jira>` prompt:

```
jira> list-projects
jira> get-issue {"issueIdOrKey":"PROJ-123"}
jira> list-issues {"jql":"project = PROJ AND status = Open","maxResults":10}
```

### Headless Mode

Execute single commands directly:

```bash
# Test connection
npx jira-cli test-connection

# List all projects
npx jira-cli list-projects

# Get issue details
npx jira-cli get-issue '{"issueIdOrKey":"PROJ-123"}'

# List issues with JQL
npx jira-cli list-issues '{"jql":"project = PROJ AND status = Open","maxResults":10}'

# Create a new issue
npx jira-cli create-issue '{"fields":{"summary":"New bug","project":{"key":"PROJ"},"issuetype":{"name":"Bug"}}}'
```

## Available Commands

### Project Commands

- **list-projects** - List all accessible projects
  ```bash
  jira> list-projects
  jira> list-projects {"format":"table"}
  ```

- **get-project** - Get details of a specific project
  ```bash
  jira> get-project {"projectIdOrKey":"PROJ"}
  ```

### Issue Commands

- **list-issues** - List issues using JQL query
  ```bash
  jira> list-issues
  jira> list-issues {"jql":"project = PROJ AND status = Open"}
  jira> list-issues {"jql":"assignee = currentUser()","maxResults":20}
  ```

- **get-issue** - Get details of a specific issue
  ```bash
  jira> get-issue {"issueIdOrKey":"PROJ-123"}
  ```

- **create-issue** - Create a new issue
  ```bash
  jira> create-issue {"fields":{"summary":"New task","project":{"key":"PROJ"},"issuetype":{"name":"Task"}}}
  ```

- **update-issue** - Update an existing issue
  ```bash
  jira> update-issue {"issueIdOrKey":"PROJ-123","fields":{"summary":"Updated summary"}}
  ```

- **delete-issue** - Delete an issue
  ```bash
  jira> delete-issue {"issueIdOrKey":"PROJ-123"}
  ```

### User Commands

- **get-user** - Get user information
  ```bash
  jira> get-user
  jira> get-user {"accountId":"5b10a2844c20165700ede21g"}
  ```

### Board Commands

- **list-boards** - List agile boards (experimental)
  ```bash
  jira> list-boards
  jira> list-boards {"projectIdOrKey":"PROJ","type":"scrum"}
  ```

### Utility Commands

- **test-connection** - Test Jira API connection
  ```bash
  jira> test-connection
  ```

## Interactive Mode Commands

Special commands available in the REPL:

- **commands** - List all available commands
- **help** or **?** - Show help message
- **profile \<name\>** - Switch to a different profile
- **profiles** - List all available profiles
- **format \<type\>** - Set output format (table, json, toon)
- **clear** - Clear the screen
- **exit**, **quit**, or **q** - Exit the CLI

## Output Formats

### Table Format

Human-readable table format:

```bash
jira> format table
jira> list-projects
```

### JSON Format

Machine-readable JSON format (default):

```bash
jira> format json
jira> list-projects
```

### TOON Format

[Token-Oriented Object Notation](https://github.com/toon-format/toon) for AI-optimized output:

```bash
jira> format toon
jira> list-issues
```

## Security

⚠️ **Important Security Notes:**

1. **Never commit** `.claude/jira-connector.local.md` to version control
2. Add `*.local.md` to your `.gitignore`
3. Keep your API tokens secure and rotate them periodically
4. Use different API tokens for different environments
5. API tokens have the same permissions as your user account

## Development

### Build from Source

```bash
# Clone repository
git clone https://github.com/hesedcasa/jira-api-cli.git
cd jira-api-cli

# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm start
```

### Run Tests

```bash
npm test                    # Run all tests once
npm run test:watch          # Run tests in watch mode
npm run test:coverage       # Run tests with coverage
```

### Code Quality

```bash
npm run format              # Format code with ESLint and Prettier
npm run find-deadcode       # Find unused exports
npm run pre-commit          # Run format + find-deadcode
```

## Examples

### Basic Workflow

```bash
# Start interactive mode
npx jira-cli

# List all projects
jira> list-projects

# Find open issues
jira> list-issues {"jql":"status = Open","maxResults":10}

# Get specific issue
jira> get-issue {"issueIdOrKey":"PROJ-123"}

# Update issue
jira> update-issue {"issueIdOrKey":"PROJ-123","fields":{"assignee":{"accountId":"123456"}}}

# Create new issue
jira> create-issue {"fields":{"summary":"Fix login bug","project":{"key":"PROJ"},"issuetype":{"name":"Bug"},"priority":{"name":"High"}}}
```

### Automation Scripts

```bash
#!/bin/bash
# Get all high priority bugs
npx jira-cli list-issues '{"jql":"priority = High AND type = Bug","maxResults":100}' > bugs.json

# Test connection
npx jira-cli test-connection

# Create issue from script
npx jira-cli create-issue '{
  "fields": {
    "summary": "Automated issue creation",
    "project": {"key": "PROJ"},
    "issuetype": {"name": "Task"},
    "description": "Created via automation script"
  }
}'
```

## Troubleshooting

### Connection Issues

```bash
# Test your connection
npx jira-cli test-connection

# Common issues:
# 1. Invalid API token - regenerate token
# 2. Wrong email address - use Atlassian account email
# 3. Incorrect host URL - ensure https:// prefix
```

### Authentication Errors

- Verify your API token is correct
- Check that the email matches your Atlassian account
- Ensure the host URL includes `https://`

### Permission Errors

- API tokens inherit your user permissions
- Check that your Jira account has access to the project/issue
- Some operations require specific Jira permissions

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

Apache-2.0

## Links

- [npm package](https://www.npmjs.com/package/jira-api-cli)
- [GitHub repository](https://github.com/hesedcasa/jira-api-cli)
- [Issue tracker](https://github.com/hesedcasa/jira-api-cli/issues)
- [Jira API Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [jira.js Library](https://github.com/MrRefactoring/jira.js)

## Acknowledgments

Built with [jira.js](https://github.com/MrRefactoring/jira.js) - A modern Jira REST API client for Node.js
