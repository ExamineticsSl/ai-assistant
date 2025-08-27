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
      console.warn('Authentication required for agents');
      authService.logout();
    }
    console.error('Agent API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export interface AgentInstance {
  id: number;
  agentId: string;
  agentName: string;
  roleName: string;
  roleDescription: string;
  status: 'idle' | 'active' | 'busy' | 'error' | 'maintenance' | 'offline';
  currentTask?: string;
  lastActivity: string;
  createdDate: string;
  projectName?: string;
  projectId?: number;
  performanceMetrics: {
    tasksCompleted: number;
    averageTime: number;
    successRate: number;
  };
  taskStats: {
    assignedTasks: number;
    completedTasks: number;
    activeTasks: number;
  };
  healthStatus: 'healthy' | 'warning' | 'unhealthy' | 'stale';
  capabilities: string[];
}

export interface AgentSummary {
  activeAgents: number;
  busyAgents: number;
  idleAgents: number;
  totalTasks: number;
  completedTasks: number;
}

export interface WorkflowStage {
  workflowStage: string;
  stageStatus: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped' | 'blocked';
  startedDate?: string;
  completedDate?: string;
  assignedAgent?: string;
  agentName?: string;
  agentRole?: string;
  approvalRequired: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected' | 'not_required';
}

export interface ProjectWorkflow {
  projectId: number;
  projectName: string;
  projectStatus: string;
  completionPercentage: number;
  workflowStages: WorkflowStage[];
}

export interface WorkflowSummary {
  activeProjects: number;
  totalStages: number;
  completedStages: number;
  pendingApprovals: number;
}

export interface AgentDetails extends AgentInstance {
  capabilities: string[];
  permissions: string[];
  configuration: Record<string, any>;
  taskHistory: AgentTask[];
  workflowProgress: AgentWorkflowProgress[];
  statistics: {
    totalTasks: number;
    completedTasks: number;
    activeTasks: number;
    averageTaskTime: number;
    successRate: number;
  };
}

export interface AgentTask {
  taskId: string;
  taskName: string;
  taskDescription: string;
  taskType: string;
  status: string;
  priority: string;
  assignedDate: string;
  startedDate?: string;
  completedDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  completionPercentage: number;
  results?: string;
}

export interface AgentWorkflowProgress {
  workflowStage: string;
  stageStatus: string;
  startedDate?: string;
  completedDate?: string;
  stageNotes?: string;
  projectName: string;
}

class AgentService {
  /**
   * Get all active AI agents with their current status and task assignments
   */
  async getActiveAgents(): Promise<{ 
    data: AgentInstance[], 
    total: number, 
    timestamp: string,
    summary: AgentSummary 
  }> {
    const response = await api.get('/agents');
    return response.data;
  }

  /**
   * Get detailed information about a specific AI agent
   */
  async getAgentDetails(agentId: string): Promise<AgentDetails> {
    const response = await api.get(`/agents/${agentId}`);
    return response.data;
  }

  /**
   * Get real-time workflow progress for all active projects
   */
  async getWorkflowProgress(): Promise<{
    data: ProjectWorkflow[],
    total: number,
    timestamp: string,
    summary: WorkflowSummary
  }> {
    const response = await api.get('/agents/workflow-progress');
    return response.data;
  }

  /**
   * Update an agent's status (used by WorkerService integration)
   */
  async updateAgentStatus(agentId: string, statusUpdate: {
    status: string;
    currentTask?: string;
    performanceMetrics?: string;
  }): Promise<{ message: string; agentId: string; newStatus: string; timestamp: string }> {
    const response = await api.put(`/agents/${agentId}/status`, statusUpdate);
    return response.data;
  }

  /**
   * Get agents filtered by status
   */
  async getAgentsByStatus(status: string): Promise<AgentInstance[]> {
    const agentsData = await this.getActiveAgents();
    return agentsData.data.filter(agent => agent.status === status);
  }

  /**
   * Get active agents (busy or active status)
   */
  async getActivelyWorkingAgents(): Promise<AgentInstance[]> {
    const agentsData = await this.getActiveAgents();
    return agentsData.data.filter(agent => ['active', 'busy'].includes(agent.status));
  }

  /**
   * Get idle agents available for new tasks
   */
  async getIdleAgents(): Promise<AgentInstance[]> {
    return this.getAgentsByStatus('idle');
  }

  /**
   * Get agents by role
   */
  async getAgentsByRole(roleName: string): Promise<AgentInstance[]> {
    const agentsData = await this.getActiveAgents();
    return agentsData.data.filter(agent => agent.roleName === roleName);
  }

  /**
   * Get agents working on a specific project
   */
  async getAgentsByProject(projectId: number): Promise<AgentInstance[]> {
    const agentsData = await this.getActiveAgents();
    return agentsData.data.filter(agent => agent.projectId === projectId);
  }

  /**
   * Get agent performance metrics summary
   */
  async getAgentPerformanceMetrics(): Promise<{
    totalAgents: number;
    averageTasksCompleted: number;
    averageSuccessRate: number;
    averageResponseTime: number;
    healthyAgents: number;
    warningAgents: number;
    unhealthyAgents: number;
  }> {
    const agentsData = await this.getActiveAgents();
    const agents = agentsData.data;

    if (agents.length === 0) {
      return {
        totalAgents: 0,
        averageTasksCompleted: 0,
        averageSuccessRate: 0,
        averageResponseTime: 0,
        healthyAgents: 0,
        warningAgents: 0,
        unhealthyAgents: 0
      };
    }

    const totalTasksCompleted = agents.reduce((sum, agent) => sum + agent.performanceMetrics.tasksCompleted, 0);
    const totalSuccessRate = agents.reduce((sum, agent) => sum + agent.performanceMetrics.successRate, 0);
    const totalResponseTime = agents.reduce((sum, agent) => sum + agent.performanceMetrics.averageTime, 0);

    return {
      totalAgents: agents.length,
      averageTasksCompleted: totalTasksCompleted / agents.length,
      averageSuccessRate: totalSuccessRate / agents.length,
      averageResponseTime: totalResponseTime / agents.length,
      healthyAgents: agents.filter(a => a.healthStatus === 'healthy').length,
      warningAgents: agents.filter(a => a.healthStatus === 'warning').length,
      unhealthyAgents: agents.filter(a => ['unhealthy', 'stale'].includes(a.healthStatus)).length
    };
  }

  /**
   * Get workflow progress for a specific project
   */
  async getProjectWorkflow(projectId: number): Promise<ProjectWorkflow | null> {
    const workflowData = await this.getWorkflowProgress();
    return workflowData.data.find(p => p.projectId === projectId) || null;
  }

  /**
   * Get agents that require attention (unhealthy, stale, or error status)
   */
  async getAgentsRequiringAttention(): Promise<AgentInstance[]> {
    const agentsData = await this.getActiveAgents();
    return agentsData.data.filter(agent => 
      ['unhealthy', 'stale', 'error', 'offline'].includes(agent.healthStatus) ||
      agent.status === 'error'
    );
  }

  /**
   * Get agent role distribution
   */
  async getAgentRoleDistribution(): Promise<Record<string, number>> {
    const agentsData = await this.getActiveAgents();
    const distribution: Record<string, number> = {};
    
    agentsData.data.forEach(agent => {
      const role = agent.roleName || 'Unknown';
      distribution[role] = (distribution[role] || 0) + 1;
    });
    
    return distribution;
  }

  /**
   * Get real-time agent activity (agents active in the last 10 minutes)
   */
  async getRecentAgentActivity(): Promise<AgentInstance[]> {
    const agentsData = await this.getActiveAgents();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    return agentsData.data.filter(agent => {
      const lastActivity = new Date(agent.lastActivity);
      return lastActivity > tenMinutesAgo;
    });
  }

  /**
   * Get agent status summary for dashboard
   */
  async getAgentStatusSummary(): Promise<{
    total: number;
    active: number;
    busy: number;
    idle: number;
    error: number;
    offline: number;
    healthy: number;
    warning: number;
    unhealthy: number;
  }> {
    const agentsData = await this.getActiveAgents();
    const agents = agentsData.data;

    const statusCounts = {
      total: agents.length,
      active: agents.filter(a => a.status === 'active').length,
      busy: agents.filter(a => a.status === 'busy').length,
      idle: agents.filter(a => a.status === 'idle').length,
      error: agents.filter(a => a.status === 'error').length,
      offline: agents.filter(a => a.status === 'offline').length,
      healthy: agents.filter(a => a.healthStatus === 'healthy').length,
      warning: agents.filter(a => a.healthStatus === 'warning').length,
      unhealthy: agents.filter(a => ['unhealthy', 'stale'].includes(a.healthStatus)).length,
    };

    return statusCounts;
  }
}

export const agentService = new AgentService();