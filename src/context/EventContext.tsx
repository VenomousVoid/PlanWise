import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  Event,
  CreateEventInput,
  UpdateEventInput,
  BudgetCategory,
  TimelineTask,
  Vendor,
  Guest,
} from '../../shared/types.ts';
import { api } from '../api/client.ts';

interface EventContextType {
  events: Event[];
  activeEvent: Event | null;
  activeEventId: string | null;
  setActiveEventId: (id: string) => void;
  isLoading: boolean;
  error: string | null;
  aiStatus: { isKeyConfigured: boolean; activeModel: string; mode: string } | null;
  announcement: string | null;
  setAnnouncement: (msg: string) => void;
  refreshEvents: () => Promise<void>;
  createEvent: (input: CreateEventInput) => Promise<Event>;
  createFromTemplate: (templateId: string, date: string, name?: string, city?: string) => Promise<Event>;
  updateActiveEvent: (partial: UpdateEventInput) => Promise<void>;
  deleteActiveEvent: () => Promise<void>;
  resetDemoData: () => Promise<void>;
  updateBudgetCategories: (categories: BudgetCategory[]) => Promise<void>;
  addBudgetItem: (categoryId: string, name: string, amount: number, isPlannedItem?: boolean) => Promise<void>;
  updateTimelineTask: (taskId: string, updates: Partial<TimelineTask>) => Promise<void>;
  addTimelineTask: (task: Omit<TimelineTask, 'id'>) => Promise<void>;
  addOrUpdateVendor: (vendor: Partial<Vendor> & { category: string; name: string }) => Promise<void>;
  deleteVendor: (vendorId: string) => Promise<void>;
  addOrUpdateGuest: (guest: Partial<Guest> & { name: string }) => Promise<void>;
  deleteGuest: (guestId: string) => Promise<void>;
  generateIdeas: () => Promise<void>;
  refreshActiveEvent: () => Promise<void>;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<{ isKeyConfigured: boolean; activeModel: string; mode: string } | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);

  const activeEvent = events.find((e) => e.id === activeEventId) || events[0] || null;

  const refreshEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [eventsRes, healthRes] = await Promise.all([
        api.getEvents(),
        api.getHealth().catch(() => null),
      ]);
      setEvents(eventsRes.events);
      if (healthRes) {
        setAiStatus(healthRes.aiStatus);
      }
      if (!activeEventId && eventsRes.events.length > 0) {
        setActiveEventId(eventsRes.events[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setIsLoading(false);
    }
  }, [activeEventId]);

  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

  const refreshActiveEvent = async () => {
    if (!activeEvent) return;
    try {
      const res = await api.getEvent(activeEvent.id);
      setEvents((prev) => prev.map((e) => (e.id === activeEvent.id ? res.event : e)));
    } catch (err) {
      console.error(err);
    }
  };

  const createEvent = async (input: CreateEventInput): Promise<Event> => {
    const res = await api.createEvent(input);
    setEvents((prev) => [res.event, ...prev]);
    setActiveEventId(res.event.id);
    setAnnouncement(`Event "${res.event.name}" created successfully.`);
    return res.event;
  };

  const createFromTemplate = async (templateId: string, date: string, name?: string, city?: string): Promise<Event> => {
    const res = await api.createFromTemplate({ templateId, date, name, city });
    setEvents((prev) => [res.event, ...prev]);
    setActiveEventId(res.event.id);
    setAnnouncement(`Event created from template successfully.`);
    return res.event;
  };

  const updateActiveEvent = async (partial: UpdateEventInput): Promise<void> => {
    if (!activeEvent) return;
    const res = await api.updateEvent(activeEvent.id, partial);
    setEvents((prev) => prev.map((e) => (e.id === activeEvent.id ? res.event : e)));
    setAnnouncement('Event details updated.');
  };

  const deleteActiveEvent = async (): Promise<void> => {
    if (!activeEvent) return;
    await api.deleteEvent(activeEvent.id);
    setEvents((prev) => prev.filter((e) => e.id !== activeEvent.id));
    const remaining = events.filter((e) => e.id !== activeEvent.id);
    setActiveEventId(remaining[0]?.id || null);
    setAnnouncement('Event deleted.');
  };

  const resetDemoData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await api.resetDemoData();
      setEvents(res.events);
      setActiveEventId(res.events[0]?.id || null);
      setAnnouncement('Demo data restored with sample wedding, birthday and community event.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateBudgetCategories = async (categories: BudgetCategory[]): Promise<void> => {
    if (!activeEvent) return;
    const res = await api.updateBudgetCategories(activeEvent.id, categories);
    setEvents((prev) => prev.map((e) => (e.id === activeEvent.id ? res.event : e)));
    setAnnouncement('Budget categories updated.');
  };

  const addBudgetItem = async (categoryId: string, name: string, amount: number, isPlannedItem?: boolean): Promise<void> => {
    if (!activeEvent) return;
    const res = await api.addBudgetItem(activeEvent.id, { categoryId, name, amount, isPlannedItem });
    setEvents((prev) => prev.map((e) => (e.id === activeEvent.id ? res.event : e)));
    setAnnouncement(`Added ${name} to budget.`);
  };

  const updateTimelineTask = async (taskId: string, updates: Partial<TimelineTask>): Promise<void> => {
    if (!activeEvent) return;
    const res = await api.updateTimelineTask(activeEvent.id, taskId, updates);
    setEvents((prev) => prev.map((e) => (e.id === activeEvent.id ? res.event : e)));
    setAnnouncement('Task updated.');
  };

  const addTimelineTask = async (task: Omit<TimelineTask, 'id'>): Promise<void> => {
    if (!activeEvent) return;
    const res = await api.addTimelineTask(activeEvent.id, task);
    setEvents((prev) => prev.map((e) => (e.id === activeEvent.id ? res.event : e)));
    setAnnouncement('New milestone task added to timeline.');
  };

  const addOrUpdateVendor = async (vendor: Partial<Vendor> & { category: string; name: string }): Promise<void> => {
    if (!activeEvent) return;
    const res = await api.addOrUpdateVendor(activeEvent.id, vendor);
    setEvents((prev) => prev.map((e) => (e.id === activeEvent.id ? res.event : e)));
    setAnnouncement(`Vendor ${vendor.name} saved.`);
  };

  const deleteVendor = async (vendorId: string): Promise<void> => {
    if (!activeEvent) return;
    const res = await api.deleteVendor(activeEvent.id, vendorId);
    setEvents((prev) => prev.map((e) => (e.id === activeEvent.id ? res.event : e)));
    setAnnouncement('Vendor removed.');
  };

  const addOrUpdateGuest = async (guest: Partial<Guest> & { name: string }): Promise<void> => {
    if (!activeEvent) return;
    const res = await api.addOrUpdateGuest(activeEvent.id, guest);
    setEvents((prev) => prev.map((e) => (e.id === activeEvent.id ? res.event : e)));
    setAnnouncement(`Guest ${guest.name} saved.`);
  };

  const deleteGuest = async (guestId: string): Promise<void> => {
    if (!activeEvent) return;
    const res = await api.deleteGuest(activeEvent.id, guestId);
    setEvents((prev) => prev.map((e) => (e.id === activeEvent.id ? res.event : e)));
    setAnnouncement('Guest removed.');
  };

  const generateIdeas = async (): Promise<void> => {
    if (!activeEvent) return;
    const res = await api.generateIdeas(activeEvent.id);
    if (res) {
      await refreshActiveEvent();
      setAnnouncement(res.isAiGenerated ? 'New AI ideas generated.' : 'Curated template ideas loaded.');
    }
  };

  return (
    <EventContext.Provider
      value={{
        events,
        activeEvent,
        activeEventId,
        setActiveEventId,
        isLoading,
        error,
        aiStatus,
        announcement,
        setAnnouncement,
        refreshEvents,
        createEvent,
        createFromTemplate,
        updateActiveEvent,
        deleteActiveEvent,
        resetDemoData,
        updateBudgetCategories,
        addBudgetItem,
        updateTimelineTask,
        addTimelineTask,
        addOrUpdateVendor,
        deleteVendor,
        addOrUpdateGuest,
        deleteGuest,
        generateIdeas,
        refreshActiveEvent,
      }}
    >
      {children}
    </EventContext.Provider>
  );
};

export function useEvent() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvent must be used within an EventProvider');
  }
  return context;
}
