import { EventType, TimelineTask, TaskPriority } from '../../shared/types.ts';

interface MilestoneTemplate {
  title: string;
  category: string;
  priority: TaskPriority;
  standardDaysBefore: number;
  compressedDaysBefore: number;
  description: string;
}

const MILESTONES_BY_TYPE: Record<EventType, MilestoneTemplate[]> = {
  wedding: [
    { title: 'Book Ceremony & Banquet Venue', category: 'venue', priority: 'urgent', standardDaysBefore: 180, compressedDaysBefore: 28, description: 'Sign contract and confirm banquet space.' },
    { title: 'Lock Multi-Cuisine Caterer & Menu Tasting', category: 'catering', priority: 'urgent', standardDaysBefore: 150, compressedDaysBefore: 25, description: 'Finalize menu items and headcount estimate.' },
    { title: 'Book Candid Wedding Photographer & Drone Crew', category: 'photography', priority: 'high', standardDaysBefore: 120, compressedDaysBefore: 22, description: 'Confirm two-day coverage package.' },
    { title: 'Finalize Bridal Lehenga & Groom Sherwani', category: 'attire', priority: 'high', standardDaysBefore: 90, compressedDaysBefore: 18, description: 'Confirm fitting and accessories schedule.' },
    { title: 'Book Sangeet DJ, Sound System & Dhol Players', category: 'entertainment', priority: 'high', standardDaysBefore: 75, compressedDaysBefore: 15, description: 'Share must-play playlist and anchor rundown.' },
    { title: 'Confirm Floral Mandap & Stage Decor Renders', category: 'decor', priority: 'medium', standardDaysBefore: 60, compressedDaysBefore: 12, description: 'Review lighting, stage dimensions and colors.' },
    { title: 'Dispatch Digital & Boxed RSVP Invitations', category: 'invitations', priority: 'medium', standardDaysBefore: 45, compressedDaysBefore: 10, description: 'Track responses and hotel stay requirements.' },
    { title: 'Arrange Guest Logistics & Outstation Cabs', category: 'transport', priority: 'low', standardDaysBefore: 20, compressedDaysBefore: 6, description: 'Create airport pickup and drop coordinator sheet.' },
    { title: 'Pack Pooja Samagri & Return Gift Favors', category: 'miscellaneous', priority: 'low', standardDaysBefore: 7, compressedDaysBefore: 3, description: 'Verify all ritual essentials with family pandit.' },
    { title: 'Final Technical & Rehearsal Run-Through', category: 'venue', priority: 'urgent', standardDaysBefore: 2, compressedDaysBefore: 1, description: 'Check sound, power generators, and vendor arrival times.' },
  ],
  birthday: [
    { title: 'Lock Party Hall / Activity Play Arena', category: 'venue', priority: 'urgent', standardDaysBefore: 45, compressedDaysBefore: 25, description: 'Reserve slots and audio/visual setup.' },
    { title: 'Order Custom Designer Theme Birthday Cake', category: 'catering', priority: 'urgent', standardDaysBefore: 20, compressedDaysBefore: 14, description: 'Confirm flavor, weight and delivery slot.' },
    { title: 'Book Magician, Game Host & Balloon Artist', category: 'entertainment', priority: 'high', standardDaysBefore: 18, compressedDaysBefore: 10, description: 'Confirm 45-minute interactive routine.' },
    { title: 'Finalize Theme Balloon Arch & Photo Backdrop', category: 'decor', priority: 'medium', standardDaysBefore: 14, compressedDaysBefore: 7, description: 'Choose color palette matching birthday theme.' },
    { title: 'Assemble Personalized Explorer Return Gift Bags', category: 'miscellaneous', priority: 'medium', standardDaysBefore: 10, compressedDaysBefore: 5, description: 'Pack kid-friendly gifts and treats.' },
    { title: 'Send WhatsApp Animated RSVPs to Parents', category: 'invitations', priority: 'low', standardDaysBefore: 7, compressedDaysBefore: 4, description: 'Confirm food allergies and headcount.' },
    { title: 'Pick Up Cake & Finalize Music Playlist', category: 'catering', priority: 'urgent', standardDaysBefore: 1, compressedDaysBefore: 1, description: 'Set up party playlist and candles.' },
  ],
  community: [
    { title: 'Secure Ground Venue & Municipal Police Clearance', category: 'venue', priority: 'urgent', standardDaysBefore: 60, compressedDaysBefore: 25, description: 'Obtain sound permissions and fire safety clearance.' },
    { title: 'Book Stage Acoustics & Line-Array Sound System', category: 'entertainment', priority: 'urgent', standardDaysBefore: 45, compressedDaysBefore: 20, description: 'Ensure adequate mic coverage for speeches & music.' },
    { title: 'Contract Stage Decor, Tent Canopy & Seating', category: 'decor', priority: 'high', standardDaysBefore: 30, compressedDaysBefore: 15, description: 'Coordinate rainproof pandal and stage backdrop.' },
    { title: 'Confirm Community Feast & Prasad Caterer', category: 'catering', priority: 'high', standardDaysBefore: 25, compressedDaysBefore: 12, description: 'Plan hygienic counters and waste disposal bins.' },
    { title: 'Recruit Volunteer Marshals & Medical First Aid Team', category: 'miscellaneous', priority: 'medium', standardDaysBefore: 15, compressedDaysBefore: 7, description: 'Assign security and crowd coordination duties.' },
    { title: 'Install Stage Lighting, Barricades & Generator Backup', category: 'decor', priority: 'urgent', standardDaysBefore: 2, compressedDaysBefore: 1, description: 'Inspect emergency exits and fire extinguishers.' },
  ],
};

function addDaysToDate(baseDate: Date, days: number): string {
  const d = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
  return d.toISOString().split('T')[0];
}

/**
 * Deterministically generates a timeline countdown schedule.
 * Accurately calculates days remaining, applies short-notice compression (<30 days),
 * and flags urgent priorities when window is compressed.
 */
export function generateTimelineSchedule(
  eventDateStr: string,
  eventType: EventType,
  currentDateStr?: string
): TimelineTask[] {
  const eventDate = new Date(eventDateStr + 'T00:00:00Z');
  const today = currentDateStr ? new Date(currentDateStr + 'T00:00:00Z') : new Date();
  today.setUTCHours(0, 0, 0, 0);

  const totalDaysRemaining = Math.max(
    1,
    Math.round((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  );

  const isShortNotice = totalDaysRemaining <= 30;
  const templates = MILESTONES_BY_TYPE[eventType] || MILESTONES_BY_TYPE.wedding;

  return templates.map((m, index) => {
    let daysBefore: number;
    let priority: TaskPriority = m.priority;

    if (isShortNotice) {
      // Compress schedule proportionally to fit within available window
      const factor = Math.min(1, totalDaysRemaining / 30);
      daysBefore = Math.max(1, Math.min(totalDaysRemaining - 1, Math.round(m.compressedDaysBefore * factor)));
      // On short notice, any high task becomes urgent
      if (priority === 'high') {
        priority = 'urgent';
      }
    } else {
      // Cap daysBefore to not exceed total days remaining
      daysBefore = Math.min(totalDaysRemaining - 1, m.standardDaysBefore);
    }

    // Due date = eventDate minus daysBefore
    const dueTime = eventDate.getTime() - daysBefore * 24 * 60 * 60 * 1000;
    const dueDate = new Date(dueTime).toISOString().split('T')[0];

    return {
      id: `task-${eventType}-${index + 1}-${Date.now().toString(36)}`,
      title: m.title,
      description: isShortNotice ? `[URGENT SHORT-NOTICE] ${m.description}` : m.description,
      dueDate,
      daysBeforeEvent: daysBefore,
      category: m.category,
      status: 'todo',
      priority,
      isAiSuggested: false,
    };
  });
}
