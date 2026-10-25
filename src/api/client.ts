import {
  Event,
  CreateEventInput,
  UpdateEventInput,
  CutScenarioResult,
  CulturalTemplate,
  RiskAnalysisResult,
  ShareSnapshot,
  BudgetCategory,
  TimelineTask,
  Vendor,
  Guest,
} from '../../shared/types.ts';

class ApiClient {
  private async request<T>(path: string, options?: RequestInit & { signal?: AbortSignal }): Promise<T> {
    const res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });

    if (!res.ok) {
      let errData;
      try {
        errData = await res.json();
      } catch {
        throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
      }
      throw new Error(errData?.error?.message || `API request failed with status ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  // Health & AI status
  async getHealth(signal?: AbortSignal) {
    return this.request<{
      status: string;
      uptimeSeconds: number;
      aiStatus: { isKeyConfigured: boolean; activeModel: string; mode: string };
    }>('/api/health', { signal });
  }

  // Templates
  async getTemplates(signal?: AbortSignal) {
    return this.request<{ templates: CulturalTemplate[] }>('/api/templates', { signal });
  }

  async createFromTemplate(
    data: { templateId: string; date: string; name?: string; city?: string },
    signal?: AbortSignal
  ) {
    return this.request<{ event: Event }>('/api/events/from-template', {
      method: 'POST',
      body: JSON.stringify(data),
      signal,
    });
  }

  // Events CRUD
  async getEvents(signal?: AbortSignal) {
    return this.request<{ events: Event[] }>('/api/events', { signal });
  }

  async getEvent(id: string, signal?: AbortSignal) {
    return this.request<{ event: Event }>(`/api/events/${id}`, { signal });
  }

  async createEvent(input: CreateEventInput, signal?: AbortSignal) {
    return this.request<{ event: Event }>('/api/events', {
      method: 'POST',
      body: JSON.stringify(input),
      signal,
    });
  }

  async updateEvent(id: string, input: UpdateEventInput, signal?: AbortSignal) {
    return this.request<{ event: Event }>(`/api/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
      signal,
    });
  }

  async deleteEvent(id: string, signal?: AbortSignal) {
    return this.request<{ message: string }>(`/api/events/${id}`, {
      method: 'DELETE',
      signal,
    });
  }

  async resetDemoData(signal?: AbortSignal) {
    return this.request<{ message: string; events: Event[] }>('/api/events/reset', {
      method: 'POST',
      signal,
    });
  }

  // Budget & Advisor
  async proposeBudget(eventId: string, signal?: AbortSignal) {
    return this.request<{ event: Event }>(`/api/events/${eventId}/budget/propose`, {
      method: 'POST',
      signal,
    });
  }

  async calculateCutScenario(
    eventId: string,
    percentage: number,
    priorityCategories?: string[],
    signal?: AbortSignal
  ) {
    return this.request<{ scenario: CutScenarioResult }>(`/api/events/${eventId}/budget/cut-scenario`, {
      method: 'POST',
      body: JSON.stringify({ percentage, priorityCategories }),
      signal,
    });
  }

  async updateBudgetCategories(eventId: string, categories: BudgetCategory[], signal?: AbortSignal) {
    return this.request<{ event: Event }>(`/api/events/${eventId}/budget/categories`, {
      method: 'PUT',
      body: JSON.stringify({ categories }),
      signal,
    });
  }

  async addBudgetItem(
    eventId: string,
    item: { categoryId: string; name: string; amount: number; isPlannedItem?: boolean },
    signal?: AbortSignal
  ) {
    return this.request<{ event: Event }>(`/api/events/${eventId}/budget/add-item`, {
      method: 'POST',
      body: JSON.stringify(item),
      signal,
    });
  }

  // Timeline
  async generateTimeline(eventId: string, signal?: AbortSignal) {
    return this.request<{ event: Event }>(`/api/events/${eventId}/timeline/generate`, {
      method: 'POST',
      signal,
    });
  }

  async updateTimelineTask(eventId: string, taskId: string, updates: Partial<TimelineTask>, signal?: AbortSignal) {
    return this.request<{ event: Event }>(`/api/events/${eventId}/timeline/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
      signal,
    });
  }

  async addTimelineTask(eventId: string, task: Omit<TimelineTask, 'id'>, signal?: AbortSignal) {
    return this.request<{ event: Event }>(`/api/events/${eventId}/timeline/tasks`, {
      method: 'POST',
      body: JSON.stringify(task),
      signal,
    });
  }

  // Vendors
  async getVendorQuestions(category: string, eventType: string, signal?: AbortSignal) {
    return this.request<{
      category: string;
      questions: string[];
      isAiGenerated: boolean;
      fallbackUsed: boolean;
    }>(`/api/vendors/questions?category=${encodeURIComponent(category)}&eventType=${encodeURIComponent(eventType)}`, {
      signal,
    });
  }

  async addOrUpdateVendor(
    eventId: string,
    vendor: Partial<Vendor> & { category: string; name: string },
    signal?: AbortSignal
  ) {
    return this.request<{ event: Event }>(`/api/events/${eventId}/vendors`, {
      method: 'POST',
      body: JSON.stringify(vendor),
      signal,
    });
  }

  async deleteVendor(eventId: string, vendorId: string, signal?: AbortSignal) {
    return this.request<{ event: Event }>(`/api/events/${eventId}/vendors/${vendorId}`, {
      method: 'DELETE',
      signal,
    });
  }

  // Guests
  async addOrUpdateGuest(eventId: string, guest: Partial<Guest> & { name: string }, signal?: AbortSignal) {
    return this.request<{ event: Event }>(`/api/events/${eventId}/guests`, {
      method: 'POST',
      body: JSON.stringify(guest),
      signal,
    });
  }

  async deleteGuest(eventId: string, guestId: string, signal?: AbortSignal) {
    return this.request<{ event: Event }>(`/api/events/${eventId}/guests/${guestId}`, {
      method: 'DELETE',
      signal,
    });
  }

  // Ideas
  async generateIdeas(eventId: string, signal?: AbortSignal) {
    return this.request<{ ideas: any[]; isAiGenerated: boolean; fallbackUsed: boolean }>(
      `/api/events/${eventId}/ideas/generate`,
      {
        method: 'POST',
        signal,
      }
    );
  }

  // Risks
  async getRisks(eventId: string, signal?: AbortSignal) {
    return this.request<{ risks: RiskAnalysisResult }>(`/api/events/${eventId}/risks`, { signal });
  }

  // Share
  async createShareLink(eventId: string, signal?: AbortSignal) {
    return this.request<{ snapshot: ShareSnapshot }>(`/api/events/${eventId}/share`, {
      method: 'POST',
      signal,
    });
  }

  async getPublicShareSnapshot(token: string, signal?: AbortSignal) {
    return this.request<{ snapshot: ShareSnapshot }>(`/api/share/${token}`, { signal });
  }

  async revokeShareLink(eventId: string, token: string, signal?: AbortSignal) {
    return this.request<{ revoked: boolean }>(`/api/events/${eventId}/share/${token}`, {
      method: 'DELETE',
      signal,
    });
  }
}

export const api = new ApiClient();
