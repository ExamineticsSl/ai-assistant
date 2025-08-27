import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/v1';

export interface Prototype {
  id: number;
  projectId: number;
  name: string;
  description: string;
  prototypeType: string;
  currentVersion: string;
  status: string;
  buildPath?: string;
  entryPoint?: string;
  framework: string;
  requiresApproval: boolean;
  healthcareCompliance: boolean;
  hipaaReviewed: boolean;
  accessibilityTested: boolean;
  createdDate: string;
  createdBy: string;
  lastUpdated: string;
  updatedBy?: string;
  approvedDate?: string;
  approvedBy?: string;
  projectName: string;
  versionCount?: number;
  openFeedbackCount?: number;
}

export interface PrototypeVersion {
  id: number;
  prototypeId: number;
  version: string;
  versionNotes?: string;
  buildPath: string;
  entryPoint: string;
  buildSizeKb?: number;
  loadTimeMs?: number;
  isActive: boolean;
  status: string;
  changelog?: string;
  breakingChanges: boolean;
  healthcareValidated: boolean;
  securityReviewed: boolean;
  accessibilityScore?: number;
  performanceScore?: number;
  createdDate: string;
  createdBy: string;
  deployedDate?: string;
  deployedBy?: string;
  deprecatedDate?: string;
  deprecatedBy?: string;
}

export interface PrototypeFeedback {
  id: number;
  prototypeVersionId: number;
  userId: string;
  feedbackType: string;
  title?: string;
  comment: string;
  status: string;
  priority: string;
  category?: string;
  positionX?: number;
  positionY?: number;
  elementSelector?: string;
  pageUrl?: string;
  screenshotPath?: string;
  browserInfo?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  healthcareImpact?: string;
  complianceConcern: boolean;
  accessibilityIssue: boolean;
  securityConcern: boolean;
  assignedTo?: string;
  createdDate: string;
  updatedDate: string;
  resolvedDate?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
}

export interface CreatePrototypeRequest {
  projectId: number;
  name: string;
  description?: string;
  prototypeType: string;
  framework?: string;
  buildPath?: string;
  entryPoint?: string;
  requiresApproval?: boolean;
  healthcareCompliance?: boolean;
  metadata?: string;
}

export interface CreateVersionRequest {
  version: string;
  versionNotes?: string;
  buildPath: string;
  entryPoint?: string;
  isActive?: boolean;
  changelog?: string;
  breakingChanges?: boolean;
}

export interface SubmitFeedbackRequest {
  feedbackType: string;
  title?: string;
  comment: string;
  priority?: string;
  category?: string;
  positionX?: number;
  positionY?: number;
  elementSelector?: string;
  pageUrl?: string;
  healthcareImpact?: string;
  complianceConcern?: boolean;
  accessibilityIssue?: boolean;
  securityConcern?: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  details?: any;
}

class PrototypeService {
  private getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Get all prototypes for a specific project
   */
  async getPrototypesByProject(projectId: number): Promise<Prototype[]> {
    try {
      const response: AxiosResponse<ApiResponse<Prototype[]>> = await axios.get(
        `${API_BASE_URL}/prototypes/project/${projectId}`,
        { headers: this.getAuthHeaders() }
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch prototypes');
      }
    } catch (error: any) {
      console.error('Error fetching prototypes:', error);
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('Failed to fetch prototypes. Please check your connection.');
    }
  }

  /**
   * Get specific prototype with versions and details
   */
  async getPrototype(prototypeId: number): Promise<{
    prototype: Prototype;
    versions: PrototypeVersion[];
  }> {
    try {
      const response: AxiosResponse<ApiResponse<{
        prototype: Prototype;
        versions: PrototypeVersion[];
      }>> = await axios.get(
        `${API_BASE_URL}/prototypes/${prototypeId}`,
        { headers: this.getAuthHeaders() }
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch prototype');
      }
    } catch (error: any) {
      console.error('Error fetching prototype:', error);
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('Failed to fetch prototype. Please check your connection.');
    }
  }

  /**
   * Create a new prototype
   */
  async createPrototype(request: CreatePrototypeRequest): Promise<{ prototypeId: number }> {
    try {
      const response: AxiosResponse<ApiResponse<{ prototypeId: number }>> = await axios.post(
        `${API_BASE_URL}/prototypes`,
        request,
        { 
          headers: {
            ...this.getAuthHeaders(),
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to create prototype');
      }
    } catch (error: any) {
      console.error('Error creating prototype:', error);
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      if (error.response?.data?.details) {
        // Handle validation errors
        const validationErrors = Object.values(error.response.data.details)
          .flat()
          .join(', ');
        throw new Error(`Validation failed: ${validationErrors}`);
      }
      throw new Error('Failed to create prototype. Please check your input.');
    }
  }

  /**
   * Create a new version of an existing prototype
   */
  async createPrototypeVersion(prototypeId: number, request: CreateVersionRequest): Promise<{ versionId: number }> {
    try {
      const response: AxiosResponse<ApiResponse<{ versionId: number }>> = await axios.post(
        `${API_BASE_URL}/prototypes/${prototypeId}/versions`,
        request,
        { 
          headers: {
            ...this.getAuthHeaders(),
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to create prototype version');
      }
    } catch (error: any) {
      console.error('Error creating prototype version:', error);
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      if (error.response?.data?.details) {
        const validationErrors = Object.values(error.response.data.details)
          .flat()
          .join(', ');
        throw new Error(`Validation failed: ${validationErrors}`);
      }
      throw new Error('Failed to create prototype version. Please check your input.');
    }
  }

  /**
   * Get feedback for a specific prototype version
   */
  async getFeedback(prototypeId: number, version: string): Promise<PrototypeFeedback[]> {
    try {
      const response: AxiosResponse<ApiResponse<PrototypeFeedback[]>> = await axios.get(
        `${API_BASE_URL}/prototypes/${prototypeId}/versions/${version}/feedback`,
        { headers: this.getAuthHeaders() }
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch feedback');
      }
    } catch (error: any) {
      console.error('Error fetching feedback:', error);
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('Failed to fetch feedback. Please check your connection.');
    }
  }

  /**
   * Submit feedback for a prototype version
   */
  async submitFeedback(
    prototypeId: number, 
    version: string, 
    request: SubmitFeedbackRequest
  ): Promise<{ feedbackId: number }> {
    try {
      const response: AxiosResponse<ApiResponse<{ feedbackId: number }>> = await axios.post(
        `${API_BASE_URL}/prototypes/${prototypeId}/versions/${version}/feedback`,
        request,
        { 
          headers: {
            ...this.getAuthHeaders(),
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to submit feedback');
      }
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      if (error.response?.data?.details) {
        const validationErrors = Object.values(error.response.data.details)
          .flat()
          .join(', ');
        throw new Error(`Validation failed: ${validationErrors}`);
      }
      throw new Error('Failed to submit feedback. Please check your input.');
    }
  }

  /**
   * Get prototype statistics and analytics
   */
  async getPrototypeAnalytics(prototypeId: number): Promise<{
    totalFeedback: number;
    feedbackByType: { [key: string]: number };
    feedbackByPriority: { [key: string]: number };
    healthcareComplianceIssues: number;
    accessibilityIssues: number;
    securityConcerns: number;
    averageResolutionTime: number;
  }> {
    try {
      // This would be implemented as a separate endpoint in the API
      // For now, we'll aggregate data from feedback calls
      const feedback = await this.getFeedback(prototypeId, 'latest');
      
      const analytics = {
        totalFeedback: feedback.length,
        feedbackByType: feedback.reduce((acc: { [key: string]: number }, f) => {
          acc[f.feedbackType] = (acc[f.feedbackType] || 0) + 1;
          return acc;
        }, {}),
        feedbackByPriority: feedback.reduce((acc: { [key: string]: number }, f) => {
          acc[f.priority] = (acc[f.priority] || 0) + 1;
          return acc;
        }, {}),
        healthcareComplianceIssues: feedback.filter(f => f.complianceConcern).length,
        accessibilityIssues: feedback.filter(f => f.accessibilityIssue).length,
        securityConcerns: feedback.filter(f => f.securityConcern).length,
        averageResolutionTime: 0 // Would need resolution time calculation
      };

      return analytics;
    } catch (error: any) {
      console.error('Error fetching prototype analytics:', error);
      throw new Error('Failed to fetch prototype analytics.');
    }
  }

  /**
   * Get all available prototype types
   */
  getPrototypeTypes(): Array<{ text: string; value: string }> {
    return [
      { text: 'UI Component', value: 'ui-component' },
      { text: 'Full Application', value: 'full-app' },
      { text: 'Workflow', value: 'workflow' },
      { text: 'Form', value: 'form' },
      { text: 'Dashboard', value: 'dashboard' },
      { text: 'Report', value: 'report' },
      { text: 'Mobile', value: 'mobile' }
    ];
  }

  /**
   * Get all available frameworks
   */
  getFrameworks(): Array<{ text: string; value: string }> {
    return [
      { text: 'React', value: 'react' },
      { text: 'Vue', value: 'vue' },
      { text: 'Angular', value: 'angular' },
      { text: 'Vanilla JS', value: 'vanilla-js' },
      { text: 'Static HTML', value: 'html-static' }
    ];
  }

  /**
   * Get feedback types
   */
  getFeedbackTypes(): Array<{ text: string; value: string }> {
    return [
      { text: 'Comment', value: 'comment' },
      { text: 'Bug Report', value: 'bug' },
      { text: 'Enhancement', value: 'enhancement' },
      { text: 'Question', value: 'question' },
      { text: 'Accessibility Issue', value: 'accessibility' },
      { text: 'Security Concern', value: 'security' },
      { text: 'Compliance Issue', value: 'compliance' }
    ];
  }

  /**
   * Get priority levels
   */
  getPriorityLevels(): Array<{ text: string; value: string }> {
    return [
      { text: 'Low', value: 'Low' },
      { text: 'Medium', value: 'Medium' },
      { text: 'High', value: 'High' },
      { text: 'Critical', value: 'Critical' }
    ];
  }

  /**
   * Get healthcare impact levels
   */
  getHealthcareImpactLevels(): Array<{ text: string; value: string }> {
    return [
      { text: 'None', value: 'none' },
      { text: 'Low', value: 'low' },
      { text: 'Medium', value: 'medium' },
      { text: 'High', value: 'high' },
      { text: 'Critical', value: 'critical' }
    ];
  }
}

export const prototypeService = new PrototypeService();