import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TaskSubmissionModal } from '../TaskSubmissionModal';

// Mock the taskService
const mockSubmitTask = vi.fn();
vi.mock('../../services/taskService', () => ({
  taskService: {
    submitTask: mockSubmitTask,
  },
}));

describe('TaskSubmissionModal', () => {
  let queryClient: QueryClient;
  const mockOnClose = vi.fn();

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  it('renders when open', () => {
    render(
      <TestWrapper>
        <TaskSubmissionModal {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Submit New Task')).toBeInTheDocument();
    expect(screen.getByLabelText('Task Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Task Description *')).toBeInTheDocument();
    expect(screen.getByLabelText('Task Type *')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <TestWrapper>
        <TaskSubmissionModal {...defaultProps} isOpen={false} />
      </TestWrapper>
    );

    expect(screen.queryByText('Submit New Task')).not.toBeInTheDocument();
  });

  it('displays all required form fields', () => {
    render(
      <TestWrapper>
        <TaskSubmissionModal {...defaultProps} />
      </TestWrapper>
    );

    // Required fields
    expect(screen.getByLabelText('Task Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Task Description *')).toBeInTheDocument();
    expect(screen.getByLabelText('Task Type *')).toBeInTheDocument();
    
    // Optional fields
    expect(screen.getByLabelText('Priority')).toBeInTheDocument();
    expect(screen.getByLabelText('Estimated Hours')).toBeInTheDocument();
    expect(screen.getByLabelText('Requires Approval')).toBeInTheDocument();
    expect(screen.getByLabelText('Approval Timeout (hours)')).toBeInTheDocument();
  });

  it('has correct default values', () => {
    render(
      <TestWrapper>
        <TaskSubmissionModal {...defaultProps} />
      </TestWrapper>
    );

    const taskNameInput = screen.getByLabelText('Task Name *') as HTMLInputElement;
    const taskDescInput = screen.getByLabelText('Task Description *') as HTMLTextAreaElement;
    const taskTypeSelect = screen.getByLabelText('Task Type *') as HTMLSelectElement;
    const prioritySelect = screen.getByLabelText('Priority') as HTMLSelectElement;
    const hoursInput = screen.getByLabelText('Estimated Hours') as HTMLInputElement;
    const approvalCheck = screen.getByLabelText('Requires Approval') as HTMLInputElement;
    const timeoutInput = screen.getByLabelText('Approval Timeout (hours)') as HTMLInputElement;

    expect(taskNameInput.value).toBe('');
    expect(taskDescInput.value).toBe('');
    expect(taskTypeSelect.value).toBe('development');
    expect(prioritySelect.value).toBe('normal');
    expect(hoursInput.value).toBe('4');
    expect(approvalCheck.checked).toBe(true);
    expect(timeoutInput.value).toBe('24');
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <TaskSubmissionModal {...defaultProps} />
      </TestWrapper>
    );

    const submitButton = screen.getByText('Submit Task');
    await user.click(submitButton);

    // Should show validation messages for empty required fields
    await waitFor(() => {
      expect(screen.getByText('Task name is required')).toBeInTheDocument();
      expect(screen.getByText('Task description is required')).toBeInTheDocument();
    });
  });

  it('accepts valid task types', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <TaskSubmissionModal {...defaultProps} />
      </TestWrapper>
    );

    const taskTypeSelect = screen.getByLabelText('Task Type *');
    
    // Test all valid task types
    const validTaskTypes = [
      'development', 'analysis', 'testing', 'security', 
      'compliance', 'investigation', 'implementation', 'validation'
    ];

    for (const taskType of validTaskTypes) {
      await user.selectOptions(taskTypeSelect, taskType);
      expect((taskTypeSelect as HTMLSelectElement).value).toBe(taskType);
    }
  });

  it('accepts valid priority levels', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <TaskSubmissionModal {...defaultProps} />
      </TestWrapper>
    );

    const prioritySelect = screen.getByLabelText('Priority');
    
    // Test all valid priorities
    const validPriorities = ['low', 'normal', 'high', 'critical'];

    for (const priority of validPriorities) {
      await user.selectOptions(prioritySelect, priority);
      expect((prioritySelect as HTMLSelectElement).value).toBe(priority);
    }
  });

  it('submits form with correct data', async () => {
    const user = userEvent.setup();
    
    mockSubmitTask.mockResolvedValue({
      success: true,
      message: 'Task submitted successfully',
      taskId: 'TASK-20250826-A949A5EE',
      assignedAgent: 'AI-Agent-Developer',
      status: 'pending_approval',
      requiresApproval: true
    });

    render(
      <TestWrapper>
        <TaskSubmissionModal {...defaultProps} />
      </TestWrapper>
    );

    // Fill out the form
    await user.type(screen.getByLabelText('Task Name *'), 'Test Task');
    await user.type(screen.getByLabelText('Task Description *'), 'Test Description');
    await user.selectOptions(screen.getByLabelText('Task Type *'), 'security');
    await user.selectOptions(screen.getByLabelText('Priority'), 'high');
    await user.clear(screen.getByLabelText('Estimated Hours'));
    await user.type(screen.getByLabelText('Estimated Hours'), '8');

    // Submit the form
    await user.click(screen.getByText('Submit Task'));

    await waitFor(() => {
      expect(mockSubmitTask).toHaveBeenCalledWith({
        taskName: 'Test Task',
        taskDescription: 'Test Description',
        taskType: 'security',
        priority: 'high',
        estimatedHours: 8,
        requiresApproval: true,
        approvalTimeoutHours: 24,
        projectId: undefined,
        assignToAgent: undefined
      });
    });
  });

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <TaskSubmissionModal {...defaultProps} />
      </TestWrapper>
    );

    await user.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('passes projectId and assignToAgent props correctly', () => {
    const propsWithProjectAndAgent = {
      ...defaultProps,
      projectId: 5,
      assignToAgent: 'AI-Agent-Security'
    };

    render(
      <TestWrapper>
        <TaskSubmissionModal {...propsWithProjectAndAgent} />
      </TestWrapper>
    );

    // These props should be used in form submission but aren't directly visible in UI
    // This test ensures the component accepts these props without errors
    expect(screen.getByText('Submit New Task')).toBeInTheDocument();
  });

  it('toggles approval requirement correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <TaskSubmissionModal {...defaultProps} />
      </TestWrapper>
    );

    const approvalCheckbox = screen.getByLabelText('Requires Approval') as HTMLInputElement;
    const timeoutInput = screen.getByLabelText('Approval Timeout (hours)') as HTMLInputElement;

    // Initially checked
    expect(approvalCheckbox.checked).toBe(true);
    expect(timeoutInput).not.toBeDisabled();

    // Uncheck approval requirement
    await user.click(approvalCheckbox);
    expect(approvalCheckbox.checked).toBe(false);
    expect(timeoutInput).toBeDisabled();

    // Check again
    await user.click(approvalCheckbox);
    expect(approvalCheckbox.checked).toBe(true);
    expect(timeoutInput).not.toBeDisabled();
  });
});