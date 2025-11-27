import { encode } from '@toon-format/toon';
import { Version3Client } from 'jira.js';

import type { Config } from './config-loader.js';
import { getJiraClientOptions } from './config-loader.js';

/**
 * Generic API result
 */
export interface ApiResult {
  success: boolean;
  result?: string;
  data?: unknown;
  error?: string;
}

/**
 * Jira API Utility Module
 * Provides core Jira API operations with formatting
 */
export class JiraUtil {
  private config: Config;
  private clientPool: Map<string, Version3Client>;

  constructor(config: Config) {
    this.config = config;
    this.clientPool = new Map();
  }

  /**
   * Get or create Jira client for a profile
   */
  getClient(profileName: string): Version3Client {
    if (this.clientPool.has(profileName)) {
      return this.clientPool.get(profileName)!;
    }

    const options = getJiraClientOptions(this.config, profileName);
    const client = new Version3Client(options);
    this.clientPool.set(profileName, client);

    return client;
  }

  /**
   * Format data as table
   */
  formatAsTable(data: Record<string, unknown>[] | Record<string, unknown>): string {
    const rows = Array.isArray(data) ? data : [data];

    if (!rows || rows.length === 0) {
      return 'No results';
    }

    // Get all unique keys across all rows
    const columnNames = Array.from(new Set(rows.flatMap(row => Object.keys(row))));

    // Calculate column widths
    const columnWidths = columnNames.map(name => {
      const dataWidth = Math.max(...rows.map(row => String(row[name] ?? '').length));
      return Math.max(name.length, dataWidth, 3);
    });

    // Header
    let table = '┌' + columnWidths.map(w => '─'.repeat(w + 2)).join('┬') + '┐\n';
    table += '│ ' + columnNames.map((name, i) => name.padEnd(columnWidths[i])).join(' │ ') + ' │\n';
    table += '├' + columnWidths.map(w => '─'.repeat(w + 2)).join('┼') + '┤\n';

    // Rows
    for (const row of rows) {
      table +=
        '│ ' +
        columnNames
          .map((name, i) => {
            const value = row[name] ?? 'NULL';
            const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
            // Truncate long values
            const truncated = str.length > 50 ? str.substring(0, 47) + '...' : str;
            return truncated.padEnd(columnWidths[i]);
          })
          .join(' │ ') +
        ' │\n';
    }

    table += '└' + columnWidths.map(w => '─'.repeat(w + 2)).join('┴') + '┘';

    return table;
  }

  /**
   * Format data as JSON
   */
  formatAsJson(data: unknown): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Format data as TOON (Token-Oriented Object Notation)
   */
  formatAsToon(data: unknown): string {
    if (!data) {
      return '';
    }

    return encode(data);
  }

  /**
   * Format result with specified format
   */
  formatResult(data: unknown, format: 'table' | 'json' | 'toon' = 'json'): string {
    if (format === 'json') {
      return this.formatAsJson(data);
    } else if (format === 'toon') {
      return this.formatAsToon(data);
    } else {
      // Table format
      if (Array.isArray(data) || typeof data === 'object') {
        return this.formatAsTable(data as Record<string, unknown>[] | Record<string, unknown>);
      }
      return String(data);
    }
  }

  /**
   * List all projects
   */
  async listProjects(profileName: string, format: 'table' | 'json' | 'toon' = 'json'): Promise<ApiResult> {
    try {
      const client = this.getClient(profileName);
      const response = await client.projects.searchProjects();

      // Simplify project data for display
      const projects = response.values || [];
      const simplifiedProjects = projects.map((p: { key?: string; name?: string; projectTypeKey?: string; id?: string }) => ({
        key: p.key,
        name: p.name,
        projectTypeKey: p.projectTypeKey,
        id: p.id,
      }));

      return {
        success: true,
        data: simplifiedProjects,
        result: `Projects (${simplifiedProjects.length} total):\n\n${this.formatResult(simplifiedProjects, format)}`,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `ERROR: ${errorMessage}`,
      };
    }
  }

  /**
   * Get project details
   */
  async getProject(
    profileName: string,
    projectIdOrKey: string,
    format: 'table' | 'json' | 'toon' = 'json'
  ): Promise<ApiResult> {
    try {
      const client = this.getClient(profileName);
      const project = await client.projects.getProject({ projectIdOrKey });

      return {
        success: true,
        data: project,
        result: `Project Details:\n\n${this.formatResult(project, format)}`,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `ERROR: ${errorMessage}`,
      };
    }
  }

  /**
   * List issues using JQL
   */
  async listIssues(
    profileName: string,
    jql?: string,
    maxResults = 50,
    startAt = 0,
    format: 'table' | 'json' | 'toon' = 'json'
  ): Promise<ApiResult> {
    try {
      const client = this.getClient(profileName);
      const response = await client.issueSearch.searchForIssuesUsingJql({
        jql: jql || '',
        maxResults,
        startAt,
      });

      // Simplify issue data for display
      const simplifiedIssues =
        response.issues?.map(issue => ({
          key: issue.key,
          summary: issue.fields?.summary,
          status: (issue.fields?.status as { name?: string })?.name,
          assignee: (issue.fields?.assignee as { displayName?: string })?.displayName || 'Unassigned',
          created: issue.fields?.created,
        })) || [];

      return {
        success: true,
        data: simplifiedIssues,
        result: `Issues (${response.total || 0} total, showing ${simplifiedIssues.length}):\n\n${this.formatResult(simplifiedIssues, format)}`,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `ERROR: ${errorMessage}`,
      };
    }
  }

  /**
   * Get issue details
   */
  async getIssue(
    profileName: string,
    issueIdOrKey: string,
    format: 'table' | 'json' | 'toon' = 'json'
  ): Promise<ApiResult> {
    try {
      const client = this.getClient(profileName);
      const issue = await client.issues.getIssue({ issueIdOrKey });

      return {
        success: true,
        data: issue,
        result: `Issue Details:\n\n${this.formatResult(issue, format)}`,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `ERROR: ${errorMessage}`,
      };
    }
  }

  /**
   * Create a new issue
   */
  async createIssue(
    profileName: string,
    fields: Record<string, unknown>,
    format: 'table' | 'json' | 'toon' = 'json'
  ): Promise<ApiResult> {
    try {
      const client = this.getClient(profileName);
      const response = await client.issues.createIssue({
        fields: fields as Parameters<typeof client.issues.createIssue>[0]['fields'],
      });

      return {
        success: true,
        data: response,
        result: `✅ Issue created successfully!\n\nKey: ${response.key}\nID: ${response.id}\n\n${this.formatResult(response, format)}`,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `ERROR: ${errorMessage}`,
      };
    }
  }

  /**
   * Update an existing issue
   */
  async updateIssue(
    profileName: string,
    issueIdOrKey: string,
    fields: Record<string, unknown>,
    format: 'table' | 'json' | 'toon' = 'json'
  ): Promise<ApiResult> {
    try {
      const client = this.getClient(profileName);
      await client.issues.editIssue({
        issueIdOrKey,
        fields: fields as Parameters<typeof client.issues.editIssue>[0]['fields'],
      });

      return {
        success: true,
        result: `✅ Issue ${issueIdOrKey} updated successfully!`,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `ERROR: ${errorMessage}`,
      };
    }
  }

  /**
   * Delete an issue
   */
  async deleteIssue(profileName: string, issueIdOrKey: string): Promise<ApiResult> {
    try {
      const client = this.getClient(profileName);
      await client.issues.deleteIssue({ issueIdOrKey });

      return {
        success: true,
        result: `✅ Issue ${issueIdOrKey} deleted successfully!`,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `ERROR: ${errorMessage}`,
      };
    }
  }

  /**
   * List agile boards
   */
  async listBoards(
    profileName: string,
    projectIdOrKey?: string,
    type?: string,
    format: 'table' | 'json' | 'toon' = 'json'
  ): Promise<ApiResult> {
    try {
      const client = this.getClient(profileName);

      // Note: jira.js may not have direct board API in Version3Client
      // We need to use the agile API which is separate
      // For now, we'll return a placeholder error
      return {
        success: false,
        error: 'ERROR: Board listing requires Agile API which needs separate implementation',
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `ERROR: ${errorMessage}`,
      };
    }
  }

  /**
   * Get user information
   */
  async getUser(
    profileName: string,
    accountId?: string,
    username?: string,
    format: 'table' | 'json' | 'toon' = 'json'
  ): Promise<ApiResult> {
    try {
      const client = this.getClient(profileName);

      if (accountId) {
        const user = await client.users.getUser({ accountId });
        return {
          success: true,
          data: user,
          result: `User Details:\n\n${this.formatResult(user, format)}`,
        };
      } else if (username) {
        // Username lookup is deprecated but we can try
        const users = await client.userSearch.findUsers({ query: username });
        if (users.length > 0) {
          return {
            success: true,
            data: users[0],
            result: `User Details:\n\n${this.formatResult(users[0], format)}`,
          };
        }
        return {
          success: false,
          error: `ERROR: User "${username}" not found`,
        };
      } else {
        // Get current user
        const user = await client.myself.getCurrentUser();
        return {
          success: true,
          data: user,
          result: `Current User Details:\n\n${this.formatResult(user, format)}`,
        };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `ERROR: ${errorMessage}`,
      };
    }
  }

  /**
   * Test Jira API connection
   */
  async testConnection(profileName: string): Promise<ApiResult> {
    try {
      const client = this.getClient(profileName);
      const serverInfo = await client.serverInfo.getServerInfo();
      const currentUser = await client.myself.getCurrentUser();

      return {
        success: true,
        data: { serverInfo, currentUser },
        result: `✅ Connection successful!\n\nProfile: ${profileName}\nServer Version: ${serverInfo.version}\nServer Title: ${serverInfo.serverTitle}\nLogged in as: ${currentUser.displayName} (${currentUser.emailAddress})`,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `ERROR: ${errorMessage}`,
      };
    }
  }

  /**
   * Clear client pool (for cleanup)
   */
  clearClients(): void {
    this.clientPool.clear();
  }
}
