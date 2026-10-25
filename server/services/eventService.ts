import crypto from 'crypto';
import {
  Event,
  CreateEventInput,
  UpdateEventInput,
  BudgetCategory,
  TimelineTask,
  Vendor,
  Guest,
  Idea,
  CutScenarioResult,
  RiskAnalysisResult,
  ShareSnapshot,
} from '../../shared/types.ts';
import { eventRepository } from '../repositories/eventRepository.ts';
import { shareRepository } from '../repositories/shareRepository.ts';
import { CULTURAL_TEMPLATES } from '../data/templates.ts';
import { normalizeBudgetAllocations, DEFAULT_CATEGORY_SPECS } from '../logic/budgetEngine.ts';
import { calculateBudgetCut, generateDeterministicCutExplanation } from '../logic/cutEngine.ts';
import { generateTimelineSchedule } from '../logic/timelineEngine.ts';
import { evaluateEventRisks } from '../logic/riskEngine.ts';
import { geminiClientService } from '../ai/geminiClient.ts';

export class EventService {
  async getAll(): Promise<Event[]> {
    return eventRepository.findAll();
  }

  async getById(id: string): Promise<Event | null> {
    return eventRepository.findById(id);
  }

  async create(input: CreateEventInput): Promise<Event> {
    const id = `event-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();

    // Generate initial normalized budget
    const specs = DEFAULT_CATEGORY_SPECS[input.type] || DEFAULT_CATEGORY_SPECS.wedding;
    const budgetCategories = normalizeBudgetAllocations(input.totalBudget, specs);

    // Generate initial timeline
    const timelineTasks = generateTimelineSchedule(input.date, input.type);

    // Initial starter vendors
    const defaultVendors: Vendor[] = [
      {
        id: `v-${Date.now().toString(36)}-1`,
        category: 'venue',
        name: 'Prime Venue Selection Pending',
        status: 'to-contact',
        quotedAmount: 0,
        paidAmount: 0,
      },
      {
        id: `v-${Date.now().toString(36)}-2`,
        category: 'catering',
        name: 'Preferred Feast Caterers',
        status: 'to-contact',
        quotedAmount: 0,
        paidAmount: 0,
      },
    ];

    const newEvent: Event = {
      ...input,
      id,
      budgetCategories,
      timelineTasks,
      vendors: defaultVendors,
      guests: [],
      ideas: [],
      createdAt: now,
      updatedAt: now,
    };

    return eventRepository.create(newEvent);
  }

  async createFromTemplate(templateId: string, eventDate: string, customName?: string, city?: string): Promise<Event> {
    const template = CULTURAL_TEMPLATES.find((t) => t.id === templateId);
    if (!template) {
      throw new Error(`Cultural template with id '${templateId}' not found`);
    }

    const id = `event-tpl-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();

    // Map template category specs with weights
    const categorySpecs = template.defaultCategories.map((c) => ({
      id: c.id,
      name: c.name,
      weight: c.weight,
      priorityTier: c.priorityTier,
    }));

    const budgetCategories = normalizeBudgetAllocations(template.budgetDefault, categorySpecs);

    // Calculate dates for template tasks
    const eventTime = new Date(eventDate + 'T00:00:00Z').getTime();
    const timelineTasks: TimelineTask[] = template.defaultTasks.map((t, idx) => {
      const dueMs = eventTime - t.daysBeforeEvent * 24 * 60 * 60 * 1000;
      const dueDate = new Date(Math.max(Date.now(), dueMs)).toISOString().split('T')[0];
      return {
        id: `task-tpl-${idx}-${Date.now().toString(36)}`,
        title: t.title,
        description: t.description || `Sub-event task for ${template.name}`,
        dueDate,
        daysBeforeEvent: t.daysBeforeEvent,
        category: t.category,
        status: 'todo',
        priority: t.priority,
        isAiSuggested: false,
      };
    });

    const vendors: Vendor[] = template.defaultVendors.map((v, idx) => ({
      id: `v-tpl-${idx}-${Date.now().toString(36)}`,
      category: v.category,
      name: v.suggestedRole,
      status: 'to-contact',
      quotedAmount: 0,
      paidAmount: 0,
    }));

    const createdEvent: Event = {
      id,
      name: customName || template.name,
      type: template.eventType,
      date: eventDate,
      city: city || 'New Delhi',
      guestCount: template.guestCountDefault,
      totalBudget: template.budgetDefault,
      styleTheme: template.styleThemeDefault,
      preferences: { ...template.preferencesDefault },
      budgetCategories,
      timelineTasks,
      vendors,
      guests: [],
      ideas: [],
      createdAt: now,
      updatedAt: now,
    };

    return eventRepository.create(createdEvent);
  }

  async update(id: string, input: UpdateEventInput): Promise<Event | null> {
    const existing = await eventRepository.findById(id);
    if (!existing) return null;

    // If totalBudget changed, renormalize allocations preserving actual spends
    let updatedCategories = existing.budgetCategories;
    if (input.totalBudget && input.totalBudget !== existing.totalBudget) {
      const currentSpecs = existing.budgetCategories.map((c) => ({
        id: c.id,
        name: c.name,
        weight: c.allocatedAmount > 0 ? c.allocatedAmount : 1,
        priorityTier: c.priorityTier,
        notes: c.notes,
      }));
      updatedCategories = normalizeBudgetAllocations(input.totalBudget, currentSpecs, existing.budgetCategories);
    }

    return eventRepository.update(id, {
      ...input,
      budgetCategories: updatedCategories,
    });
  }

  async delete(id: string): Promise<boolean> {
    return eventRepository.delete(id);
  }

  async reset(): Promise<Event[]> {
    return eventRepository.reset();
  }

  // Budget Optimization & Proposals
  async proposeBudget(eventId: string): Promise<Event | null> {
    const event = await eventRepository.findById(eventId);
    if (!event) return null;

    const specs = DEFAULT_CATEGORY_SPECS[event.type] || DEFAULT_CATEGORY_SPECS.wedding;
    const normalized = normalizeBudgetAllocations(event.totalBudget, specs, event.budgetCategories);

    return eventRepository.update(eventId, { budgetCategories: normalized });
  }

  // Smart Budget Advisor & Cut Scenario
  async calculateCutScenario(
    eventId: string,
    percentage: number,
    priorityCategories?: string[]
  ): Promise<CutScenarioResult | null> {
    const event = await eventRepository.findById(eventId);
    if (!event) return null;

    // Step 1: Pure deterministic number & constraints calculation
    const deterministicCut = calculateBudgetCut(event.totalBudget, event.budgetCategories, {
      percentage,
      guestCount: event.guestCount,
      priorityCategories,
    });

    // Step 2: Plain-language AI advisory (with deterministic fallback)
    const aiResult = await geminiClientService.getBudgetAdvice({
      eventType: event.type,
      totalBudget: event.totalBudget,
      guestCount: event.guestCount,
      city: event.city,
      preferences: `${event.preferences.foodPreference}, ${event.preferences.venueType}, ${event.preferences.culturalTradition}. ${event.preferences.notes || ''}`,
      cutPercent: deterministicCut.requestedCutPercent,
      savedAmount: deterministicCut.totalSaved,
    });

    const fallbackExpl = generateDeterministicCutExplanation(deterministicCut);

    return {
      ...deterministicCut,
      tradeOffExplanation: aiResult.data.tradeOffExplanation || fallbackExpl.tradeOffExplanation,
      alternativeSuggestions:
        aiResult.data.alternativeSuggestions && aiResult.data.alternativeSuggestions.length > 0
          ? aiResult.data.alternativeSuggestions
          : fallbackExpl.alternativeSuggestions,
      isAiGenerated: aiResult.isAiGenerated,
      modelUsed: aiResult.modelUsed,
    };
  }

  // Update budget categories directly
  async updateBudgetCategories(eventId: string, categories: BudgetCategory[]): Promise<Event | null> {
    const event = await eventRepository.findById(eventId);
    if (!event) return null;

    // Recalculate total budget from categories
    const newTotal = categories.reduce((sum, c) => sum + c.allocatedAmount, 0);

    return eventRepository.update(eventId, {
      budgetCategories: categories,
      totalBudget: newTotal > 0 ? newTotal : event.totalBudget,
    });
  }

  // Add idea or planned item to a category
  async addBudgetItem(
    eventId: string,
    categoryId: string,
    item: { name: string; amount: number; isPlannedItem?: boolean }
  ): Promise<Event | null> {
    const event = await eventRepository.findById(eventId);
    if (!event) return null;

    const categories = event.budgetCategories.map((cat) => {
      if (cat.id === categoryId) {
        const newItem = {
          id: `item-${Date.now().toString(36)}-${crypto.randomBytes(2).toString('hex')}`,
          name: item.name,
          amount: item.amount,
          isPlannedItem: item.isPlannedItem ?? true,
        };
        const updatedItems = [...cat.items, newItem];
        // Quoted/booked amounts feed into the budget actuals
        const updatedActualSpend = cat.actualSpend + (item.isPlannedItem ? 0 : item.amount);
        return {
          ...cat,
          items: updatedItems,
          actualSpend: updatedActualSpend,
        };
      }
      return cat;
    });

    return eventRepository.update(eventId, { budgetCategories: categories });
  }

  // Timeline generation
  async generateTimeline(eventId: string): Promise<Event | null> {
    const event = await eventRepository.findById(eventId);
    if (!event) return null;

    const newTasks = generateTimelineSchedule(event.date, event.type);
    return eventRepository.update(eventId, { timelineTasks: newTasks });
  }

  // Update task
  async updateTimelineTask(eventId: string, taskId: string, updates: Partial<TimelineTask>): Promise<Event | null> {
    const event = await eventRepository.findById(eventId);
    if (!event) return null;

    const updatedTasks = event.timelineTasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t));
    return eventRepository.update(eventId, { timelineTasks: updatedTasks });
  }

  // Add task
  async addTimelineTask(eventId: string, task: Omit<TimelineTask, 'id'>): Promise<Event | null> {
    const event = await eventRepository.findById(eventId);
    if (!event) return null;

    const newTask: TimelineTask = {
      ...task,
      id: `task-${Date.now().toString(36)}-${crypto.randomBytes(2).toString('hex')}`,
    };

    return eventRepository.update(eventId, {
      timelineTasks: [...event.timelineTasks, newTask],
    });
  }

  // Vendor operations
  async addOrUpdateVendor(eventId: string, vendor: Partial<Vendor> & { category: string; name: string }): Promise<Event | null> {
    const event = await eventRepository.findById(eventId);
    if (!event) return null;

    let updatedVendors: Vendor[];
    const vendorId = vendor.id || `v-${Date.now().toString(36)}-${crypto.randomBytes(2).toString('hex')}`;

    const existingIndex = event.vendors.findIndex((v) => v.id === vendorId);
    if (existingIndex >= 0) {
      updatedVendors = event.vendors.map((v) => (v.id === vendorId ? ({ ...v, ...vendor } as Vendor) : v));
    } else {
      const newVendor: Vendor = {
        id: vendorId,
        category: vendor.category,
        name: vendor.name,
        contactPerson: vendor.contactPerson,
        phone: vendor.phone,
        email: vendor.email,
        status: vendor.status || 'to-contact',
        quotedAmount: vendor.quotedAmount || 0,
        paidAmount: vendor.paidAmount || 0,
        notes: vendor.notes,
      };
      updatedVendors = [...event.vendors, newVendor];
    }

    // Quoted/booked amounts feed into the budget category actuals
    const targetCategory = vendor.category;
    const categoryVendors = updatedVendors.filter((v) => v.category === targetCategory);
    const totalVendorSpend = categoryVendors.reduce((sum, v) => {
      if (v.status === 'booked' || v.status === 'paid') {
        return sum + Math.max(v.paidAmount, v.quotedAmount);
      }
      return sum;
    }, 0);

    const updatedBudgetCategories = event.budgetCategories.map((c) => {
      if (c.id === targetCategory && totalVendorSpend > 0) {
        return { ...c, actualSpend: Math.max(c.actualSpend, totalVendorSpend) };
      }
      return c;
    });

    return eventRepository.update(eventId, {
      vendors: updatedVendors,
      budgetCategories: updatedBudgetCategories,
    });
  }

  async deleteVendor(eventId: string, vendorId: string): Promise<Event | null> {
    const event = await eventRepository.findById(eventId);
    if (!event) return null;

    const filtered = event.vendors.filter((v) => v.id !== vendorId);
    return eventRepository.update(eventId, { vendors: filtered });
  }

  // Guest operations
  async addOrUpdateGuest(eventId: string, guest: Partial<Guest> & { name: string }): Promise<Event | null> {
    const event = await eventRepository.findById(eventId);
    if (!event) return null;

    const guestId = guest.id || `g-${Date.now().toString(36)}-${crypto.randomBytes(2).toString('hex')}`;
    let updatedGuests: Guest[];

    const existingIndex = event.guests.findIndex((g) => g.id === guestId);
    if (existingIndex >= 0) {
      updatedGuests = event.guests.map((g) => (g.id === guestId ? ({ ...g, ...guest } as Guest) : g));
    } else {
      const newGuest: Guest = {
        id: guestId,
        name: guest.name,
        groupSide: guest.groupSide || 'general',
        dietary: guest.dietary || 'veg',
        rsvpStatus: guest.rsvpStatus || 'pending',
        plusOnes: guest.plusOnes || 0,
        notes: guest.notes,
      };
      updatedGuests = [...event.guests, newGuest];
    }

    return eventRepository.update(eventId, { guests: updatedGuests });
  }

  async deleteGuest(eventId: string, guestId: string): Promise<Event | null> {
    const event = await eventRepository.findById(eventId);
    if (!event) return null;

    const filtered = event.guests.filter((g) => g.id !== guestId);
    return eventRepository.update(eventId, { guests: filtered });
  }

  // Ideas generation
  async generateIdeas(eventId: string): Promise<{ ideas: Idea[]; isAiGenerated: boolean; fallbackUsed: boolean } | null> {
    const event = await eventRepository.findById(eventId);
    if (!event) return null;

    const result = await geminiClientService.getIdeas({
      eventType: event.type,
      styleTheme: event.styleTheme,
      city: event.city,
      totalBudget: event.totalBudget,
      guestCount: event.guestCount,
      foodPreference: event.preferences.foodPreference,
      venueType: event.preferences.venueType,
      notes: event.preferences.notes,
    });

    await eventRepository.update(eventId, { ideas: result.data });

    return {
      ideas: result.data,
      isAiGenerated: result.isAiGenerated,
      fallbackUsed: result.fallbackUsed,
    };
  }

  // Risks evaluation
  async getRisks(eventId: string): Promise<RiskAnalysisResult | null> {
    const event = await eventRepository.findById(eventId);
    if (!event) return null;

    return evaluateEventRisks(event);
  }

  // Share snapshots
  async createShareLink(eventId: string): Promise<ShareSnapshot | null> {
    const event = await eventRepository.findById(eventId);
    if (!event) return null;

    return shareRepository.createSnapshot(event, 24);
  }

  async getShareSnapshot(token: string): Promise<ShareSnapshot | null> {
    return shareRepository.findByToken(token);
  }

  async revokeShareLink(token: string): Promise<boolean> {
    return shareRepository.revoke(token);
  }
}

export const eventService = new EventService();
