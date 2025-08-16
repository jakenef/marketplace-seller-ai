import { BuyerMessage, DraftReply, Listing } from '@upseller/shared';

const MASTER_BASE_URL = process.env.NEXT_PUBLIC_MASTER_BASE_URL || 'http://localhost:4000';

export interface Thread {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  messages: BuyerMessage[];
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = MASTER_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('API request failed:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getThreads(): Promise<ApiResponse<Thread[]>> {
    return this.request<Thread[]>('/threads');
  }

  async processMessage(message: BuyerMessage): Promise<ApiResponse<DraftReply>> {
    return this.request<DraftReply>('/ingest/message', {
      method: 'POST',
      body: JSON.stringify(message),
    });
  }

  async createListing(listing: Omit<Listing, 'id'>): Promise<ApiResponse<{ ok: boolean }>> {
    const listingWithId: Listing = {
      ...listing,
      id: `listing-${Date.now()}`,
    };

    return this.request<{ ok: boolean }>('/ingest/listing', {
      method: 'POST',
      body: JSON.stringify(listingWithId),
    });
  }

  async setMode(mode: 'mock' | 'shadow'): Promise<ApiResponse<{ mode: string }>> {
    return this.request<{ mode: string }>('/mode', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
  }

  async getHealth(): Promise<ApiResponse<{ ok: boolean; service: string }>> {
    return this.request<{ ok: boolean; service: string }>('/health');
  }
}

export const apiClient = new ApiClient();
