import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';

// Mock the useAuth hook
vi.mock('@/hooks/useAuth');

const mockUseAuth = vi.mocked(useAuth);

// Mock window.location.reload
Object.defineProperty(window, 'location', {
  value: {
    reload: vi.fn(),
  },
  writable: true,
});

// Mock window.history.back
Object.defineProperty(window, 'history', {
  value: {
    back: vi.fn(),
  },
  writable: true,
});

const TestComponent = () => <div>Protected Content</div>;

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Authentication System Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('ProtectedRoute with Authentication States', () => {
    it('should show loading state initially', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        hasRole: vi.fn(),
        error: null,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
      });

      renderWithProviders(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByTestId('loader')).toBeInTheDocument();
    });

    it('should show loading timeout after 10 seconds', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        hasRole: vi.fn(),
        error: null,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
      });

      renderWithProviders(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      // Initially shows normal loading
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Fast forward 10 seconds
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(screen.getByText('Loading Taking Too Long')).toBeInTheDocument();
        expect(screen.getByText('Authentication is taking longer than expected. This might be due to network issues.')).toBeInTheDocument();
        expect(screen.getByText('Still trying to connect...')).toBeInTheDocument();
      });
    });

    it('should show error state when authentication fails', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        hasRole: vi.fn(),
        error: 'Failed to authenticate user',
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
      });

      renderWithProviders(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Authentication Error')).toBeInTheDocument();
      expect(screen.getByText('Failed to authenticate user')).toBeInTheDocument();
      expect(screen.getByText('Refresh Page')).toBeInTheDocument();
    });

    it('should redirect to auth when no user is authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        hasRole: vi.fn(),
        error: null,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
      });

      renderWithProviders(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      // Should not show protected content
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should show access denied for insufficient permissions', () => {
      const mockHasRole = vi.fn().mockReturnValue(false);
      
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com' },
        loading: false,
        hasRole: mockHasRole,
        error: null,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
      });

      renderWithProviders(
        <ProtectedRoute requiredRole="super_admin">
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText('You don\'t have permission to access this page.')).toBeInTheDocument();
      expect(screen.getByText('Required role: super_admin')).toBeInTheDocument();
      expect(screen.getByText('Go Back')).toBeInTheDocument();
    });

    it('should render protected content for authenticated user with correct role', () => {
      const mockHasRole = vi.fn().mockReturnValue(true);
      
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com' },
        loading: false,
        hasRole: mockHasRole,
        error: null,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
      });

      renderWithProviders(
        <ProtectedRoute requiredRole="viewer">
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
      expect(mockHasRole).toHaveBeenCalledWith('viewer');
    });

    it('should clear loading timeout when loading completes', async () => {
      const mockHasRole = vi.fn().mockReturnValue(true);
      
      // Start with loading state
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        hasRole: vi.fn(),
        error: null,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
      });

      const { rerender } = renderWithProviders(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      // Fast forward to almost timeout
      act(() => {
        vi.advanceTimersByTime(9000);
      });

      // Complete loading before timeout
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com' },
        loading: false,
        hasRole: mockHasRole,
        error: null,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
      });

      rerender(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      // Should show protected content, not timeout message
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
      expect(screen.queryByText('Loading Taking Too Long')).not.toBeInTheDocument();
    });
  });

  describe('Race Condition Prevention', () => {
    it('should handle rapid authentication state changes', async () => {
      const mockHasRole = vi.fn().mockReturnValue(true);
      
      // Simulate rapid state changes
      mockUseAuth
        .mockReturnValueOnce({
          user: null,
          loading: true,
          hasRole: vi.fn(),
          error: null,
          signIn: vi.fn(),
          signOut: vi.fn(),
          signUp: vi.fn(),
        })
        .mockReturnValueOnce({
          user: null,
          loading: false,
          hasRole: vi.fn(),
          error: null,
          signIn: vi.fn(),
          signOut: vi.fn(),
          signUp: vi.fn(),
        })
        .mockReturnValue({
          user: { id: '1', email: 'test@example.com' },
          loading: false,
          hasRole: mockHasRole,
          error: null,
          signIn: vi.fn(),
          signOut: vi.fn(),
          signUp: vi.fn(),
        });

      const { rerender } = renderWithProviders(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      // First render: loading
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Second render: no user, should redirect
      rerender(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      // Third render: authenticated user
      rerender(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    it('should handle error recovery', () => {
      const mockHasRole = vi.fn().mockReturnValue(true);
      
      // Start with error
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        hasRole: vi.fn(),
        error: 'Network error',
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
      });

      const { rerender } = renderWithProviders(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Authentication Error')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();

      // Recover from error
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com' },
        loading: false,
        hasRole: mockHasRole,
        error: null,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
      });

      rerender(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
      expect(screen.queryByText('Authentication Error')).not.toBeInTheDocument();
    });
  });
});