import { API_BASE_URL } from '../../config/api';

export interface CuratorAccess {
  scope: 'global' | 'postcode';
  postcodePrefixes: string[];
  ownRecordsOnly: boolean;
}

export interface AnalyticsMetricRow {
  label: string;
  pageViews: number;
  visits: number;
}

export interface AnalyticsSeriesPoint {
  date: string;
  pageViews: number;
  visits: number;
}

export interface GodmodeAnalytics {
  host: string;
  range: { days: number; from: string; to: string };
  pageViews: number;
  visits: number;
  series: AnalyticsSeriesPoint[];
  topPages: AnalyticsMetricRow[];
  referrers: AnalyticsMetricRow[];
  countries: AnalyticsMetricRow[];
  devices: AnalyticsMetricRow[];
  browsers: AnalyticsMetricRow[];
  operatingSystems: AnalyticsMetricRow[];
  generatedAt: string;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      detail = body?.error || body?.detail || detail;
    } catch {
      // Keep the status-only message when the response is not JSON.
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export function getGodmodeAnalytics(days: 1 | 7 | 30): Promise<GodmodeAnalytics> {
  return request<GodmodeAnalytics>(`/users/analytics?days=${days}`);
}

export function setCuratorAccess(userId: string, curatorAccess: CuratorAccess): Promise<{ userId: string; curatorAccess: CuratorAccess }> {
  return request(`/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body: JSON.stringify({ curatorAccess }),
  });
}
