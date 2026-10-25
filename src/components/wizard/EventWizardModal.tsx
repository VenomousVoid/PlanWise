import React, { useState, useEffect } from 'react';
import { useEvent } from '../../context/EventContext.tsx';
import { CreateEventInputSchema, EventType } from '../../../shared/types.ts';
import { api } from '../../api/client.ts';
import { CulturalTemplate } from '../../../shared/types.ts';
import { formatINR } from '../../utils/currency.ts';
import {
  X,
  Sparkles,
  Layers,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertCircle,
} from 'lucide-react';

interface EventWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EventWizardModal: React.FC<EventWizardModalProps> = ({ isOpen, onClose }) => {
  const { createEvent, createFromTemplate } = useEvent();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [templates, setTemplates] = useState<CulturalTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>('north-indian-wedding');
  const [useBlank, setUseBlank] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<EventType>('wedding');
  const [date, setDate] = useState(() => {
    const future = new Date();
    future.setDate(future.getDate() + 90);
    return future.toISOString().split('T')[0];
  });
  const [city, setCity] = useState('New Delhi');
  const [guestCount, setGuestCount] = useState<number>(250);
  const [totalBudget, setTotalBudget] = useState<number>(2000000);
  const [styleTheme, setStyleTheme] = useState('Royal Heritage & Marigold Radiance');
  const [foodPreference, setFoodPreference] = useState<'veg' | 'non-veg' | 'both' | 'jain'>('both');
  const [venueType, setVenueType] = useState<'indoor' | 'outdoor' | 'both'>('both');
  const [culturalTradition, setCulturalTradition] = useState('North Indian Traditional');
  const [notes, setNotes] = useState('');

  // Fetch templates on open
  useEffect(() => {
    if (isOpen) {
      api.getTemplates().then((res) => setTemplates(res.templates)).catch(console.error);
    }
  }, [isOpen]);

  // When a template is selected, pre-populate defaults
  const handleSelectTemplate = (tpl: CulturalTemplate) => {
    setSelectedTemplateId(tpl.id);
    setUseBlank(false);
    setType(tpl.eventType);
    setGuestCount(tpl.guestCountDefault);
    setTotalBudget(tpl.budgetDefault);
    setStyleTheme(tpl.styleThemeDefault);
    setCulturalTradition(tpl.preferencesDefault.culturalTradition);
    setFoodPreference(tpl.preferencesDefault.foodPreference);
    setVenueType(tpl.preferencesDefault.venueType);
    setNotes(tpl.preferencesDefault.notes || '');
    setName(tpl.name);
  };

  const handleNextStep1 = () => {
    if (!useBlank && selectedTemplateId) {
      const tpl = templates.find((t) => t.id === selectedTemplateId);
      if (tpl && !name) {
        setName(tpl.name);
      }
    }
    setStep(2);
  };

  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!name.trim() || name.length < 2) errors.name = 'Event name must be at least 2 characters';
    if (!date) errors.date = 'Event date is required (YYYY-MM-DD)';
    if (!city.trim()) errors.city = 'City is required';
    if (guestCount < 1 || guestCount > 5000) errors.guestCount = 'Guest count must be between 1 and 5,000';
    if (totalBudget < 1000) errors.totalBudget = 'Total budget must be at least ₹1,000';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) {
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    try {
      if (!useBlank && selectedTemplateId) {
        await createFromTemplate(selectedTemplateId, date, name, city);
      } else {
        const validatedInput = CreateEventInputSchema.parse({
          name: name.trim(),
          type,
          date,
          city: city.trim(),
          guestCount: Number(guestCount),
          totalBudget: Number(totalBudget),
          styleTheme: styleTheme.trim() || 'Festive Celebration',
          preferences: {
            foodPreference,
            venueType,
            culturalTradition: culturalTradition.trim() || 'Contemporary',
            notes: notes.trim() || undefined,
          },
        });
        await createEvent(validatedInput);
      }
      onClose();
    } catch (err: any) {
      if (err.issues) {
        const errors: Record<string, string> = {};
        for (const issue of err.issues) {
          errors[issue.path.join('.')] = issue.message;
        }
        setFormErrors(errors);
      } else {
        setFormErrors({ submit: err.message || 'Failed to create event' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)] text-[var(--primary-contrast)] flex items-center justify-center font-bold text-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 id="wizard-modal-title" className="font-serif font-bold text-lg text-[var(--text-primary)]">
                Event Setup Wizard
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Step {step} of 3: {step === 1 ? 'Choose Foundation' : step === 2 ? 'Core Logistics' : 'Preferences'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Tabs indicator */}
        <div className="flex border-b border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs font-semibold">
          <div
            className={`flex-1 py-2 text-center border-b-2 ${
              step >= 1 ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--text-muted)]'
            }`}
          >
            1. Template / Style
          </div>
          <div
            className={`flex-1 py-2 text-center border-b-2 ${
              step >= 2 ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--text-muted)]'
            }`}
          >
            2. Essentials
          </div>
          <div
            className={`flex-1 py-2 text-center border-b-2 ${
              step >= 3 ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--text-muted)]'
            }`}
          >
            3. Cultural Details
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {formErrors.submit && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formErrors.submit}</span>
            </div>
          )}

          {/* STEP 1: Cultural Template Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  Pick a Cultural or Regional Template (Recommended)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setUseBlank(true);
                    setSelectedTemplateId(null);
                  }}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                    useBlank
                      ? 'bg-[var(--primary)] text-[var(--primary-contrast)] border-[var(--primary)]'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--primary)]'
                  }`}
                >
                  Start Blank
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                {templates.map((tpl) => {
                  const isSelected = selectedTemplateId === tpl.id && !useBlank;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => handleSelectTemplate(tpl)}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[var(--primary)] bg-[var(--primary)]/5 ring-1 ring-[var(--primary)] shadow-xs'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--primary)]/50'
                      }`}
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') handleSelectTemplate(tpl);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-sm text-[var(--text-primary)] line-clamp-1">
                          {tpl.name}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-[var(--primary)] flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                        {tpl.description}
                      </p>
                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-[var(--text-muted)] font-mono">
                        <span>{tpl.guestCountDefault} guests</span>
                        <span className="font-semibold text-[var(--primary)]">{formatINR(tpl.budgetDefault)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Core Details */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="event-name" className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Event Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="event-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aarav & Meera Wedding Celebration"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--border-focus)] focus:bg-[var(--bg-card)] transition-colors"
                  required
                />
                {formErrors.name && <p className="text-xs text-red-600 mt-1">{formErrors.name}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="event-type" className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                    Event Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="event-type"
                    value={type}
                    onChange={(e) => setType(e.target.value as EventType)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--border-focus)]"
                  >
                    <option value="wedding">Wedding (Shaadi)</option>
                    <option value="birthday">Birthday Party</option>
                    <option value="community">Community / Society Festival</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="event-date" className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                    Event Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="event-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--border-focus)]"
                    required
                  />
                  {formErrors.date && <p className="text-xs text-red-600 mt-1">{formErrors.date}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="event-city" className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="event-city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Jaipur, Bengaluru"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--border-focus)]"
                    required
                  />
                  {formErrors.city && <p className="text-xs text-red-600 mt-1">{formErrors.city}</p>}
                </div>

                <div>
                  <label htmlFor="event-guests" className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                    Guest Count <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="event-guests"
                    type="number"
                    min="1"
                    max="5000"
                    value={guestCount}
                    onChange={(e) => setGuestCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--border-focus)] font-mono"
                    required
                  />
                  {formErrors.guestCount && <p className="text-xs text-red-600 mt-1">{formErrors.guestCount}</p>}
                </div>

                <div>
                  <label htmlFor="event-budget" className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                    Total Budget (INR) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="event-budget"
                    type="number"
                    step="5000"
                    min="1000"
                    value={totalBudget}
                    onChange={(e) => setTotalBudget(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--border-focus)] font-mono"
                    required
                  />
                  <span className="text-[10px] text-[var(--text-muted)]">{formatINR(totalBudget)}</span>
                  {formErrors.totalBudget && <p className="text-xs text-red-600 mt-1">{formErrors.totalBudget}</p>}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Style & Cultural Preferences */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="style-theme" className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Style / Aesthetic Theme
                </label>
                <input
                  id="style-theme"
                  type="text"
                  value={styleTheme}
                  onChange={(e) => setStyleTheme(e.target.value)}
                  placeholder="e.g. Royal Marwari Heritage, Minimalist Pastel, Boho Chic"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--border-focus)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="food-pref" className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                    Food Preference
                  </label>
                  <select
                    id="food-pref"
                    value={foodPreference}
                    onChange={(e) => setFoodPreference(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--border-focus)]"
                  >
                    <option value="both">Both Veg & Non-Veg</option>
                    <option value="veg">Pure Vegetarian</option>
                    <option value="jain">Strict Jain (No Onion/Garlic)</option>
                    <option value="non-veg">Non-Veg Focused</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="venue-type" className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                    Venue Layout
                  </label>
                  <select
                    id="venue-type"
                    value={venueType}
                    onChange={(e) => setVenueType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--border-focus)]"
                  >
                    <option value="both">Both Indoor & Outdoor Lawn</option>
                    <option value="indoor">Indoor AC Banquet Only</option>
                    <option value="outdoor">Open-air Lawn / Amphitheater</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="tradition" className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                    Cultural Tradition
                  </label>
                  <input
                    id="tradition"
                    type="text"
                    value={culturalTradition}
                    onChange={(e) => setCulturalTradition(e.target.value)}
                    placeholder="e.g. Gujarati, South Indian, Punjabi"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--border-focus)]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="event-notes" className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Special Notes or Requirements
                </label>
                <textarea
                  id="event-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Sangeet DJ until midnight, separate chaat counter, elderly wheelchair access..."
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--border-focus)]"
                />
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((step - 1) as any)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            ) : (
              <div></div>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1) handleNextStep1();
                  else if (validateStep2()) setStep(3);
                }}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-contrast)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
              >
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-contrast)] text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-md disabled:opacity-50"
              >
                {isSubmitting ? 'Creating Event...' : 'Launch PlanWise Event'}
                <Sparkles className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
