import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme, Theme } from './ThemeContext';

// Test component that uses the theme hook
function ThemeConsumer() {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <div data-testid="current-theme">{theme}</div>
      <button onClick={() => setTheme('light')} data-testid="set-light">
        Light
      </button>
      <button onClick={() => setTheme('dark')} data-testid="set-dark">
        Dark
      </button>
      <button onClick={() => setTheme('high-contrast')} data-testid="set-high-contrast">
        High Contrast
      </button>
    </div>
  );
}

describe('ThemeContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('Initialization', () => {
    it('should default to light theme when no saved preference', () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
    });

    it('should restore theme from localStorage', () => {
      localStorage.setItem('planwise-theme', 'dark');

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    });

    it('should ignore invalid theme values from localStorage', () => {
      localStorage.setItem('planwise-theme', 'invalid-theme');

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      // Should fall back to light
      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
    });
  });

  describe('Theme Switching', () => {
    it('should switch to dark theme', () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(getByTestId('current-theme')).toHaveTextContent('light');

      act(() => {
        getByTestId('set-dark').click();
      });

      expect(getByTestId('current-theme')).toHaveTextContent('dark');
    });

    it('should switch to high-contrast theme', () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      act(() => {
        getByTestId('set-high-contrast').click();
      });

      expect(getByTestId('current-theme')).toHaveTextContent('high-contrast');
    });

    it('should switch back to light theme', () => {
      localStorage.setItem('planwise-theme', 'dark');

      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(getByTestId('current-theme')).toHaveTextContent('dark');

      act(() => {
        getByTestId('set-light').click();
      });

      expect(getByTestId('current-theme')).toHaveTextContent('light');
    });
  });

  describe('Persistence', () => {
    it('should persist theme to localStorage when changed', () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      act(() => {
        getByTestId('set-dark').click();
      });

      expect(localStorage.getItem('planwise-theme')).toBe('dark');
    });

    it('should update localStorage for all theme changes', () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      act(() => {
        getByTestId('set-dark').click();
      });
      expect(localStorage.getItem('planwise-theme')).toBe('dark');

      act(() => {
        getByTestId('set-high-contrast').click();
      });
      expect(localStorage.getItem('planwise-theme')).toBe('high-contrast');

      act(() => {
        getByTestId('set-light').click();
      });
      expect(localStorage.getItem('planwise-theme')).toBe('light');
    });
  });

  describe('DOM Attribute', () => {
    it('should set data-theme attribute on document root', () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should update data-theme attribute when theme changes', () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      act(() => {
        getByTestId('set-dark').click();
      });

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should update data-theme for all theme values', () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      const themes: Theme[] = ['light', 'dark', 'high-contrast'];

      for (const theme of themes) {
        act(() => {
          getByTestId(`set-${theme}`).click();
        });

        expect(document.documentElement.getAttribute('data-theme')).toBe(theme);
      }
    });
  });

  describe('Error Handling', () => {
    it('should throw error when useTheme is used outside provider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = () => {};

      function BadComponent() {
        useTheme(); // This should throw
        return <div>Bad</div>;
      }

      expect(() => render(<BadComponent />)).toThrow('useTheme must be used within a ThemeProvider');

      console.error = originalError;
    });
  });

  describe('Multiple Consumers', () => {
    it('should share theme state across multiple consumers', () => {
      function Consumer1() {
        const { theme, setTheme } = useTheme();
        return (
          <div>
            <div data-testid="consumer1-theme">{theme}</div>
            <button onClick={() => setTheme('dark')} data-testid="consumer1-set-dark">
              Set Dark
            </button>
          </div>
        );
      }

      function Consumer2() {
        const { theme } = useTheme();
        return <div data-testid="consumer2-theme">{theme}</div>;
      }

      const { getByTestId } = render(
        <ThemeProvider>
          <Consumer1 />
          <Consumer2 />
        </ThemeProvider>
      );

      expect(getByTestId('consumer1-theme')).toHaveTextContent('light');
      expect(getByTestId('consumer2-theme')).toHaveTextContent('light');

      act(() => {
        getByTestId('consumer1-set-dark').click();
      });

      expect(getByTestId('consumer1-theme')).toHaveTextContent('dark');
      expect(getByTestId('consumer2-theme')).toHaveTextContent('dark');
    });
  });
});
