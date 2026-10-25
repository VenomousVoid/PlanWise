import { Event } from '../../shared/types.ts';
import { SEED_EVENTS } from '../data/seed.ts';

export interface EventRepository {
  findAll(): Promise<Event[]>;
  findById(id: string): Promise<Event | null>;
  create(event: Event): Promise<Event>;
  update(id: string, partial: Partial<Event>): Promise<Event | null>;
  delete(id: string): Promise<boolean>;
  reset(): Promise<Event[]>;
}

export class InMemoryEventRepository implements EventRepository {
  private events: Map<string, Event> = new Map();

  constructor() {
    this.resetSync();
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  private resetSync(): void {
    this.events.clear();
    for (const event of SEED_EVENTS) {
      this.events.set(event.id, this.deepClone(event));
    }
  }

  async findAll(): Promise<Event[]> {
    return Array.from(this.events.values()).map((e) => this.deepClone(e));
  }

  async findById(id: string): Promise<Event | null> {
    const event = this.events.get(id);
    if (!event) return null;
    return this.deepClone(event);
  }

  async create(event: Event): Promise<Event> {
    const clone = this.deepClone(event);
    this.events.set(clone.id, clone);
    return this.deepClone(clone);
  }

  async update(id: string, partial: Partial<Event>): Promise<Event | null> {
    const existing = this.events.get(id);
    if (!existing) return null;

    const updated: Event = {
      ...existing,
      ...partial,
      updatedAt: new Date().toISOString(),
    };
    this.events.set(id, this.deepClone(updated));
    return this.deepClone(updated);
  }

  async delete(id: string): Promise<boolean> {
    return this.events.delete(id);
  }

  async reset(): Promise<Event[]> {
    this.resetSync();
    return this.findAll();
  }
}

export const eventRepository = new InMemoryEventRepository();
