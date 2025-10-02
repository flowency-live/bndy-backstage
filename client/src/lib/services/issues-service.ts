// src/lib/services/issues-service.ts
import { API_BASE_URL } from '../../config/api';

export interface Issue {
  issue_id: string;
  title: string;
  description: string;
  type: 'bug' | 'unfinished' | 'enhancement' | 'new';
  location: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  screenshotUrl?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIssueData {
  title: string;
  description: string;
  type: 'bug' | 'unfinished' | 'enhancement' | 'new';
  location: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  screenshotUrl?: string;
}

export interface UpdateIssueData {
  title?: string;
  description?: string;
  type?: 'bug' | 'unfinished' | 'enhancement' | 'new';
  location?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
  screenshotUrl?: string;
}

export interface IssuesListFilters {
  type?: string;
  priority?: string;
  status?: string;
  search?: string;
}

export interface IssuesResponse {
  issues: Issue[];
  total: number;
}

export interface BatchUpdateData {
  issueIds: string[];
  updates: UpdateIssueData;
}

class IssuesService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Make authenticated API request with credentials
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultOptions: RequestInit = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, defaultOptions);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      return {} as T;
    } catch (error) {
      console.error(`Issues API Error (${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * Create a new issue
   */
  async createIssue(issueData: CreateIssueData): Promise<Issue> {
    return this.apiRequest<Issue>('/issues', {
      method: 'POST',
      body: JSON.stringify(issueData),
    });
  }

  /**
   * Get all issues with optional filters
   */
  async getIssues(filters: IssuesListFilters = {}): Promise<IssuesResponse> {
    const params = new URLSearchParams();

    if (filters.type) params.append('type', filters.type);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);

    const queryString = params.toString();
    const endpoint = queryString ? `/issues?${queryString}` : '/issues';

    return this.apiRequest<IssuesResponse>(endpoint);
  }

  /**
   * Update an existing issue
   */
  async updateIssue(issueId: string, updates: UpdateIssueData): Promise<Issue> {
    return this.apiRequest<Issue>(`/issues/${issueId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete an issue
   */
  async deleteIssue(issueId: string): Promise<void> {
    return this.apiRequest<void>(`/issues/${issueId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Batch update multiple issues
   */
  async batchUpdateIssues(data: BatchUpdateData): Promise<{ updated: number }> {
    return this.apiRequest<{ updated: number }>('/issues/batch', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Export singleton instance
export const issuesService = new IssuesService();
export default issuesService;