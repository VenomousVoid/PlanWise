import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { eventService } from '../services/eventService.ts';
import { CULTURAL_TEMPLATES } from '../data/templates.ts';
import { geminiClientService } from '../ai/geminiClient.ts';
import {
  CreateEventInputSchema,
  UpdateEventInputSchema,
  CutScenarioRequestSchema,
  BudgetCategorySchema,
  TimelineTaskSchema,
  VendorSchema,
  GuestSchema,
} from '../../shared/types.ts';
import { validateBody } from '../middleware/validate.ts';
import { aiEndpointLimiter } from '../middleware/rateLimiter.ts';

export const apiRouter = Router();

// Health & System Status Check
apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    aiStatus: {
      isKeyConfigured: geminiClientService.isKeyConfigured(),
      activeModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      mode: geminiClientService.isKeyConfigured() ? 'live_gemini' : 'deterministic_fallback',
    },
  });
});

// Cultural Templates List
apiRouter.get('/templates', (req: Request, res: Response) => {
  res.json({ templates: CULTURAL_TEMPLATES });
});

// Create Event from Cultural Template
apiRouter.post(
  '/events/from-template',
  validateBody(
    z.object({
      templateId: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
      name: z.string().max(100).optional(),
      city: z.string().max(50).optional(),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = await eventService.createFromTemplate(
        req.body.templateId,
        req.body.date,
        req.body.name,
        req.body.city
      );
      res.status(201).json({ event });
    } catch (err) {
      next(err);
    }
  }
);

// Reset seed demo data
apiRouter.post('/events/reset', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await eventService.reset();
    res.json({ message: 'Demo data restored successfully', events });
  } catch (err) {
    next(err);
  }
});

// List all events
apiRouter.get('/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await eventService.getAll();
    res.json({ events });
  } catch (err) {
    next(err);
  }
});

// Get single event
apiRouter.get('/events/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await eventService.getById(req.params.id);
    if (!event) {
      res.status(404).json({ error: { message: 'Event not found', code: 'NOT_FOUND' } });
      return;
    }
    res.json({ event });
  } catch (err) {
    next(err);
  }
});

// Create event
apiRouter.post(
  '/events',
  validateBody(CreateEventInputSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = await eventService.create(req.body);
      res.status(201).json({ event });
    } catch (err) {
      next(err);
    }
  }
);

// Update event
apiRouter.put(
  '/events/:id',
  validateBody(UpdateEventInputSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = await eventService.update(req.params.id, req.body);
      if (!event) {
        res.status(404).json({ error: { message: 'Event not found', code: 'NOT_FOUND' } });
        return;
      }
      res.json({ event });
    } catch (err) {
      next(err);
    }
  }
);

// Delete event
apiRouter.delete('/events/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const success = await eventService.delete(req.params.id);
    if (!success) {
      res.status(404).json({ error: { message: 'Event not found', code: 'NOT_FOUND' } });
      return;
    }
    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// Propose budget allocation
apiRouter.post('/events/:id/budget/propose', aiEndpointLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await eventService.proposeBudget(req.params.id);
    if (!event) {
      res.status(404).json({ error: { message: 'Event not found', code: 'NOT_FOUND' } });
      return;
    }
    res.json({ event });
  } catch (err) {
    next(err);
  }
});

// Calculate Cut Scenario (Smart Budget Advisor)
apiRouter.post(
  '/events/:id/budget/cut-scenario',
  aiEndpointLimiter,
  validateBody(CutScenarioRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const scenario = await eventService.calculateCutScenario(
        req.params.id,
        req.body.percentage,
        req.body.priorityCategories
      );
      if (!scenario) {
        res.status(404).json({ error: { message: 'Event not found', code: 'NOT_FOUND' } });
        return;
      }
      res.json({ scenario });
    } catch (err) {
      next(err);
    }
  }
);

// Update budget categories
apiRouter.put(
  '/events/:id/budget/categories',
  validateBody(z.object({ categories: z.array(BudgetCategorySchema) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = await eventService.updateBudgetCategories(req.params.id, req.body.categories);
      if (!event) {
        res.status(404).json({ error: { message: 'Event not found', code: 'NOT_FOUND' } });
        return;
      }
      res.json({ event });
    } catch (err) {
      next(err);
    }
  }
);

// Add item to budget category (or push idea to budget)
apiRouter.post(
  '/events/:id/budget/add-item',
  validateBody(
    z.object({
      categoryId: z.string(),
      name: z.string().min(1).max(100),
      amount: z.number().int().nonnegative(),
      isPlannedItem: z.boolean().optional(),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = await eventService.addBudgetItem(req.params.id, req.body.categoryId, {
        name: req.body.name,
        amount: req.body.amount,
        isPlannedItem: req.body.isPlannedItem,
      });
      if (!event) {
        res.status(404).json({ error: { message: 'Event not found', code: 'NOT_FOUND' } });
        return;
      }
      res.json({ event });
    } catch (err) {
      next(err);
    }
  }
);

// Timeline generate
apiRouter.post('/events/:id/timeline/generate', aiEndpointLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await eventService.generateTimeline(req.params.id);
    if (!event) {
      res.status(404).json({ error: { message: 'Event not found', code: 'NOT_FOUND' } });
      return;
    }
    res.json({ event });
  } catch (err) {
    next(err);
  }
});

// Update timeline task
apiRouter.put(
  '/events/:id/timeline/tasks/:taskId',
  validateBody(TimelineTaskSchema.partial()),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = await eventService.updateTimelineTask(req.params.id, req.params.taskId, req.body);
      if (!event) {
        res.status(404).json({ error: { message: 'Event not found', code: 'NOT_FOUND' } });
        return;
      }
      res.json({ event });
    } catch (err) {
      next(err);
    }
  }
);

// Add timeline task
apiRouter.post(
  '/events/:id/timeline/tasks',
  validateBody(TimelineTaskSchema.omit({ id: true })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = await eventService.addTimelineTask(req.params.id, req.body);
      if (!event) {
        res.status(404).json({ error: { message: 'Event not found', code: 'NOT_FOUND' } });
        return;
      }
      res.json({ event });
    } catch (err) {
      next(err);
    }
  }
);

// Vendor Questions to ask (AI or Fallback)
apiRouter.get('/vendors/questions', aiEndpointLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = (req.query.category as string) || 'venue';
    const eventType = (req.query.eventType as string) || 'wedding';
    const result = await geminiClientService.getVendorQuestions(category, eventType);
    res.json({
      category,
      questions: result.data,
      isAiGenerated: result.isAiGenerated,
      fallbackUsed: result.fallbackUsed,
    });
  } catch (err) {
    next(err);
  }
});

// Add or update vendor
apiRouter.post(
  '/events/:id/vendors',
  validateBody(VendorSchema.partial().and(z.object({ category: z.string(), name: z.string().min(1) }))),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = await eventService.addOrUpdateVendor(req.params.id, req.body);
      if (!event) {
        res.status(404).json({ error: { message: 'Event not found', code: 'NOT_FOUND' } });
        return;
      }
      res.json({ event });
    } catch (err) {
      next(err);
    }
  }
);

// Delete vendor
apiRouter.delete('/events/:id/vendors/:vendorId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await eventService.deleteVendor(req.params.id, req.params.vendorId);
    if (!event) {
      res.status(404).json({ error: { message: 'Event not found', code: 'NOT_FOUND' } });
      return;
    }
    res.json({ event });
  } catch (err) {
    next(err);
  }
});

// Add or update guest
apiRouter.post(
  '/events/:id/guests',
  validateBody(GuestSchema.partial().and(z.object({ name: z.string().min(1) }))),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = await eventService.addOrUpdateGuest(req.params.id, req.body);
      if (!event) {
        res.status(404).json({ error: { message: 'Event not found', code: 'NOT_FOUND' } });
        return;
      }
      res.json({ event });
    } catch (err) {
      next(err);
    }
  }
);

// Delete guest
apiRouter.delete('/events/:id/guests/:guestId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await eventService.deleteGuest(req.params.id, req.params.guestId);
    if (!event) {
      res.status(404).json({ error: { message: 'Event not found', code: 'NOT_FOUND' } });
      return;
    }
    res.json({ event });
  } catch (err) {
    next(err);
  }
});

// Generate ideas
apiRouter.post('/events/:id/ideas/generate', aiEndpointLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await eventService.generateIdeas(req.params.id);
    if (!result) {
      res.status(404).json({ error: { message: 'Event not found', code: 'NOT_FOUND' } });
      return;
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Evaluate risks
apiRouter.get('/events/:id/risks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const risks = await eventService.getRisks(req.params.id);
    if (!risks) {
      res.status(404).json({ error: { message: 'Event not found', code: 'NOT_FOUND' } });
      return;
    }
    res.json({ risks });
  } catch (err) {
    next(err);
  }
});

// Create cryptographic share link
apiRouter.post('/events/:id/share', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const snapshot = await eventService.createShareLink(req.params.id);
    if (!snapshot) {
      res.status(404).json({ error: { message: 'Event not found', code: 'NOT_FOUND' } });
      return;
    }
    res.json({ snapshot });
  } catch (err) {
    next(err);
  }
});

// Public read-only share link endpoint (sanitized snapshot)
apiRouter.get('/share/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const snapshot = await eventService.getShareSnapshot(req.params.token);
    if (!snapshot) {
      res.status(404).json({
        error: {
          message: 'This shared event link has expired or been revoked.',
          code: 'SHARE_LINK_INVALID',
        },
      });
      return;
    }

    // Return sanitized snapshot without internal or contact private info
    res.json({
      snapshot: {
        token: snapshot.token,
        createdAt: snapshot.createdAt,
        expiresAt: snapshot.expiresAt,
        event: {
          id: snapshot.event.id,
          name: snapshot.event.name,
          type: snapshot.event.type,
          date: snapshot.event.date,
          city: snapshot.event.city,
          guestCount: snapshot.event.guestCount,
          totalBudget: snapshot.event.totalBudget,
          styleTheme: snapshot.event.styleTheme,
          preferences: snapshot.event.preferences,
          budgetCategories: snapshot.event.budgetCategories,
          timelineTasks: snapshot.event.timelineTasks,
          vendors: snapshot.event.vendors.map((v) => ({
            id: v.id,
            category: v.category,
            name: v.name,
            status: v.status,
            quotedAmount: v.quotedAmount,
          })),
          guestsSummary: {
            totalCount: snapshot.event.guests.length,
            confirmed: snapshot.event.guests.filter((g) => g.rsvpStatus === 'yes').length,
          },
          ideas: snapshot.event.ideas,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// Revoke share link
apiRouter.delete('/events/:id/share/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const revoked = await eventService.revokeShareLink(req.params.token);
    res.json({ revoked });
  } catch (err) {
    next(err);
  }
});
