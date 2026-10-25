import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccessibleChart } from './AccessibleChart';
import { BudgetCategory } from '../../../shared/types';

describe('AccessibleChart Component', () => {
  const mockCategories: BudgetCategory[] = [
    {
      id: 'venue',
      name: 'Venue & Banquets',
      priorityTier: 'must-have',
      allocatedAmount: 300000,
      actualSpend: 250000,
      items: [],
    },
    {
      id: 'catering',
      name: 'Catering',
      priorityTier: 'must-have',
      allocatedAmount: 400000,
      actualSpend: 420000, // Overspent
      items: [],
    },
    {
      id: 'decor',
      name: 'Decor',
      priorityTier: 'important',
      allocatedAmount: 150000,
      actualSpend: 100000,
      items: [],
    },
  ];

  const totalBudget = 850000;

  describe('Rendering', () => {
    it('should render with chart view by default', () => {
      render(<AccessibleChart categories={mockCategories} totalBudget={totalBudget} />);

      expect(screen.getByText('Budget Distribution & Actual Spend')).toBeInTheDocument();
      expect(screen.getByRole('img')).toBeInTheDocument(); // SVG chart
      expect(screen.getByText('Table View')).toBeInTheDocument(); // Toggle button
    });

    it('should display total budget and spend in the chart', () => {
      render(<AccessibleChart categories={mockCategories} totalBudget={totalBudget} />);

      expect(screen.getByText('₹8,50,000')).toBeInTheDocument(); // Total budget
    });

    it('should show overspend warning when over budget', () => {
      const overspentCategories: BudgetCategory[] = [
        {
          id: 'venue',
          name: 'Venue',
          priorityTier: 'must-have',
          allocatedAmount: 100000,
          actualSpend: 200000,
          items: [],
        },
      ];

      render(<AccessibleChart categories={overspentCategories} totalBudget={100000} />);

      expect(screen.getByText(/Over budget by/)).toBeInTheDocument();
    });

    it('should show remaining budget when under budget', () => {
      const underBudgetCategories: BudgetCategory[] = [
        {
          id: 'venue',
          name: 'Venue',
          priorityTier: 'must-have',
          allocatedAmount: 100000,
          actualSpend: 50000,
          items: [],
        },
      ];

      render(<AccessibleChart categories={underBudgetCategories} totalBudget={100000} />);

      expect(screen.getByText(/Remaining:/)).toBeInTheDocument();
    });
  });

  describe('Table View Toggle', () => {
    it('should toggle to table view when button clicked', async () => {
      const user = userEvent.setup();
      render(<AccessibleChart categories={mockCategories} totalBudget={totalBudget} />);

      const toggleButton = screen.getByLabelText(/Switch to accessible data table/);
      await user.click(toggleButton);

      // Table elements should be visible
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByText('Priority Tier')).toBeInTheDocument();
      expect(screen.getByText('Planned (INR)')).toBeInTheDocument();
      expect(screen.getByText('Actual Spend (INR)')).toBeInTheDocument();
    });

    it('should toggle back to chart view', async () => {
      const user = userEvent.setup();
      render(<AccessibleChart categories={mockCategories} totalBudget={totalBudget} />);

      const toggleButton = screen.getByLabelText(/Switch to accessible data table/);
      await user.click(toggleButton);

      expect(screen.getByRole('table')).toBeInTheDocument();

      const chartButton = screen.getByLabelText(/Switch to chart visualization/);
      await user.click(chartButton);

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('should have proper aria-labels for accessibility', () => {
      render(<AccessibleChart categories={mockCategories} totalBudget={totalBudget} />);

      const toggleButton = screen.getByLabelText(/Switch to accessible data table/);
      expect(toggleButton).toHaveAttribute('aria-label');
    });
  });

  describe('Table View Content', () => {
    it('should display all categories in table', async () => {
      const user = userEvent.setup();
      render(<AccessibleChart categories={mockCategories} totalBudget={totalBudget} />);

      const toggleButton = screen.getByLabelText(/Switch to accessible data table/);
      await user.click(toggleButton);

      expect(screen.getByText('Venue & Banquets')).toBeInTheDocument();
      expect(screen.getByText('Catering')).toBeInTheDocument();
      expect(screen.getByText('Decor')).toBeInTheDocument();
    });

    it('should show priority tiers in table', async () => {
      const user = userEvent.setup();
      render(<AccessibleChart categories={mockCategories} totalBudget={totalBudget} />);

      await user.click(screen.getByLabelText(/Switch to accessible data table/));

      expect(screen.getAllByText('must-have').length).toBeGreaterThan(0);
      expect(screen.getByText('important')).toBeInTheDocument();
    });

    it('should calculate and display variance', async () => {
      const user = userEvent.setup();
      render(<AccessibleChart categories={mockCategories} totalBudget={totalBudget} />);

      await user.click(screen.getByLabelText(/Switch to accessible data table/));

      // Venue: 300000 - 250000 = 50000 (positive)
      expect(screen.getByText('₹50,000')).toBeInTheDocument();

      // Catering: 400000 - 420000 = -20000 (negative, overspent)
      expect(screen.getByText('-₹20,000')).toBeInTheDocument();
    });

    it('should show "Over budget" status for overspent categories', async () => {
      const user = userEvent.setup();
      render(<AccessibleChart categories={mockCategories} totalBudget={totalBudget} />);

      await user.click(screen.getByLabelText(/Switch to accessible data table/));

      expect(screen.getByText('Over budget')).toBeInTheDocument();
    });

    it('should show "On Track" status for under-budget categories', async () => {
      const user = userEvent.setup();
      render(<AccessibleChart categories={mockCategories} totalBudget={totalBudget} />);

      await user.click(screen.getByLabelText(/Switch to accessible data table/));

      expect(screen.getAllByText('On Track').length).toBeGreaterThan(0);
    });

    it('should display table footer with totals', async () => {
      const user = userEvent.setup();
      render(<AccessibleChart categories={mockCategories} totalBudget={totalBudget} />);

      await user.click(screen.getByLabelText(/Switch to accessible data table/));

      expect(screen.getByText('Total')).toBeInTheDocument();
      // Total actual spend: 250000 + 420000 + 100000 = 770000
      expect(screen.getByText('₹7,70,000')).toBeInTheDocument();
    });

    it('should have accessible table structure', async () => {
      const user = userEvent.setup();
      render(<AccessibleChart categories={mockCategories} totalBudget={totalBudget} />);

      await user.click(screen.getByLabelText(/Switch to accessible data table/));

      const table = screen.getByRole('table', { name: /Itemized Budget Table/ });
      expect(table).toBeInTheDocument();

      // Check for column headers with scope
      const headers = screen.getAllByRole('columnheader');
      expect(headers.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty categories array', () => {
      render(<AccessibleChart categories={[]} totalBudget={100000} />);

      expect(screen.getByText('Budget Distribution & Actual Spend')).toBeInTheDocument();
    });

    it('should handle zero total budget', () => {
      render(<AccessibleChart categories={mockCategories} totalBudget={0} />);

      expect(screen.getByText('₹0')).toBeInTheDocument();
    });

    it('should handle all categories with zero spend', () => {
      const zeroSpendCategories: BudgetCategory[] = [
        {
          id: 'venue',
          name: 'Venue',
          priorityTier: 'must-have',
          allocatedAmount: 100000,
          actualSpend: 0,
          items: [],
        },
      ];

      render(<AccessibleChart categories={zeroSpendCategories} totalBudget={100000} />);

      expect(screen.getByText(/Remaining:/)).toBeInTheDocument();
    });

    it('should handle categories with identical allocations', () => {
      const identicalCategories: BudgetCategory[] = [
        {
          id: 'cat1',
          name: 'Category 1',
          priorityTier: 'must-have',
          allocatedAmount: 100000,
          actualSpend: 50000,
          items: [],
        },
        {
          id: 'cat2',
          name: 'Category 2',
          priorityTier: 'must-have',
          allocatedAmount: 100000,
          actualSpend: 75000,
          items: [],
        },
      ];

      render(<AccessibleChart categories={identicalCategories} totalBudget={200000} />);

      expect(screen.getByText('Category 1')).toBeInTheDocument();
      expect(screen.getByText('Category 2')).toBeInTheDocument();
    });
  });
});
