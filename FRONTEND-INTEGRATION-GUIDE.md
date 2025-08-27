# Healthcare AI Frontend Integration Guide

## Overview

The Healthcare AI React frontend provides a comprehensive human-in-the-loop interface for AI task management, real-time agent monitoring, and approval workflows. Built with React 18, TypeScript, and Tailwind CSS for enterprise healthcare environments.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    React Application                       │
│  ┌─────────────────┐ ┌─────────────────┐ ┌──────────────┐  │
│  │ Task Submission │ │ Agent Monitor   │ │ Approval Hub │  │
│  │     Modal       │ │   Dashboard     │ │   Interface  │  │
│  └─────────────────┘ └─────────────────┘ └──────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Service Layer                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ TaskService │ │ AgentService│ │ApprovalSrvc │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
├─────────────────────────────────────────────────────────────┤
│                    React Query Cache                       │
│       Real-time updates • Optimistic updates • Caching     │
├─────────────────────────────────────────────────────────────┤
│                    Healthcare AI API                       │
│              http://localhost:5000/api/v1                  │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. TaskSubmissionModal

**Location:** `src/components/TaskSubmissionModal.tsx`

Comprehensive modal for submitting AI tasks with approval workflow configuration.

**Features:**
- Task details form with validation
- Agent and project selection dropdowns
- Priority and approval settings
- Real-time feedback and success states
- Integration with React Query for cache invalidation

**Props:**
```typescript
interface TaskSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: number;
  assignToAgent?: string;
}
```

**Usage:**
```tsx
<TaskSubmissionModal
  isOpen={showTaskSubmissionModal}
  onClose={() => setShowTaskSubmissionModal(false)}
  projectId={selectedProject || undefined}
/>
```

### 2. ProjectProgressTracking

**Location:** `src/components/ProjectProgressTracking.tsx`

Enhanced with live agent monitoring and task submission capabilities.

**New Features:**
- "Submit Task" button in header
- Clickable agent indicators for detailed views
- Real-time agent status with live indicators
- Task submission modal integration

**Agent Status Display:**
```tsx
{activeAgents?.slice(0, 4).map((agent) => (
  <div 
    key={agent.agentId}
    className="cursor-pointer hover:bg-white hover:shadow-sm"
    onClick={() => setSelectedAgent(agent.agentId)}
  >
    <div className="status-indicator">
      {/* Real-time status indicators */}
    </div>
  </div>
))}
```

### 3. AgentDetailModal

**Location:** `src/components/ProjectProgressTracking.tsx` (embedded)

Detailed agent information modal with real-time updates.

**Features:**
- Agent status overview with health indicators
- Current task information and progress
- Performance metrics visualization
- Task history and capabilities listing
- Action buttons (View Logs, Restart Agent)

## Service Layer

### TaskService

**Location:** `src/services/taskService.ts`

Comprehensive service for task management operations.

**Key Methods:**
```typescript
class TaskService {
  // Submit new task
  async submitTask(request: TaskSubmissionRequest): Promise<TaskSubmissionResponse>
  
  // Get tasks with filtering
  async getTasks(filter?: TaskFilter): Promise<{ data: Task[]; summary: TaskStats }>
  
  // Task lifecycle management
  async startTask(taskId: string): Promise<TaskActionResponse>
  async getTaskById(taskId: string): Promise<Task>
  
  // Specialized queries
  async getPendingApprovalTasks(): Promise<Task[]>
  async getActiveTasks(): Promise<Task[]>
  async getTasksRequiringAttention(): Promise<Task[]>
}
```

### AgentService (Enhanced)

**Location:** `src/services/agentService.ts`

Enhanced with detailed agent information queries.

**New Methods:**
```typescript
// Get detailed agent information
async getAgentDetails(agentId: string): Promise<AgentDetails>

// Agent performance analytics
async getAgentPerformanceMetrics(): Promise<PerformanceMetrics>
async getAgentStatusSummary(): Promise<StatusSummary>
```

### ApprovalService (Existing)

**Location:** `src/services/approvalService.ts`

Comprehensive approval management with task integration.

## Real-Time Updates

### React Query Configuration

```typescript
// Task submission with cache invalidation
const { data: activeAgentsData } = useQuery({
  queryKey: ['active-agents'],
  queryFn: async () => await agentService.getActiveAgents(),
  refetchInterval: 10000, // 10 seconds
});

// Agent details with live updates  
const { data: agentDetails } = useQuery({
  queryKey: ['agent-details', selectedAgent],
  queryFn: async () => selectedAgent ? await agentService.getAgentDetails(selectedAgent) : null,
  enabled: !!selectedAgent,
  refetchInterval: 5000, // 5 seconds for detail view
});
```

### Cache Invalidation Strategy

```typescript
// After task submission
queryClient.invalidateQueries({ queryKey: ['active-agents'] });
queryClient.invalidateQueries({ queryKey: ['tasks'] });
queryClient.invalidateQueries({ queryKey: ['project-progress'] });
if (formData.requiresApproval) {
  queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
}
```

## TypeScript Interfaces

### Task Management Types

```typescript
export interface Task {
  taskId: string;
  taskName: string;
  taskDescription: string;
  taskType: string;
  status: 'pending_approval' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  priority: 'low' | 'normal' | 'high' | 'critical';
  assignedDate: string;
  estimatedHours?: number;
  agentId: string;
  projectId?: number;
  requiresApproval: boolean;
  // ... additional fields
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
```

### Agent Management Types

```typescript
export interface AgentInstance {
  agentId: string;
  agentName: string;
  roleName: string;
  status: 'idle' | 'active' | 'busy' | 'error' | 'maintenance' | 'offline';
  currentTask?: string;
  lastActivity: string;
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
```

## UI/UX Features

### Task Submission Flow

1. **Initiation:** User clicks "Submit Task" button in header
2. **Form Completion:** Modal appears with comprehensive task form
3. **Validation:** Real-time form validation with error feedback
4. **Submission:** Task submitted with loading states
5. **Confirmation:** Success message with task ID and status
6. **Integration:** Cache invalidation triggers UI updates

### Agent Interaction Flow

1. **Overview:** Live agent status indicators in agent pool
2. **Selection:** Click agent indicator for detailed view
3. **Details:** Modal with comprehensive agent information
4. **Actions:** View logs, restart agent (if needed)
5. **Monitoring:** Real-time updates every 5 seconds

### Visual Design System

**Status Indicators:**
- 🟢 Active/Healthy - Green indicators
- 🔵 Busy/In Progress - Blue indicators  
- 🟡 Idle/Warning - Yellow indicators
- 🔴 Error/Unhealthy - Red indicators
- ⚫ Offline/Stale - Gray indicators

**Priority Colors:**
- Critical - Red (bg-red-500)
- High - Orange (bg-orange-500)
- Normal - Blue (bg-blue-500)
- Low - Gray (bg-gray-500)

## Integration Points

### Authentication

```typescript
// SourceLink SSO integration
api.interceptors.request.use((config) => {
  const authHeaders = authService.getAuthHeader();
  config.headers = { ...config.headers, ...authHeaders };
  return config;
});
```

### Error Handling

```typescript
// Comprehensive error handling with user feedback
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
```

## Performance Optimizations

### Efficient Polling

- Agent overview: 10-second intervals
- Agent details: 5-second intervals when modal open  
- Task lists: 30-second intervals
- Approval queue: 15-second intervals

### React Query Optimizations

```typescript
// Stale-while-revalidate pattern
{
  queryKey: ['active-agents'],
  queryFn: agentService.getActiveAgents,
  staleTime: 5000,
  cacheTime: 300000, // 5 minutes
  refetchOnWindowFocus: false,
}
```

### Bundle Optimization

- Code splitting for modal components
- Lazy loading of detail views
- Efficient re-renders with React.memo
- Optimized Tailwind CSS purging

## Healthcare Compliance

### HIPAA Considerations

- No PHI data displayed in task descriptions
- Secure authentication via SourceLink SSO
- Audit logging for all user interactions
- Session management with timeout

### Security Features

- Input sanitization and validation
- XSS protection via React's built-in escaping
- CSRF protection through JWT tokens
- Secure HTTP-only cookie handling

## Development Workflow

### Local Development

```bash
# Start React development server
cd ai-assistant
npm run dev

# Start API server (separate terminal)
cd Whs.Ai.Api  
dotnet run
```

### Testing Strategy

- Unit tests for service layer functions
- Integration tests for API communication
- Component tests for critical UI flows
- E2E tests for complete workflows

### Build and Deployment

```bash
# Production build
npm run build

# Type checking
npm run type-check

# Linting and formatting
npm run lint
npm run format
```

---

**Generated:** August 26, 2025  
**Version:** 1.0  
**Healthcare AI Frontend Integration**  
**React + TypeScript + Tailwind CSS**