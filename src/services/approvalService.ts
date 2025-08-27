import axios from 'axios';
import { HumanApprovalRequest, ApprovalAttachment } from '../types';
import { authService } from './authService';

// Configure axios with base URL for the AI API with SourceLink SSO
const api = axios.create({
  baseURL: 'http://localhost:5000/api/v1', // AI API with SourceLink authentication
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    // Add authentication headers for SourceLink SSO
    const authHeaders = authService.getAuthHeader();
    Object.assign(config.headers, authHeaders);
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling and auth
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle authentication errors
    if (error.response?.status === 401) {
      console.warn('Authentication required - redirecting to login');
      // In a real SourceLink implementation, this would redirect to SSO
      // For now, just log the user out
      authService.logout();
    }
    
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export interface ApprovalResponse {
  decision: 'approved' | 'rejected' | 'needs_info';
  notes: string;
  conditions?: string;
}

export interface ApprovalFilter {
  status?: string;
  priority?: string;
  approvalType?: string;
  projectId?: number;
  limit?: number;
  offset?: number;
}

export interface ApprovalStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
  averageResponseTime: number; // in hours
  oldestPending?: HumanApprovalRequest;
}

class ApprovalService {
  /**
   * Get pending approval requests with optional filtering
   */
  async getPendingApprovals(filter: 'all' | 'pending' | 'urgent' | 'escalated' = 'pending'): Promise<HumanApprovalRequest[]> {
    const params: ApprovalFilter = {};
    
    switch (filter) {
      case 'pending':
        params.status = 'pending';
        break;
      case 'urgent':
        // For new realistic endpoint, high and critical urgency levels
        params.status = 'pending';
        break;
      case 'escalated':
        params.status = 'escalated';
        break;
      case 'all':
        // No additional filters
        break;
    }

    // Use new realistic approvals endpoint that connects to LLM database
    const response = await api.get<{ data: HumanApprovalRequest[] }>('/approvals/pending', { params });
    return response.data.data || [];
  }

  /**
   * Get approval request by ID
   */
  async getApprovalById(id: number): Promise<HumanApprovalRequest> {
    const response = await api.get<{ data: HumanApprovalRequest }>(`/approvals/${id}`);
    return response.data.data;
  }

  /**
   * Respond to an approval request
   */
  async respondToApproval(approvalId: number, response: ApprovalResponse): Promise<void> {
    await api.post(`/approvals/${approvalId}/respond`, {
      decision: response.decision,
      responseNotes: response.notes,
      conditions: response.conditions,
      respondedBy: 'human-user', // TODO: Get from auth context
      respondedAt: new Date().toISOString(),
    });
  }

  /**
   * Escalate an approval request
   */
  async escalateApproval(approvalId: number, reason?: string): Promise<void> {
    await api.post(`/approvals/${approvalId}/escalate`, {
      reason: reason || 'Manual escalation',
      escalatedBy: 'human-user', // TODO: Get from auth context
    });
  }

  /**
   * Get approval statistics
   */
  async getApprovalStats(): Promise<ApprovalStats> {
    const response = await api.get<{ data: ApprovalStats }>('/approvals/stats');
    return response.data.data;
  }

  /**
   * Get approval history with pagination
   */
  async getApprovalHistory(filter?: ApprovalFilter): Promise<{
    approvals: HumanApprovalRequest[];
    total: number;
    hasMore: boolean;
  }> {
    const response = await api.get<{
      data: HumanApprovalRequest[];
      total: number;
      hasMore: boolean;
    }>('/approvals/history', { params: filter });
    
    return {
      approvals: response.data.data || [],
      total: response.data.total || 0,
      hasMore: response.data.hasMore || false,
    };
  }

  /**
   * Get approvals for a specific project
   */
  async getProjectApprovals(projectId: number): Promise<HumanApprovalRequest[]> {
    const response = await api.get<{ data: HumanApprovalRequest[] }>(`/approvals/project/${projectId}`);
    return response.data.data || [];
  }

  /**
   * Get approvals that are overdue
   */
  async getOverdueApprovals(): Promise<HumanApprovalRequest[]> {
    const response = await api.get<{ data: HumanApprovalRequest[] }>('/approvals/overdue');
    return response.data.data || [];
  }

  /**
   * Bulk approve multiple requests
   */
  async bulkApprove(approvalIds: number[], notes: string): Promise<void> {
    await api.post('/approvals/bulk-approve', {
      approvalIds,
      responseNotes: notes,
      respondedBy: 'human-user', // TODO: Get from auth context
    });
  }

  /**
   * Get approval request templates for quick responses
   */
  async getResponseTemplates(approvalType: string): Promise<Array<{
    id: string;
    title: string;
    notes: string;
    decision: 'approved' | 'rejected' | 'needs_info';
  }>> {
    const response = await api.get<{ data: any[] }>(`/approvals/templates/${approvalType}`);
    return response.data.data || [];
  }

  /**
   * Subscribe to real-time approval updates via Server-Sent Events
   */
  subscribeToUpdates(onUpdate: (approval: HumanApprovalRequest) => void): EventSource {
    const eventSource = new EventSource(`${api.defaults.baseURL}/approvals/events`);
    
    eventSource.onmessage = (event) => {
      try {
        const approval = JSON.parse(event.data) as HumanApprovalRequest;
        onUpdate(approval);
      } catch (error) {
        console.error('Error parsing approval update:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Approval updates connection error:', error);
    };

    return eventSource;
  }

  /**
   * Search approvals by text
   */
  async searchApprovals(query: string, filters?: ApprovalFilter): Promise<HumanApprovalRequest[]> {
    const params = { ...filters, q: query };
    const response = await api.get<{ data: HumanApprovalRequest[] }>('/approvals/search', { params });
    return response.data.data || [];
  }

  /**
   * Export approvals to CSV
   */
  async exportApprovals(filters?: ApprovalFilter): Promise<Blob> {
    const response = await api.get('/approvals/export', {
      params: filters,
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Get approval workflow configuration
   */
  async getWorkflowConfig(): Promise<{
    approvalTypes: string[];
    priorities: string[];
    defaultTimeouts: Record<string, number>;
    escalationRules: Array<{
      condition: string;
      action: string;
      timeout: number;
    }>;
  }> {
    const response = await api.get<{ data: any }>('/approvals/workflow-config');
    return response.data.data;
  }

  /**
   * Update approval configuration
   */
  async updateWorkflowConfig(config: any): Promise<void> {
    await api.put('/approvals/workflow-config', config);
  }

  /**
   * Upload attachment for approval request
   */
  async uploadAttachment(
    approvalId: number | undefined, 
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<ApprovalAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', ''); // Optional description
    
    const response = await api.post<{ data: ApprovalAttachment }>(
      `/approvals/${approvalId}/attachments`, 
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = progressEvent.loaded / progressEvent.total;
            onProgress(progress);
          }
        },
      }
    );
    
    return response.data.data;
  }

  /**
   * Remove attachment from approval request
   */
  async removeAttachment(approvalId: number, attachmentId: string): Promise<void> {
    await api.delete(`/approvals/${approvalId}/attachments/${attachmentId}`);
  }

  /**
   * Get attachments for an approval request
   */
  async getAttachments(approvalId: number): Promise<ApprovalAttachment[]> {
    const response = await api.get<{ data: ApprovalAttachment[] }>(`/approvals/${approvalId}/attachments`);
    return response.data.data || [];
  }

  /**
   * Update attachment description
   */
  async updateAttachment(
    approvalId: number, 
    attachmentId: string, 
    updates: { description?: string }
  ): Promise<ApprovalAttachment> {
    const response = await api.put<{ data: ApprovalAttachment }>(
      `/approvals/${approvalId}/attachments/${attachmentId}`, 
      updates
    );
    return response.data.data;
  }

  /**
   * Upload multiple files at once
   */
  async uploadMultipleAttachments(
    approvalId: number | undefined,
    files: File[],
    onProgress?: (fileIndex: number, progress: number) => void
  ): Promise<ApprovalAttachment[]> {
    const attachments: ApprovalAttachment[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const attachment = await this.uploadAttachment(
          approvalId,
          file,
          (progress) => onProgress?.(i, progress)
        );
        attachments.push(attachment);
      } catch (error) {
        console.error(`Failed to upload file ${file.name}:`, error);
        throw error;
      }
    }
    
    return attachments;
  }

  /**
   * Get file preview URL (for images)
   */
  async getFilePreview(attachmentId: string): Promise<string> {
    const response = await api.get(`/attachments/${attachmentId}/preview`, {
      responseType: 'blob',
    });
    
    return URL.createObjectURL(response.data);
  }

  /**
   * Generate signed URL for direct file access
   */
  async getSignedFileUrl(attachmentId: string, expiresInHours: number = 24): Promise<string> {
    const response = await api.post<{ data: { url: string } }>(`/attachments/${attachmentId}/signed-url`, {
      expiresInHours,
    });
    
    return response.data.data.url;
  }
}

export const approvalService = new ApprovalService();