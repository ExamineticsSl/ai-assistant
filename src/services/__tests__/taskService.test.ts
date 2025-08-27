import { describe, it, expect, vi, beforeEach } from 'vitest';
import { taskService } from '../taskService';
import type { TaskSubmissionRequest, TaskSubmissionResponse } from '../taskService';

// Create mock functions first
const mockPost = vi.fn();
const mockGet = vi.fn();

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: () => ({
      post: mockPost,
      get: mockGet,
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    })
  }
}));

// Mock authService  
vi.mock('../authService', () => ({
  authService: {
    getAuthHeader: vi.fn(() => ({})),
    logout: vi.fn()
  }
}));

describe('taskService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('submitTask', () => {
    it('submits task with correct data structure', async () => {
      const mockResponse: TaskSubmissionResponse = {
        success: true,
        message: 'Task submitted successfully',
        taskId: 'TASK-20250826-A949A5EE',
        assignedAgent: 'AI-Agent-Developer',
        status: 'pending_approval',
        requiresApproval: true
      };

      mockPost.mockResolvedValue({ data: mockResponse });

      const request: TaskSubmissionRequest = {
        taskName: 'Test Healthcare Task',
        taskDescription: 'Validate HIPAA compliance for new patient data handling system',
        taskType: 'security',
        priority: 'high',
        estimatedHours: 6,
        projectId: 1,
        requiresApproval: true,
        approvalTimeoutHours: 24
      };

      const result = await taskService.submitTask(request);

      expect(mockPost).toHaveBeenCalledWith('/agents/tasks/submit', request);
      expect(result).toEqual(mockResponse);
    });

    it('submits minimal task with required fields only', async () => {
      const mockResponse: TaskSubmissionResponse = {
        success: true,
        message: 'Task submitted successfully',
        taskId: 'TASK-20250826-B849C6FF',
        assignedAgent: 'AI-Agent-Developer',
        status: 'assigned',
        requiresApproval: false
      };

      mockPost.mockResolvedValue({ data: mockResponse });

      const request: TaskSubmissionRequest = {
        taskName: 'Simple Task',
        taskDescription: 'Basic development task',
        taskType: 'development'
      };

      const result = await taskService.submitTask(request);

      expect(mockPost).toHaveBeenCalledWith('/agents/tasks/submit', request);
      expect(result.success).toBe(true);
      expect(result.taskId).toBe('TASK-20250826-B849C6FF');
    });

    it('handles API errors correctly', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: {
            message: 'Invalid task data'
          }
        }
      };

      mockPost.mockRejectedValue(errorResponse);

      const request: TaskSubmissionRequest = {
        taskName: '',
        taskDescription: '',
        taskType: 'development'
      };

      await expect(taskService.submitTask(request)).rejects.toEqual(errorResponse);
    });

    it('validates task ID format in responses', async () => {
      const mockResponse: TaskSubmissionResponse = {
        success: true,
        message: 'Task submitted successfully',
        taskId: 'TASK-20250826-A949A5EE',
        assignedAgent: 'AI-Agent-Developer',
        status: 'assigned',
        requiresApproval: false
      };

      mockPost.mockResolvedValue({ data: mockResponse });

      const request: TaskSubmissionRequest = {
        taskName: 'Test Task',
        taskDescription: 'Test Description',
        taskType: 'development'
      };

      const result = await taskService.submitTask(request);

      // Task ID should follow pattern: TASK-YYYYMMDD-XXXXXXXX
      const taskIdPattern = /^TASK-\d{8}-[A-F0-9]{8}$/;
      expect(result.taskId).toMatch(taskIdPattern);
    });
  });

  describe('getTasks', () => {
    it('fetches tasks with default parameters', async () => {
      const mockTasks = {
        data: [
          {
            taskId: 'TASK-20250826-A123B456',
            taskName: 'Healthcare Compliance Check',
            taskType: 'compliance',
            status: 'completed' as const,
            priority: 'high' as const,
            assignedDate: '2025-08-26T10:00:00Z',
            completionPercentage: 100,
            agentId: 'AI-Agent-Compliance',
            createdBy: 'user@example.com',
            requiresApproval: true
          }
        ],
        summary: {
          total: 1,
          pending: 0,
          assigned: 0,
          inProgress: 0,
          completed: 1,
          failed: 0
        }
      };

      mockGet.mockResolvedValue({ data: mockTasks });

      const result = await taskService.getTasks();

      expect(mockGet).toHaveBeenCalledWith('/agents/tasks', { params: undefined });
      expect(result).toEqual(mockTasks);
    });

    it('fetches tasks with filter parameters', async () => {
      const mockTasks = {
        data: [],
        summary: {
          total: 0,
          pending: 0,
          assigned: 0,
          inProgress: 0,
          completed: 0,
          failed: 0
        }
      };

      mockGet.mockResolvedValue({ data: mockTasks });

      const filters = {
        status: 'in_progress' as const,
        agentId: 'AI-Agent-Security'
      };

      const result = await taskService.getTasks(filters);

      expect(mockGet).toHaveBeenCalledWith('/agents/tasks', { 
        params: filters 
      });
      expect(result).toEqual(mockTasks);
    });
  });

  describe('startTask', () => {
    it('starts a task successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Task started successfully',
        taskId: 'TASK-20250826-C789D012',
        status: 'in_progress'
      };

      mockPost.mockResolvedValue({ data: mockResponse });

      const result = await taskService.startTask('TASK-20250826-C789D012');

      expect(mockPost).toHaveBeenCalledWith('/agents/tasks/TASK-20250826-C789D012/start');
      expect(result).toEqual(mockResponse);
    });

    it('handles task start errors', async () => {
      const errorResponse = {
        response: {
          status: 404,
          data: { message: 'Task not found' }
        }
      };

      mockPost.mockRejectedValue(errorResponse);

      await expect(taskService.startTask('INVALID-TASK-ID')).rejects.toEqual(errorResponse);
    });
  });

  describe('getTaskStatistics', () => {
    it('fetches task summary statistics', async () => {
      const mockTaskData = {
        data: [],
        summary: {
          total: 25,
          pending: 3,
          assigned: 5,
          inProgress: 8,
          completed: 7,
          failed: 2
        }
      };

      mockGet.mockResolvedValue({ data: mockTaskData });

      const result = await taskService.getTaskStatistics();

      expect(mockGet).toHaveBeenCalledWith('/agents/tasks', { params: undefined });
      expect(result).toEqual(mockTaskData.summary);
    });
  });
});