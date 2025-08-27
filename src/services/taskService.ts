import axios from 'axios';
import { authService } from './authService';

// Configure axios with base URL for the AI API
const api = axios.create({
  baseURL: 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const authHeaders = authService.getAuthHeader();
    Object.assign(config.headers, authHeaders);
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Authentication required for tasks');
      authService.logout();
    }
    console.error('Task API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export interface Task {
  taskId: string;
  taskName: string;
  taskDescription: string;
  taskType: string;
  status: 'pending_approval' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  priority: 'low' | 'normal' | 'high' | 'critical';
  assignedDate: string;
  startedDate?: string;
  completedDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  completionPercentage: number;
  results?: string;
  agentId: string;
  projectId?: number;
  createdBy: string;
  requiresApproval: boolean;
  agentName?: string;
  agentRole?: string;
  projectName?: string;
}

export interface TaskSubmissionRequest {
  taskName: string;
  taskDescription: string;
  taskType: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  estimatedHours?: number;
  projectId?: number;
  assignToAgent?: string;
  requiresApproval?: boolean;
  approvalTimeoutHours?: number;
}

export interface TaskFilter {
  status?: string;
  agentId?: string;
  projectId?: number;
  priority?: string;
  taskType?: string;
  limit?: number;
  offset?: number;
}

export interface TaskStats {
  total: number;
  pending: number;
  assigned: number;
  inProgress: number;
  completed: number;
  failed: number;
}

export interface TaskSubmissionResponse {
  success: boolean;
  message: string;
  taskId: string;
  assignedAgent: string;
  status: string;
  requiresApproval: boolean;
}

class TaskService {
  /**
   * Submit a new task for AI agent processing
   */
  async submitTask(request: TaskSubmissionRequest): Promise<TaskSubmissionResponse> {
    const response = await api.post<TaskSubmissionResponse>('/agents/tasks/submit', request);
    return response.data;
  }

  /**
   * Get all tasks with optional filtering
   */
  async getTasks(filter?: TaskFilter): Promise<{ data: Task[]; summary: TaskStats }> {
    const response = await api.get<{ data: Task[]; summary: TaskStats }>('/agents/tasks', {
      params: filter
    });
    return response.data;
  }

  /**
   * Get task by ID
   */
  async getTaskById(taskId: string): Promise<Task> {
    const response = await api.get<{ data: Task }>(`/agents/tasks/${taskId}`);
    return response.data.data;
  }

  /**
   * Start execution of an approved task
   */
  async startTask(taskId: string): Promise<{ success: boolean; message: string; taskId: string; status: string }> {
    const response = await api.post(`/agents/tasks/${taskId}/start`);
    return response.data;
  }

  /**
   * Get tasks by status
   */
  async getTasksByStatus(status: string): Promise<Task[]> {
    const result = await this.getTasks({ status });
    return result.data;
  }

  /**
   * Get pending approval tasks
   */
  async getPendingApprovalTasks(): Promise<Task[]> {
    return this.getTasksByStatus('pending_approval');
  }

  /**
   * Get active tasks (in progress)
   */
  async getActiveTasks(): Promise<Task[]> {
    return this.getTasksByStatus('in_progress');
  }

  /**
   * Get completed tasks
   */
  async getCompletedTasks(): Promise<Task[]> {
    return this.getTasksByStatus('completed');
  }

  /**
   * Get failed tasks
   */
  async getFailedTasks(): Promise<Task[]> {
    return this.getTasksByStatus('failed');
  }

  /**
   * Get tasks assigned to a specific agent
   */
  async getAgentTasks(agentId: string): Promise<Task[]> {
    const result = await this.getTasks({ agentId });
    return result.data;
  }

  /**
   * Get tasks for a specific project
   */
  async getProjectTasks(projectId: number): Promise<Task[]> {
    const result = await this.getTasks({ projectId });
    return result.data;
  }

  /**
   * Get high priority tasks
   */
  async getHighPriorityTasks(): Promise<Task[]> {
    const [critical, high] = await Promise.all([
      this.getTasks({ priority: 'critical' }),
      this.getTasks({ priority: 'high' })
    ]);
    return [...critical.data, ...high.data];
  }

  /**
   * Get tasks by type
   */
  async getTasksByType(taskType: string): Promise<Task[]> {
    const result = await this.getTasks({ taskType });
    return result.data;
  }

  /**
   * Get task statistics summary
   */
  async getTaskStatistics(): Promise<TaskStats> {
    const result = await this.getTasks();
    return result.summary;
  }

  /**
   * Search tasks by name or description
   */
  async searchTasks(query: string): Promise<Task[]> {
    const result = await this.getTasks();
    const lowerQuery = query.toLowerCase();
    
    return result.data.filter(task => 
      task.taskName.toLowerCase().includes(lowerQuery) ||
      task.taskDescription.toLowerCase().includes(lowerQuery) ||
      task.taskType.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get tasks requiring attention (failed, overdue, high priority pending)
   */
  async getTasksRequiringAttention(): Promise<Task[]> {
    const result = await this.getTasks();
    const now = new Date();
    
    return result.data.filter(task => {
      // Failed tasks
      if (task.status === 'failed') return true;
      
      // High priority pending tasks
      if (task.status === 'pending_approval' && ['high', 'critical'].includes(task.priority)) return true;
      
      // Tasks in progress for more than estimated time
      if (task.status === 'in_progress' && task.startedDate && task.estimatedHours) {
        const startedAt = new Date(task.startedDate);
        const hoursRunning = (now.getTime() - startedAt.getTime()) / (1000 * 60 * 60);
        if (hoursRunning > task.estimatedHours * 1.5) return true; // 150% of estimated time
      }
      
      return false;
    });
  }

  /**
   * Get task completion rate by agent
   */
  async getAgentTaskCompletionRates(): Promise<Record<string, { completed: number; total: number; rate: number }>> {
    const result = await this.getTasks();
    const agentStats: Record<string, { completed: number; total: number }> = {};
    
    result.data.forEach(task => {
      if (!agentStats[task.agentId]) {
        agentStats[task.agentId] = { completed: 0, total: 0 };
      }
      agentStats[task.agentId].total++;
      if (task.status === 'completed') {
        agentStats[task.agentId].completed++;
      }
    });
    
    const rates: Record<string, { completed: number; total: number; rate: number }> = {};
    Object.entries(agentStats).forEach(([agentId, stats]) => {
      rates[agentId] = {
        ...stats,
        rate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0
      };
    });
    
    return rates;
  }

  /**
   * Get task type distribution
   */
  async getTaskTypeDistribution(): Promise<Record<string, number>> {
    const result = await this.getTasks();
    const distribution: Record<string, number> = {};
    
    result.data.forEach(task => {
      const type = task.taskType || 'Unknown';
      distribution[type] = (distribution[type] || 0) + 1;
    });
    
    return distribution;
  }

  /**
   * Get recent tasks (last 7 days)
   */
  async getRecentTasks(days: number = 7): Promise<Task[]> {
    const result = await this.getTasks();
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    return result.data.filter(task => {
      const assignedDate = new Date(task.assignedDate);
      return assignedDate >= cutoffDate;
    });
  }
}

export const taskService = new TaskService();