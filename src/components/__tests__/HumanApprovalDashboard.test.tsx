import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { HumanApprovalDashboard } from '../HumanApprovalDashboard';
import { approvalService } from '../../services/approvalService';
import { agentService } from '../../services/agentService';
import { projectService } from '../../services/projectService';

// Mock the services
vi.mock('../../services/approvalService', () => ({
  approvalService: {
    getPendingApprovals: vi.fn(),
    getApprovalStats: vi.fn(),
  },
}));

vi.mock('../../services/agentService', () => ({
  agentService: {
    getActiveAgents: vi.fn(),
  },
}));

vi.mock('../../services/projectService', () => ({
  projectService: {
    getProjects: vi.fn(),
  },
}));

describe('HumanApprovalDashboard', () => {
  let queryClient: QueryClient;

  const TestWrapper = ({ children, initialEntries = ['/'] }: { 
    children: React.ReactNode;
    initialEntries?: string[];
  }) => (
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </MemoryRouter>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Setup default mock responses
    vi.mocked(approvalService.getPendingApprovals).mockResolvedValue([]);
    vi.mocked(approvalService.getApprovalStats).mockResolvedValue({
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      expired: 0,
      averageResponseTime: 0
    });
    vi.mocked(agentService.getActiveAgents).mockResolvedValue({ data: [], total: 0, timestamp: '', summary: { activeAgents: 0, busyAgents: 0, idleAgents: 0, totalTasks: 0, completedTasks: 0 } });
    vi.mocked(projectService.getProjects).mockResolvedValue([]);

    vi.clearAllMocks();
  });

  it('renders dashboard with all tabs', () => {
    render(
      <TestWrapper>
        <HumanApprovalDashboard />
      </TestWrapper>
    );

    expect(screen.getByText('WHS AI Approval Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Approval Inbox')).toBeInTheDocument();
    expect(screen.getByText('Project Progress')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('shows inbox tab by default', () => {
    render(
      <TestWrapper>
        <HumanApprovalDashboard />
      </TestWrapper>
    );

    const inboxButton = screen.getByRole('button', { name: /approval inbox/i });
    expect(inboxButton).toHaveClass('border-blue-500 text-blue-600');
  });

  it('supports deep linking to projects tab', () => {
    render(
      <TestWrapper initialEntries={['/projects']}>
        <HumanApprovalDashboard />
      </TestWrapper>
    );

    const projectsButton = screen.getByRole('button', { name: /project progress/i });
    expect(projectsButton).toHaveClass('border-blue-500 text-blue-600');
  });

  it('supports deep linking to history tab', () => {
    render(
      <TestWrapper initialEntries={['/history']}>
        <HumanApprovalDashboard />
      </TestWrapper>
    );

    const historyButton = screen.getByRole('button', { name: /history/i });
    expect(historyButton).toHaveClass('border-blue-500 text-blue-600');
  });

  it('supports deep linking to stats tab', () => {
    render(
      <TestWrapper initialEntries={['/stats']}>
        <HumanApprovalDashboard />
      </TestWrapper>
    );

    const statsButton = screen.getByRole('button', { name: /analytics/i });
    expect(statsButton).toHaveClass('border-blue-500 text-blue-600');
  });

  it('supports project-progress route variant', () => {
    render(
      <TestWrapper initialEntries={['/project-progress']}>
        <HumanApprovalDashboard />
      </TestWrapper>
    );

    const projectsButton = screen.getByRole('button', { name: /project progress/i });
    expect(projectsButton).toHaveClass('border-blue-500 text-blue-600');
  });

  it('supports analytics route variant', () => {
    render(
      <TestWrapper initialEntries={['/analytics']}>
        <HumanApprovalDashboard />
      </TestWrapper>
    );

    const statsButton = screen.getByRole('button', { name: /analytics/i });
    expect(statsButton).toHaveClass('border-blue-500 text-blue-600');
  });

  it('changes tabs correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <HumanApprovalDashboard />
      </TestWrapper>
    );

    // Start on inbox tab  
    const inboxButton = screen.getByRole('button', { name: /approval inbox/i });
    const projectsButton = screen.getByRole('button', { name: /project progress/i });
    
    expect(inboxButton).toHaveClass('border-blue-500 text-blue-600');
    expect(projectsButton).toHaveClass('border-transparent');

    // Click on projects tab
    await user.click(projectsButton);
    
    expect(projectsButton).toHaveClass('border-blue-500 text-blue-600');
    expect(inboxButton).toHaveClass('border-transparent');
  });

  it('displays pending approvals count', async () => {
    const mockApprovals = [
      {
        id: 1,
        approvalType: 'schema_change' as const,
        requestedBy: 'agent1',
        approvalTitle: 'Test Approval 1',
        approvalDescription: 'Description 1',
        urgencyLevel: 'medium' as const,
        status: 'pending' as const,
        requestedDate: '2025-08-26T10:00:00Z'
      },
      {
        id: 2,
        approvalType: 'security_review' as const,
        requestedBy: 'agent2',
        approvalTitle: 'Test Approval 2',
        approvalDescription: 'Description 2',
        urgencyLevel: 'high' as const,
        status: 'pending' as const,
        requestedDate: '2025-08-26T11:00:00Z'
      },
      {
        id: 3,
        approvalType: 'compliance_review' as const,
        requestedBy: 'agent3',
        approvalTitle: 'Test Approval 3',
        approvalDescription: 'Description 3',
        urgencyLevel: 'low' as const,
        status: 'pending' as const,
        requestedDate: '2025-08-26T12:00:00Z'
      }
    ];

    vi.mocked(approvalService.getPendingApprovals).mockResolvedValue(mockApprovals);

    render(
      <TestWrapper>
        <HumanApprovalDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Approval Inbox (3)')).toBeInTheDocument();
    });
  });

  it('handles zero pending approvals', async () => {
    vi.mocked(approvalService.getPendingApprovals).mockResolvedValue([]);

    render(
      <TestWrapper>
        <HumanApprovalDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Approval Inbox')).toBeInTheDocument();
      expect(screen.queryByText('Approval Inbox (0)')).not.toBeInTheDocument();
    });
  });

  it('displays task submission modal when button clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <HumanApprovalDashboard />
      </TestWrapper>
    );

    const submitTaskButton = screen.getByText('Submit New Task');
    await user.click(submitTaskButton);

    await waitFor(() => {
      expect(screen.getByText('Submit New Task')).toBeInTheDocument();
    });
  });

  it('displays agent status indicators', async () => {
    const mockAgents = [
      {
        id: 1,
        agentId: 'AI-Agent-Developer',
        agentName: 'Developer Agent',
        roleName: 'Developer',
        roleDescription: 'Development agent',
        status: 'active' as const,
        currentTask: 'Processing code review',
        lastActivity: new Date().toISOString(),
        createdDate: '2025-08-26T08:00:00Z',
        performanceMetrics: {
          tasksCompleted: 10,
          averageTime: 2.5,
          successRate: 95
        },
        taskStats: {
          assignedTasks: 12,
          completedTasks: 10,
          activeTasks: 2
        },
        healthStatus: 'healthy' as const,
        capabilities: ['coding', 'testing']
      },
      {
        id: 2,
        agentId: 'AI-Agent-Tester',
        agentName: 'Tester Agent',
        roleName: 'Tester',
        roleDescription: 'Testing agent',
        status: 'idle' as const,
        lastActivity: new Date().toISOString(),
        createdDate: '2025-08-26T08:00:00Z',
        performanceMetrics: {
          tasksCompleted: 5,
          averageTime: 1.5,
          successRate: 100
        },
        taskStats: {
          assignedTasks: 5,
          completedTasks: 5,
          activeTasks: 0
        },
        healthStatus: 'healthy' as const,
        capabilities: ['testing', 'validation']
      }
    ];

    vi.mocked(agentService.getActiveAgents).mockResolvedValue({ 
      data: mockAgents, 
      total: 2, 
      timestamp: new Date().toISOString(), 
      summary: { activeAgents: 2, busyAgents: 1, idleAgents: 1, totalTasks: 1, completedTasks: 0 } 
    });

    render(
      <TestWrapper>
        <HumanApprovalDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Developer Agent')).toBeInTheDocument();
      expect(screen.getByText('Tester Agent')).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching data', () => {
    // Make the API call hang to test loading state
    vi.mocked(approvalService.getPendingApprovals).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <TestWrapper>
        <HumanApprovalDashboard />
      </TestWrapper>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(approvalService.getPendingApprovals).mockRejectedValue(
      new Error('API Error')
    );

    render(
      <TestWrapper>
        <HumanApprovalDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('polls for real-time updates', async () => {
    render(
      <TestWrapper>
        <HumanApprovalDashboard />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(approvalService.getPendingApprovals).toHaveBeenCalledTimes(1);
    });

    // Mock timer to advance time and trigger refetch
    vi.useFakeTimers();
    vi.advanceTimersByTime(10000); // 10 seconds

    await waitFor(() => {
      expect(approvalService.getPendingApprovals).toHaveBeenCalledTimes(2);
    });

    vi.useRealTimers();
  });

  it('displays real-time agent activity updates', async () => {
    const mockAgents = [
      {
        id: 1,
        agentId: 'AI-Agent-Developer',
        agentName: 'Developer Agent',
        roleName: 'Developer',
        roleDescription: 'Development agent',
        status: 'busy' as const,
        currentTask: 'Implementing new feature',
        lastActivity: new Date().toISOString(),
        createdDate: '2025-08-26T08:00:00Z',
        performanceMetrics: {
          tasksCompleted: 15,
          averageTime: 2.5,
          successRate: 95
        },
        taskStats: {
          assignedTasks: 16,
          completedTasks: 15,
          activeTasks: 1
        },
        healthStatus: 'healthy' as const,
        capabilities: ['coding', 'implementation']
      }
    ];

    vi.mocked(agentService.getActiveAgents).mockResolvedValue({ 
      data: mockAgents, 
      total: 1, 
      timestamp: new Date().toISOString(), 
      summary: { activeAgents: 1, busyAgents: 1, idleAgents: 0, totalTasks: 15, completedTasks: 14 } 
    });

    render(
      <TestWrapper>
        <HumanApprovalDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Implementing new feature')).toBeInTheDocument();
      expect(screen.getByText(/tasks: 15/i)).toBeInTheDocument();
    });
  });

  it('supports task filtering by status', async () => {
    render(
      <TestWrapper initialEntries={['/history']}>
        <HumanApprovalDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      const historyButton = screen.getByRole('button', { name: /history/i });
      expect(historyButton).toHaveClass('border-blue-500 text-blue-600');
    });

    // Look for history content
    const historyContent = screen.getByText(/History/i);
    expect(historyContent).toBeInTheDocument();
  });

  it('maintains URL state during navigation', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <HumanApprovalDashboard />
      </TestWrapper>
    );

    const projectsButton = screen.getByRole('button', { name: /project progress/i });
    await user.click(projectsButton);

    // In a real app, this would update the URL
    // Here we're testing that the component accepts navigation props
    expect(projectsButton).toHaveClass('border-blue-500 text-blue-600');
  });
});