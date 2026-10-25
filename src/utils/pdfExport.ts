import { jsPDF } from 'jspdf';
import { Event } from '../../shared/types.ts';
import { formatINR } from './currency.ts';
import { formatDate } from './dates.ts';

export function generateEventPlanPdf(event: Event): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  // Header banner
  doc.setFillColor(194, 65, 12); // Primary Amber-Bronze
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('PlanWise Event Master Plan', 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Generated on ${new Date().toLocaleDateString('en-IN')} | Powered by PlanWise AI`, 14, 21);

  y = 38;

  // Event Details Box
  doc.setTextColor(28, 25, 23);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(event.name, 14, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(87, 83, 78);
  doc.text(
    `Type: ${event.type.toUpperCase()}  |  Date: ${formatDate(event.date)}  |  City: ${event.city}  |  Guests: ${event.guestCount}  |  Budget: ${formatINR(event.totalBudget)}`,
    14,
    y
  );
  y += 6;
  doc.text(`Theme: ${event.styleTheme}  |  Tradition: ${event.preferences.culturalTradition}`, 14, y);
  y += 10;

  // Section 1: Budget Summary
  doc.setDrawColor(229, 222, 208);
  doc.line(14, y, pageWidth - 14, y);
  y += 6;

  doc.setTextColor(194, 65, 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('1. BUDGET ALLOCATION SUMMARY', 14, y);
  y += 6;

  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);

  // Table header
  doc.setFillColor(244, 239, 230);
  doc.rect(14, y, pageWidth - 28, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Category', 16, y + 4.5);
  doc.text('Priority', 80, y + 4.5);
  doc.text('Planned (INR)', 120, y + 4.5);
  doc.text('Actual Spend (INR)', 160, y + 4.5);
  y += 7;

  doc.setFont('helvetica', 'normal');
  for (const cat of event.budgetCategories) {
    if (y > 275) {
      doc.addPage();
      y = 18;
    }
    doc.text(cat.name, 16, y + 4);
    doc.text(cat.priorityTier, 80, y + 4);
    doc.text(formatINR(cat.allocatedAmount), 120, y + 4);
    doc.text(formatINR(cat.actualSpend), 160, y + 4);

    doc.setDrawColor(240, 240, 240);
    doc.line(14, y + 6, pageWidth - 14, y + 6);
    y += 7;
  }

  y += 6;
  if (y > 270) {
    doc.addPage();
    y = 18;
  }

  // Section 2: Key Timeline Milestones
  doc.setTextColor(194, 65, 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('2. TIMELINE COUNTDOWN MILESTONES', 14, y);
  y += 6;

  doc.setFillColor(244, 239, 230);
  doc.rect(14, y, pageWidth - 28, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text('Milestone Task', 16, y + 4.5);
  doc.text('Due Date', 120, y + 4.5);
  doc.text('Priority', 160, y + 4.5);
  y += 7;

  doc.setFont('helvetica', 'normal');
  for (const t of event.timelineTasks.slice(0, 8)) {
    if (y > 275) {
      doc.addPage();
      y = 18;
    }
    const safeTitle = t.title.length > 50 ? t.title.substring(0, 48) + '...' : t.title;
    doc.text(safeTitle, 16, y + 4);
    doc.text(formatDate(t.dueDate), 120, y + 4);
    doc.text(t.priority.toUpperCase(), 160, y + 4);

    doc.setDrawColor(240, 240, 240);
    doc.line(14, y + 6, pageWidth - 14, y + 6);
    y += 7;
  }

  y += 6;
  if (y > 270) {
    doc.addPage();
    y = 18;
  }

  // Section 3: Vendor Status
  doc.setTextColor(194, 65, 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('3. VENDOR CHECKLIST & CONTRACTS', 14, y);
  y += 6;

  doc.setFillColor(244, 239, 230);
  doc.rect(14, y, pageWidth - 28, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text('Category', 16, y + 4.5);
  doc.text('Vendor Name', 70, y + 4.5);
  doc.text('Status', 125, y + 4.5);
  doc.text('Quoted', 165, y + 4.5);
  y += 7;

  doc.setFont('helvetica', 'normal');
  for (const v of event.vendors) {
    if (y > 275) {
      doc.addPage();
      y = 18;
    }
    doc.text(v.category.toUpperCase(), 16, y + 4);
    doc.text(v.name.substring(0, 30), 70, y + 4);
    doc.text(v.status.toUpperCase(), 125, y + 4);
    doc.text(formatINR(v.quotedAmount), 165, y + 4);

    doc.setDrawColor(240, 240, 240);
    doc.line(14, y + 6, pageWidth - 14, y + 6);
    y += 7;
  }

  // Save PDF client-side
  const filename = `${event.name.replace(/[^a-zA-Z0-9]/g, '_')}_PlanWise_Plan.pdf`;
  doc.save(filename);
}
