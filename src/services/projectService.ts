import axios from 'axios';
import { Project } from '../types';
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
      console.warn('Authentication required for projects');
      authService.logout();
    }
    console.error('Project API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export interface ProjectFilter {
  status?: string;
  priority?: string;
  projectType?: string;
  limit?: number;
  offset?: number;
}

export interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  planningProjects: number;
  backlogProjects: number;
  criticalProjects: number;
  highPriorityProjects: number;
  averageCompletion: number;
}

class ProjectService {
  /**
   * Get all projects with optional filtering
   */
  async getProjects(filter?: ProjectFilter): Promise<Project[]> {
    const params = filter || {};
    const response = await api.get<{ data: Project[] }>('/projects', { params });
    return response.data.data || [];
  }

  /**
   * Get project by ID
   */
  async getProjectById(id: number): Promise<Project> {
    const response = await api.get<{ data: Project }>(`/projects/${id}`);
    return response.data.data;
  }

  /**
   * Get project statistics
   */
  async getProjectStats(): Promise<ProjectStats> {
    const response = await api.get<{ data: ProjectStats }>('/projects/stats');
    return response.data.data;
  }

  /**
   * Get recent projects
   */
  async getRecentProjects(limit: number = 10): Promise<Project[]> {
    const response = await api.get<{ data: Project[] }>(`/projects/recent`, {
      params: { limit }
    });
    return response.data.data || [];
  }

  /**
   * Get projects by status
   */
  async getProjectsByStatus(status: string): Promise<Project[]> {
    return this.getProjects({ status });
  }

  /**
   * Get projects by priority
   */
  async getProjectsByPriority(priority: string): Promise<Project[]> {
    return this.getProjects({ priority });
  }

  /**
   * Get active projects
   */
  async getActiveProjects(): Promise<Project[]> {
    return this.getProjectsByStatus('active');
  }

  /**
   * Get projects in planning phase
   */
  async getPlanningProjects(): Promise<Project[]> {
    return this.getProjectsByStatus('planning');
  }

  /**
   * Get high priority projects
   */
  async getHighPriorityProjects(): Promise<Project[]> {
    const [critical, high] = await Promise.all([
      this.getProjectsByPriority('Critical'),
      this.getProjectsByPriority('High')
    ]);
    return [...critical, ...high];
  }

  /**
   * Get projects by type (e.g., "Package Management", "Testing Infrastructure")
   */
  async getProjectsByType(projectType: string): Promise<Project[]> {
    return this.getProjects({ projectType });
  }

  /**
   * Search projects by name or description
   */
  async searchProjects(query: string): Promise<Project[]> {
    // For now, get all projects and filter client-side
    // In future, could add server-side search endpoint
    const allProjects = await this.getProjects();
    const lowerQuery = query.toLowerCase();
    
    return allProjects.filter(project => 
      project.name.toLowerCase().includes(lowerQuery) ||
      (project.description && project.description.toLowerCase().includes(lowerQuery)) ||
      (project.businessObjective && project.businessObjective.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get project completion percentage distribution
   */
  async getCompletionDistribution(): Promise<{
    notStarted: number;
    inProgress: number; 
    nearCompletion: number;
    completed: number;
  }> {
    const projects = await this.getProjects();
    
    const distribution = {
      notStarted: 0,     // 0%
      inProgress: 0,     // 1-79%
      nearCompletion: 0, // 80-99%
      completed: 0       // 100%
    };

    projects.forEach(project => {
      const completion = project.completionPercentage || 0;
      if (completion === 0) {
        distribution.notStarted++;
      } else if (completion < 80) {
        distribution.inProgress++;
      } else if (completion < 100) {
        distribution.nearCompletion++;
      } else {
        distribution.completed++;
      }
    });

    return distribution;
  }

  /**
   * Get projects requiring attention (high priority or overdue)
   */
  async getProjectsRequiringAttention(): Promise<Project[]> {
    const projects = await this.getProjects();
    
    return projects.filter(project => {
      // High priority projects that are not completed
      const isHighPriority = ['Critical', 'High'].includes(project.priority || '');
      const isNotCompleted = project.status !== 'completed';
      
      // Projects that have been in planning too long (more than 30 days)
      const createdDate = new Date(project.createdDate);
      const daysSinceCreated = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      const isPlanningTooLong = project.status === 'planning' && daysSinceCreated > 30;
      
      return (isHighPriority && isNotCompleted) || isPlanningTooLong;
    });
  }

  /**
   * Get project type distribution
   */
  async getProjectTypeDistribution(): Promise<Record<string, number>> {
    const projects = await this.getProjects();
    const distribution: Record<string, number> = {};
    
    projects.forEach(project => {
      const type = project.projectType || 'Unknown';
      distribution[type] = (distribution[type] || 0) + 1;
    });
    
    return distribution;
  }

  /**
   * Create a new project
   */
  async createProject(projectData: {
    name: string;
    description?: string;
    projectType?: string;
    status?: string;
    priority?: string;
    businessObjective?: string;
    healthcareCompliance?: boolean;
    completionPercentage?: number;
    createdBy?: string;
  }): Promise<{ projectId: number }> {
    const response = await api.post<{ 
      success: boolean; 
      data: { projectId: number }; 
      message?: string; 
    }>('/projects', projectData);
    
    if (!response.data.success) {
      throw new Error('Failed to create project');
    }
    
    return response.data.data;
  }
}

export const projectService = new ProjectService();