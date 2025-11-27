/**
 * Jira API client wrapper functions
 */
import { loadConfig } from './config-loader.js';
import type { ApiResult } from './jira-utils.js';
import { JiraUtil } from './jira-utils.js';

const projectRoot = process.env.CLAUDE_PROJECT_ROOT || process.cwd();

let jiraUtil: JiraUtil | null = null;

/**
 * Initialize Jira utility
 */
async function initJira(): Promise<JiraUtil> {
  if (jiraUtil) return jiraUtil;

  try {
    const config = loadConfig(projectRoot);
    jiraUtil = new JiraUtil(config);
    return jiraUtil;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to initialize Jira client: ${errorMessage}`);
  }
}

/**
 * List all projects
 * @param profile - Jira profile name
 * @param format - Output format (table, json, toon)
 */
export async function listProjects(
  profile: string,
  format: 'table' | 'json' | 'toon' = 'json'
): Promise<ApiResult> {
  const jira = await initJira();
  return await jira.listProjects(profile, format);
}

/**
 * Get project details
 * @param profile - Jira profile name
 * @param projectIdOrKey - Project ID or key
 * @param format - Output format (table, json, toon)
 */
export async function getProject(
  profile: string,
  projectIdOrKey: string,
  format: 'table' | 'json' | 'toon' = 'json'
): Promise<ApiResult> {
  const jira = await initJira();
  return await jira.getProject(profile, projectIdOrKey, format);
}

/**
 * List issues using JQL
 * @param profile - Jira profile name
 * @param jql - JQL query string
 * @param maxResults - Maximum number of results
 * @param startAt - Starting index for pagination
 * @param format - Output format (table, json, toon)
 */
export async function listIssues(
  profile: string,
  jql?: string,
  maxResults = 50,
  startAt = 0,
  format: 'table' | 'json' | 'toon' = 'json'
): Promise<ApiResult> {
  const jira = await initJira();
  return await jira.listIssues(profile, jql, maxResults, startAt, format);
}

/**
 * Get issue details
 * @param profile - Jira profile name
 * @param issueIdOrKey - Issue ID or key
 * @param format - Output format (table, json, toon)
 */
export async function getIssue(
  profile: string,
  issueIdOrKey: string,
  format: 'table' | 'json' | 'toon' = 'json'
): Promise<ApiResult> {
  const jira = await initJira();
  return await jira.getIssue(profile, issueIdOrKey, format);
}

/**
 * Create a new issue
 * @param profile - Jira profile name
 * @param fields - Issue fields
 * @param format - Output format (table, json, toon)
 */
export async function createIssue(
  profile: string,
  fields: Record<string, unknown>,
  format: 'table' | 'json' | 'toon' = 'json'
): Promise<ApiResult> {
  const jira = await initJira();
  return await jira.createIssue(profile, fields, format);
}

/**
 * Update an existing issue
 * @param profile - Jira profile name
 * @param issueIdOrKey - Issue ID or key
 * @param fields - Issue fields to update
 * @param format - Output format (table, json, toon)
 */
export async function updateIssue(
  profile: string,
  issueIdOrKey: string,
  fields: Record<string, unknown>,
  format: 'table' | 'json' | 'toon' = 'json'
): Promise<ApiResult> {
  const jira = await initJira();
  return await jira.updateIssue(profile, issueIdOrKey, fields, format);
}

/**
 * Delete an issue
 * @param profile - Jira profile name
 * @param issueIdOrKey - Issue ID or key
 */
export async function deleteIssue(profile: string, issueIdOrKey: string): Promise<ApiResult> {
  const jira = await initJira();
  return await jira.deleteIssue(profile, issueIdOrKey);
}

/**
 * List agile boards
 * @param profile - Jira profile name
 * @param projectIdOrKey - Filter boards by project
 * @param type - Board type (scrum, kanban, simple)
 * @param format - Output format (table, json, toon)
 */
export async function listBoards(
  profile: string,
  projectIdOrKey?: string,
  type?: string,
  format: 'table' | 'json' | 'toon' = 'json'
): Promise<ApiResult> {
  const jira = await initJira();
  return await jira.listBoards(profile, projectIdOrKey, type, format);
}

/**
 * Get user information
 * @param profile - Jira profile name
 * @param accountId - User account ID
 * @param username - Username (deprecated)
 * @param format - Output format (table, json, toon)
 */
export async function getUser(
  profile: string,
  accountId?: string,
  username?: string,
  format: 'table' | 'json' | 'toon' = 'json'
): Promise<ApiResult> {
  const jira = await initJira();
  return await jira.getUser(profile, accountId, username, format);
}

/**
 * Test Jira API connection
 * @param profile - Jira profile name
 */
export async function testConnection(profile: string): Promise<ApiResult> {
  const jira = await initJira();
  return await jira.testConnection(profile);
}

/**
 * Clear Jira client pool (for cleanup)
 */
export function clearClients(): void {
  if (jiraUtil) {
    jiraUtil.clearClients();
    jiraUtil = null;
  }
}
