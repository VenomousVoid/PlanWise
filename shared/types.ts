import { z } from 'zod';

export const EventTypeEnum = z.enum(['wedding', 'birthday', 'community']);
export type EventType = z.infer<typeof EventTypeEnum>;

export const PriorityTierEnum = z.enum(['must-have', 'important', 'nice-to-have']);
export type PriorityTier = z.infer<typeof PriorityTierEnum>;

export const TaskStatusEnum = z.enum(['todo', 'doing', 'done']);
export type TaskStatus = z.infer<typeof TaskStatusEnum>;

export const TaskPriorityEnum = z.enum(['urgent', 'high', 'medium', 'low']);
export type TaskPriority = z.infer<typeof TaskPriorityEnum>;

export const VendorStatusEnum = z.enum(['to-contact', 'contacted', 'quoted', 'booked', 'paid']);
export type VendorStatus = z.infer<typeof VendorStatusEnum>;

export const RsvpStatusEnum = z.enum(['pending', 'yes', 'no', 'maybe']);
export type RsvpStatus = z.infer<typeof RsvpStatusEnum>;

export const DietaryEnum = z.enum(['veg', 'non-veg', 'jain', 'vegan']);
export type Dietary = z.infer<typeof DietaryEnum>;

export const RiskSeverityEnum = z.enum(['high', 'medium', 'low']);
export type RiskSeverity = z.infer<typeof RiskSeverityEnum>;

export const FoodPreferenceEnum = z.enum(['veg', 'non-veg', 'both', 'jain']);
export type FoodPreference = z.infer<typeof FoodPreferenceEnum>;

export const VenueTypeEnum = z.enum(['indoor', 'outdoor', 'both']);
export type VenueType = z.infer<typeof VenueTypeEnum>;

// BudgetItem Schema
export const BudgetItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Item name is required').max(100),
  amount: z.number().int().nonnegative('Amount must be non-negative'),
  isPlannedItem: z.boolean().optional(),
});
export type BudgetItem = z.infer<typeof BudgetItemSchema>;

// BudgetCategory Schema
export const BudgetCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  priorityTier: PriorityTierEnum,
  allocatedAmount: z.number().int().nonnegative(),
  actualSpend: z.number().int().nonnegative().default(0),
  notes: z.string().max(500).optional(),
  items: z.array(BudgetItemSchema).default([]),
});
export type BudgetCategory = z.infer<typeof BudgetCategorySchema>;

// Task Schema
export const TimelineTaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required').max(150),
  description: z.string().max(500).optional(),
  dueDate: z.string(), // ISO string YYYY-MM-DD
  daysBeforeEvent: z.number().int(),
  category: z.string(),
  status: TaskStatusEnum.default('todo'),
  priority: TaskPriorityEnum.default('medium'),
  isAiSuggested: z.boolean().optional(),
});
export type TimelineTask = z.infer<typeof TimelineTaskSchema>;

// Vendor Schema
export const VendorSchema = z.object({
  id: z.string(),
  category: z.string().min(1, 'Category is required'),
  name: z.string().min(1, 'Vendor name is required').max(100),
  contactPerson: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  status: VendorStatusEnum.default('to-contact'),
  quotedAmount: z.number().int().nonnegative().default(0),
  paidAmount: z.number().int().nonnegative().default(0),
  notes: z.string().max(500).optional(),
});
export type Vendor = z.infer<typeof VendorSchema>;

// Guest Schema
export const GuestSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Guest name is required').max(100),
  groupSide: z.enum(['groom', 'bride', 'family', 'friends', 'colleagues', 'general']).default('general'),
  dietary: DietaryEnum.default('veg'),
  rsvpStatus: RsvpStatusEnum.default('pending'),
  plusOnes: z.number().int().min(0).max(10).default(0),
  notes: z.string().max(200).optional(),
});
export type Guest = z.infer<typeof GuestSchema>;

// Idea Schema
export const IdeaSchema = z.object({
  id: z.string(),
  category: z.string(),
  title: z.string().min(1).max(150),
  description: z.string().max(500),
  estimatedCostMin: z.number().int().nonnegative(),
  estimatedCostMax: z.number().int().nonnegative(),
  tags: z.array(z.string()).default([]),
});
export type Idea = z.infer<typeof IdeaSchema>;

// Event Preferences Schema
export const EventPreferencesSchema = z.object({
  foodPreference: FoodPreferenceEnum.default('veg'),
  venueType: VenueTypeEnum.default('indoor'),
  culturalTradition: z.string().max(100).default('Contemporary Indian'),
  notes: z.string().max(500).optional(),
});
export type EventPreferences = z.infer<typeof EventPreferencesSchema>;

// Event Schema
export const EventSchema = z.object({
  id: z.string(),
  name: z.string().min(2, 'Event name must be at least 2 characters').max(100),
  type: EventTypeEnum,
  date: z.string(), // ISO string YYYY-MM-DD
  city: z.string().min(2, 'City is required').max(50),
  guestCount: z.number().int().min(1, 'Guest count must be at least 1').max(5000),
  totalBudget: z.number().int().min(1000, 'Total budget must be at least ₹1,000').max(100000000),
  styleTheme: z.string().min(2).max(100),
  preferences: EventPreferencesSchema,
  budgetCategories: z.array(BudgetCategorySchema).default([]),
  timelineTasks: z.array(TimelineTaskSchema).default([]),
  vendors: z.array(VendorSchema).default([]),
  guests: z.array(GuestSchema).default([]),
  ideas: z.array(IdeaSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Event = z.infer<typeof EventSchema>;

// Input for creating an event
export const CreateEventInputSchema = z.object({
  name: z.string().trim().min(2, 'Event name must be at least 2 characters').max(100),
  type: EventTypeEnum,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  city: z.string().trim().min(2, 'City is required').max(50),
  guestCount: z.number().int().min(1, 'Guest count must be at least 1').max(5000),
  totalBudget: z.number().int().min(1000, 'Total budget must be at least ₹1,000').max(100000000),
  styleTheme: z.string().trim().min(2, 'Style or theme is required').max(100),
  preferences: EventPreferencesSchema,
});
export type CreateEventInput = z.infer<typeof CreateEventInputSchema>;

// Input for updating an event
export const UpdateEventInputSchema = CreateEventInputSchema.partial();
export type UpdateEventInput = z.infer<typeof UpdateEventInputSchema>;

// Cut Scenario Types
export const CutScenarioRequestSchema = z.object({
  percentage: z.number().min(1).max(50),
  priorityCategories: z.array(z.string()).optional(),
});
export type CutScenarioRequest = z.infer<typeof CutScenarioRequestSchema>;

export interface CategoryCutResult {
  categoryId: string;
  categoryName: string;
  priorityTier: PriorityTier;
  beforeAmount: number;
  afterAmount: number;
  savedAmount: number;
  percentCut: number;
  floorApplied: boolean;
}

export interface CutScenarioResult {
  requestedCutPercent: number;
  originalTotalBudget: number;
  newTotalBudget: number;
  totalSaved: number;
  originalPerGuestCost: number;
  newPerGuestCost: number;
  categories: CategoryCutResult[];
  tradeOffExplanation: string;
  alternativeSuggestions: string[];
  isAiGenerated: boolean;
  modelUsed?: string;
}

// Risk Analysis Types
export interface RiskItem {
  id: string;
  ruleId: string;
  severity: RiskSeverity;
  title: string;
  description: string;
  mitigationSuggestion: string;
  isAiEnhanced: boolean;
}

export interface RiskAnalysisResult {
  eventId: string;
  overallScore: number; // 0 to 100 health score
  risks: RiskItem[];
  checkedAt: string;
  isAiEnhanced: boolean;
}

// Cultural / Regional Template
export interface CulturalTemplate {
  id: string;
  name: string;
  description: string;
  eventType: EventType;
  guestCountDefault: number;
  budgetDefault: number;
  styleThemeDefault: string;
  subEvents: string[];
  preferencesDefault: EventPreferences;
  defaultCategories: Array<{
    id: string;
    name: string;
    weight: number; // percentage, e.g. 25
    priorityTier: PriorityTier;
  }>;
  defaultTasks: Array<{
    title: string;
    daysBeforeEvent: number;
    category: string;
    priority: TaskPriority;
    description?: string;
  }>;
  defaultVendors: Array<{
    category: string;
    suggestedRole: string;
  }>;
}

// Share Snapshot
export interface ShareSnapshot {
  token: string;
  eventId: string;
  event: Omit<Event, 'updatedAt'>;
  createdAt: string;
  expiresAt: string;
  isRevoked: boolean;
}
