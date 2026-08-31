import { API_BASE_URL } from '@/config/api';

export type CaptureResolutionState = 'added' | 'already_exists' | 'could_not_resolve' | 'ignored';

export interface CaptureReview {
  id: string;
  receivedAt: string;
  updatedAt?: string;
  sourceApp?: string;
  status: string;
  state?: string;
  publicMessage?: string;
  sharedText?: string | null;
  note?: string | null;
  processingAttempt?: number;
  media: {
    available: boolean;
    mimeType?: string;
    originalName?: string | null;
    url?: string;
    expiresIn?: number;
  };
  followUp?: {
    method: 'email' | 'whatsapp';
    contact: string;
    consentedAt: string;
    notificationStatus: string;
    notifiedAt?: string | null;
  } | null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try { message = (await response.json()).error || message; } catch { /* keep status */ }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export const captureReviewsService = {
  async list(): Promise<CaptureReview[]> {
    const result = await request<{ items: CaptureReview[] }>('/api/admin/captures');
    return result.items;
  },

  get(id: string): Promise<CaptureReview> {
    return request(`/api/admin/captures/${encodeURIComponent(id)}`);
  },

  retry(id: string, note: string): Promise<unknown> {
    return request(`/api/admin/captures/${encodeURIComponent(id)}/review`, {
      method: 'POST',
      body: JSON.stringify({ action: 'retry', note }),
    });
  },

  resolve(id: string, state: CaptureResolutionState, note: string): Promise<unknown> {
    const messages: Record<CaptureResolutionState, string> = {
      added: 'A human checked this submission and added the gig to bndy.',
      already_exists: 'A human checked this submission and found the gig already on bndy.',
      could_not_resolve: 'A human checked this submission but could not add it safely.',
      ignored: 'A human checked this submission and could not find a live music event.',
    };
    return request(`/api/admin/captures/${encodeURIComponent(id)}/review`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'resolve',
        note,
        publicOutcome: { state, message: messages[state] },
      }),
    });
  },
};
