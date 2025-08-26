import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Project, Task, WorkflowProgress, AgentInstance } from '../types';
import { projectService } from '../services/projectService';

interface ProjectProgressTrackingProps {
  className?: string;
}

export const ProjectProgressTracking: React.FC<ProjectProgressTrackingProps> = ({ className = '' }) => {
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline' | 'kanban'>('grid');

  // Real project data from the API
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['project-progress'],
    queryFn: async () => {
      const realProjects = await projectService.getProjects();
      // Add mock workflow progress for visualization (in real system this would come from WorkerService)
      return realProjects.map((project, index) => ({
        ...project,
        workflowProgress: index < 2 ? mockWorkflowProgress[index] : undefined
      }));
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: activeAgents } = useQuery({
    queryKey: ['active-agents'],
    queryFn: async () => {
      return mockAgentData;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  if (projectsLoading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center mt-2 text-gray-600">Loading project progress...</p>
      </div>
    );
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'planning': return 'bg-blue-100 text-blue-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Project Progress Tracking</h2>
            <p className="text-sm text-gray-600">Monitor AI agent execution and project advancement</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              {['grid', 'timeline', 'kanban'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === mode
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Active Agents Summary */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Active Agent Pool</h3>
          <div className="flex items-center space-x-4">
            {activeAgents?.map((agent) => (
              <div key={agent.instanceId} className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  agent.status === 'running' ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                <span className="text-sm font-medium">{agent.role}</span>
                <span className="text-xs text-gray-500">({agent.currentLoad}/{agent.maxCapacity})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Projects Grid View */}
      {viewMode === 'grid' && (
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects?.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onSelect={() => setSelectedProject(project.id)}
                getProgressColor={getProgressColor}
                getStatusColor={getStatusColor}
              />
            ))}
          </div>
        </div>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="p-6">
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Timeline View</h3>
            <p className="text-gray-600">
              Gantt-style timeline showing project milestones and dependencies.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              <em>Feature coming soon...</em>
            </p>
          </div>
        </div>
      )}

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="p-6">
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Kanban Board</h3>
            <p className="text-gray-600">
              Drag-and-drop task management with workflow stages.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              <em>Feature coming soon...</em>
            </p>
          </div>
        </div>
      )}

      {/* Project Detail Modal */}
      {selectedProject && (
        <ProjectDetailModal
          project={projects?.find(p => p.id === selectedProject)!}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
};

interface ProjectCardProps {
  project: Project & { workflowProgress?: WorkflowProgress };
  onSelect: () => void;
  getProgressColor: (percentage: number) => string;
  getStatusColor: (status: string) => string;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ 
  project, 
  onSelect, 
  getProgressColor, 
  getStatusColor 
}) => {
  const isOverdue = project.workflowProgress?.stageProgress.some(stage => 
    stage.status === 'blocked' || 
    (stage.status === 'in_progress' && stage.duration && stage.duration > 24)
  );

  return (
    <div 
      className={`bg-white border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
        isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200'
      }`}
      onClick={onSelect}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 line-clamp-2">{project.name}</h3>
          <p className="text-sm text-gray-600 mt-1">ID: {project.id}</p>
        </div>
        <div className="flex flex-col items-end space-y-1">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
            {project.status}
          </span>
          {isOverdue && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-500 text-white">
              OVERDUE
            </span>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-medium text-gray-700">Progress</span>
          <span className="text-xs text-gray-600">{project.completionPercentage || 0}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(project.completionPercentage || 0)}`}
            style={{ width: `${project.completionPercentage || 0}%` }}
          ></div>
        </div>
      </div>

      {/* Workflow Progress */}
      {project.workflowProgress && (
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-700 mb-2">Workflow Stages</div>
          <div className="flex space-x-1">
            {project.workflowProgress.stageProgress.map((stage, index) => (
              <div
                key={index}
                className={`flex-1 h-2 rounded ${
                  stage.status === 'completed'
                    ? 'bg-green-500'
                    : stage.status === 'in_progress'
                    ? 'bg-blue-500'
                    : stage.status === 'blocked'
                    ? 'bg-red-500'
                    : 'bg-gray-200'
                }`}
                title={`${stage.roleName}: ${stage.status}`}
              />
            ))}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Current: {project.workflowProgress.currentStage}
          </div>
        </div>
      )}

      {/* Grooming Status */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${
            project.groomingStatus === 'approved' ? 'bg-green-500' :
            project.groomingStatus === 'blocked' ? 'bg-red-500' :
            project.groomingStatus === 'review_required' ? 'bg-orange-500' : 'bg-yellow-500'
          }`}></span>
          <span className="text-gray-600">
            Grooming: {project.groomingStatus}
          </span>
        </div>
        <div className="text-gray-500">
          {new Date(project.createdDate).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};

interface ProjectDetailModalProps {
  project: Project & { workflowProgress?: WorkflowProgress };
  onClose: () => void;
}

const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({ project, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{project.name}</h3>
              <p className="text-gray-600">Project ID: {project.id}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-4 space-y-6">
          {/* Project Overview */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Project Overview</h4>
            <p className="text-gray-600 mb-4">{project.description}</p>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Status:</span>
                <div className="mt-1">{project.status}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Priority:</span>
                <div className="mt-1">{project.priority}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Progress:</span>
                <div className="mt-1">{project.completionPercentage || 0}%</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Grooming:</span>
                <div className="mt-1">{project.groomingStatus}</div>
              </div>
            </div>
          </div>

          {/* Workflow Progress Detail */}
          {project.workflowProgress && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Agent Workflow Progress</h4>
              <div className="space-y-3">
                {project.workflowProgress.stageProgress.map((stage, index) => (
                  <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                      stage.status === 'completed'
                        ? 'bg-green-500'
                        : stage.status === 'in_progress'
                        ? 'bg-blue-500'
                        : stage.status === 'blocked'
                        ? 'bg-red-500'
                        : 'bg-gray-400'
                    }`}>
                      {index + 1}
                    </div>
                    
                    <div className="flex-1 ml-4">
                      <div className="font-medium text-gray-900">{stage.roleName}</div>
                      <div className="text-sm text-gray-600">Role: {stage.role}</div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        stage.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : stage.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : stage.status === 'blocked'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {stage.status.replace('_', ' ')}
                      </div>
                      {stage.completedAt && (
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(stage.completedAt).toLocaleString()}
                        </div>
                      )}
                      {stage.duration && (
                        <div className="text-xs text-gray-500 mt-1">
                          Duration: {Math.round(stage.duration)}h
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Close
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              View Detailed Logs
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
              Force Restart Workflow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Mock workflow progress data (in real system this would come from WorkerService agent status)
const mockWorkflowProgress: WorkflowProgress[] = [
  {
    projectId: 1,
    projectName: "Package Management Healthcare Standards",
    totalStages: 6,
    completedStages: 3,
    currentStage: "Implementation",
    stageProgress: [
      { role: "groomer", roleName: "Requirements Analysis", status: "completed", completedAt: "2025-08-12T10:00:00Z", duration: 2 },
      { role: "planner", roleName: "Technical Planning", status: "completed", completedAt: "2025-08-13T14:00:00Z", duration: 6 },
      { role: "architect", roleName: "System Design", status: "completed", completedAt: "2025-08-14T16:00:00Z", duration: 8 },
      { role: "worker", roleName: "Implementation", status: "in_progress", duration: 18 },
      { role: "validator", roleName: "Quality Assurance", status: "not_started" },
      { role: "maturity_inspector", roleName: "Security Review", status: "not_started" }
    ]
  },
  {
    projectId: 2,
    projectName: "Testing Infrastructure Modernization",
    totalStages: 6,
    completedStages: 1,
    currentStage: "Blocked - Testcontainers Setup",
    stageProgress: [
      { role: "groomer", roleName: "Testing Analysis", status: "completed", completedAt: "2025-08-19T09:00:00Z", duration: 4 },
      { role: "planner", roleName: "Framework Strategy", status: "blocked" },
      { role: "architect", roleName: "Architecture Review", status: "not_started" },
      { role: "worker", roleName: "Implementation", status: "not_started" },
      { role: "validator", roleName: "Integration Testing", status: "not_started" },
      { role: "maturity_inspector", roleName: "Deployment Review", status: "not_started" }
    ]
  }
];

const mockAgentData: AgentInstance[] = [
  { instanceId: "groomer-001", role: "groomer", processId: 1234, startedAt: "2024-01-20T08:00:00Z", status: "running", currentLoad: 1, maxCapacity: 2 },
  { instanceId: "worker-001", role: "worker", processId: 1235, startedAt: "2024-01-20T08:05:00Z", status: "running", currentLoad: 2, maxCapacity: 3 },
  { instanceId: "worker-002", role: "worker", processId: 1236, startedAt: "2024-01-20T08:05:00Z", status: "running", currentLoad: 1, maxCapacity: 3 },
  { instanceId: "validator-001", role: "validator", processId: 1237, startedAt: "2024-01-20T08:10:00Z", status: "running", currentLoad: 0, maxCapacity: 2 }
];