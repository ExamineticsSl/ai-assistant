// Agent Role Types
export interface AgentRole {
  roleId: string;
  roleName: string;
  roleDescription: string;
  primaryCapabilities: string[];
  taskTypesSupported: string[];
  maxConcurrentTasks: number;
  maxTaskDurationHours: number;
  sdlcPhase: string;
  workflowPosition: number;
  isGatewayRole: boolean;
  requiresHumanApproval: boolean;
  isActive: boolean;
}

// Project Types
export interface Project {
  id: number;
  name: string;
  description?: string;
  projectType: string;
  status: 'planning' | 'active' | 'completed' | 'on_hold' | 'cancelled' | 'backlog' | 'deprecated';
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  businessObjective?: string;
  completionPercentage?: number;
  createdDate: string;
  createdBy?: string;
  sprint?: string;
  
  // Optional grooming fields (for future use)
  groomingStatus?: 'pending' | 'approved' | 'blocked' | 'review_required';
  groomingApprovedDate?: string;
  groomingApprovedBy?: string;
  readyForWork?: boolean;
  groomingNotes?: string;
}

// Task Types
export interface Task {
  taskId: string;
  projectId: number;
  title: string;
  description: string;
  taskType: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // Repository context
  repositoryName: string;
  workingDirectory?: string;
  gitBranch?: string;
  
  // Task scope
  estimatedHours: number;
  successCriteria?: string;
  deliverables?: string;
  dependencies?: string;
  
  // Role assignments
  requiredRoleId?: string;
  assignedRoleId?: string;
  roleWorkflowPosition?: number;
  
  // Work status
  workStatus: 'available' | 'claimed' | 'in_progress' | 'completed' | 'failed' | 'blocked' | 'subdivided' | 'abandoned';
  claimedByInstance?: string;
  claimedAt?: string;
  leaseExpiresAt?: string;
  
  // Grooming and approval
  taskGroomingStatus: 'pending' | 'approved' | 'blocked' | 'review_required';
  taskReadyForWork: boolean;
  requiresHumanApproval: boolean;
  humanApprovalStatus: 'not_required' | 'pending' | 'approved' | 'rejected' | 'escalated';
  
  // Tracking
  createdDate: string;
  completedDate?: string;
  actualHours?: number;
}

// Human Approval Types
export interface HumanApprovalRequest {
  id: number;
  taskId?: string;
  projectId?: number;
  
  // Request details
  approvalType: 'schema_change' | 'security_review' | 'compliance_review' | 'role_gate' | 'quality_gate' | 'escalation' | 'decision_point';
  requestedBy: string;
  
  // Content
  approvalTitle: string;
  approvalDescription: string;
  contextData?: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  
  // Status and timing
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'escalated' | 'expired';
  requestedDate: string;
  responseRequiredBy?: string;
  respondedDate?: string;
  respondedBy?: string;
  
  // Response
  approvalDecision?: 'approved' | 'rejected' | 'conditional' | 'escalated';
  approvalNotes?: string;
  conditions?: string;
  
  // File attachments
  attachments?: ApprovalAttachment[];
  responseAttachments?: ApprovalAttachment[];
}

export interface ApprovalAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  uploadedBy: string;
  description?: string;
  url?: string; // For viewing/downloading
  thumbnailUrl?: string; // For images
  isImage: boolean;
  isDocument: boolean;
}

export interface FileUploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'failed';
  error?: string;
  attachmentId?: string;
}

// Dashboard Types
export interface DashboardMetrics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTasks: number;
  availableTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  pendingApprovals: number;
  activeAgents: number;
}

export interface AgentInstance {
  instanceId: string;
  role: string;
  processId: number;
  startedAt: string;
  status: 'running' | 'stopped' | 'error';
  currentLoad: number;
  maxCapacity: number;
  repositoryFilter?: string;
  lastHeartbeat?: string;
}

export interface WorkflowProgress {
  projectId: number;
  projectName: string;
  totalStages: number;
  completedStages: number;
  currentStage: string;
  stageProgress: Array<{
    role: string;
    roleName: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
    completedAt?: string;
    duration?: number;
  }>;
}