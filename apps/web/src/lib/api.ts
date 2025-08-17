import { Listing } from '@upseller/shared';

const MASTER_BASE_URL = process.env.NEXT_PUBLIC_MASTER_BASE_URL || 'http://localhost:4000';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
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

  async sendChatMessage(message: string): Promise<ApiResponse<{ response: string }>> {
    return this.request<{ response: string }>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async getChatHistory(): Promise<ApiResponse<ChatMessage[]>> {
    return this.request<ChatMessage[]>('/chat/history');
  }

  async clearChatHistory(): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request<{ ok: boolean }>('/chat/history', {
      method: 'DELETE',
    });
  }

  async getCurrentListing(): Promise<ApiResponse<Listing | null>> {
    return this.request<Listing | null>('/listing');
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

  async scheduleAppointment(timeSlot: string, spot?: string, buyerEmail?: string): Promise<ApiResponse<{ appointment: any; message: string }>> {
    return this.request<{ appointment: any; message: string }>('/schedule', {
      method: 'POST',
      body: JSON.stringify({ timeSlot, spot, buyerEmail }),
    });
  }

  async getHealth(): Promise<ApiResponse<{ ok: boolean; service: string }>> {
    return this.request<{ ok: boolean; service: string }>('/health');
  }
}

export const apiClient = new ApiClient();
