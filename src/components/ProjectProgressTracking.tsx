import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Project } from '../types';
import { projectService } from '../services/projectService';
import { agentService } from '../services/agentService';
import { TaskSubmissionModal } from './TaskSubmissionModal';

interface ProjectProgressTrackingProps {
  className?: string;
}

export const ProjectProgressTracking: React.FC<ProjectProgressTrackingProps> = ({ className = '' }) => {
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline' | 'kanban'>('grid');
  const [showTaskSubmissionModal, setShowTaskSubmissionModal] = useState(false);

  // Real project data from the API with real workflow progress
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['project-progress'],
    queryFn: async () => {
      const [realProjects, workflowData] = await Promise.all([
        projectService.getProjects(),
        agentService.getWorkflowProgress()
      ]);
      
      // Combine projects with their real workflow progress
      return realProjects.map(project => {
        const workflow = workflowData.data.find(w => w.projectId === project.id);
        return {
          ...project,
          workflowProgress: workflow?.workflowStages || []
        };
      });
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Real agent data from the API
  const { data: activeAgentsData, isLoading: agentsLoading } = useQuery({
    queryKey: ['active-agents'],
    queryFn: async () => {
      return await agentService.getActiveAgents();
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const activeAgents = activeAgentsData?.data || [];

  // Agent details query for selected agent
  const { data: agentDetails } = useQuery({
    queryKey: ['agent-details', selectedAgent],
    queryFn: async () => selectedAgent ? await agentService.getAgentDetails(selectedAgent) : null,
    enabled: !!selectedAgent,
    refetchInterval: 5000, // Refresh every 5 seconds when viewing details
  });

  if (projectsLoading || agentsLoading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center mt-2 text-gray-600">
          Loading {projectsLoading ? 'project data' : 'agent data'}...
        </p>
        {activeAgentsData && (
          <p className="text-center mt-1 text-sm text-gray-500">
            Connected to {activeAgentsData.summary?.activeAgents || 0} active AI agents
          </p>
        )}
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
            {activeAgentsData?.timestamp && (
              <p className="text-xs text-gray-500 mt-1">
                Last updated: {new Date(activeAgentsData.timestamp).toLocaleString()}
              </p>
            )}
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
            <button
              onClick={() => setShowTaskSubmissionModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Submit Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Agents Summary */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-medium text-gray-900">Active Agent Pool</h3>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-500">Live</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {activeAgents?.slice(0, 4).map((agent) => (
              <div 
                key={agent.agentId} 
                className="flex items-center space-x-2 cursor-pointer hover:bg-white hover:shadow-sm rounded px-2 py-1 transition-all"
                onClick={() => setSelectedAgent(agent.agentId)}
                title={`Click to view details for ${agent.agentName}`}
              >
                <div className={`w-3 h-3 rounded-full ${
                  agent.status === 'active' ? 'bg-green-500' :
                  agent.status === 'busy' ? 'bg-blue-500' :
                  agent.status === 'idle' ? 'bg-yellow-500' :
                  'bg-gray-300'
                }`}></div>
                <span className="text-sm font-medium">{agent.roleName.replace('AI-Agent-', '')}</span>
                <span className="text-xs text-gray-500">({agent.taskStats.activeTasks}/{agent.taskStats.assignedTasks})</span>
                <div className={`w-2 h-2 rounded-full ${
                  agent.healthStatus === 'healthy' ? 'bg-green-400' :
                  agent.healthStatus === 'warning' ? 'bg-yellow-400' :
                  'bg-red-400'
                }`} title={`Health: ${agent.healthStatus}`}></div>
              </div>
            ))}
            {activeAgentsData?.summary && (
              <div className="text-xs text-gray-500 ml-4">
                {activeAgentsData.summary.activeAgents} active • {activeAgentsData.summary.busyAgents} busy • {activeAgentsData.summary.idleAgents} idle
              </div>
            )}
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

      {/* Agent Details Modal */}
      {selectedAgent && agentDetails && (
        <AgentDetailModal
          agent={agentDetails}
          onClose={() => setSelectedAgent(null)}
        />
      )}

      {/* Task Submission Modal */}
      <TaskSubmissionModal
        isOpen={showTaskSubmissionModal}
        onClose={() => setShowTaskSubmissionModal(false)}
        projectId={selectedProject || undefined}
      />
    </div>
  );
};

interface ProjectCardProps {
  project: Project & { workflowProgress?: any[] };
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
  const isOverdue = project.workflowProgress?.some((stage: any) => 
    stage.stageStatus === 'blocked'
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
      {project.workflowProgress && project.workflowProgress.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-700 mb-2">Workflow Stages</div>
          <div className="flex space-x-1">
            {project.workflowProgress.map((stage: any, index: number) => (
              <div
                key={index}
                className={`flex-1 h-2 rounded ${
                  stage.stageStatus === 'completed'
                    ? 'bg-green-500'
                    : stage.stageStatus === 'in_progress'
                    ? 'bg-blue-500'
                    : stage.stageStatus === 'blocked'
                    ? 'bg-red-500'
                    : 'bg-gray-200'
                }`}
                title={`${stage.workflowStage}: ${stage.stageStatus}`}
              />
            ))}
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
  project: Project & { workflowProgress?: any[] };
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
          {project.workflowProgress && project.workflowProgress.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Agent Workflow Progress</h4>
              <div className="space-y-3">
                {project.workflowProgress.map((stage: any, index: number) => (
                  <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                      stage.stageStatus === 'completed'
                        ? 'bg-green-500'
                        : stage.stageStatus === 'in_progress'
                        ? 'bg-blue-500'
                        : stage.stageStatus === 'blocked'
                        ? 'bg-red-500'
                        : 'bg-gray-400'
                    }`}>
                      {index + 1}
                    </div>
                    
                    <div className="flex-1 ml-4">
                      <div className="font-medium text-gray-900">{stage.workflowStage}</div>
                      <div className="text-sm text-gray-600">Agent: {stage.agentName || stage.assignedAgent || 'Not assigned'}</div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        stage.stageStatus === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : stage.stageStatus === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : stage.stageStatus === 'blocked'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {stage.stageStatus.replace('_', ' ')}
                      </div>
                      {stage.completedDate && (
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(stage.completedDate).toLocaleString()}
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

interface AgentDetailModalProps {
  agent: any; // AgentDetails from agentService
  onClose: () => void;
}

const AgentDetailModal: React.FC<AgentDetailModalProps> = ({ agent, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{agent.agentName}</h2>
            <p className="text-sm text-gray-600">{agent.roleName} • ID: {agent.agentId}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Agent Status Overview */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${
                  agent.status === 'active' ? 'bg-green-500' :
                  agent.status === 'busy' ? 'bg-blue-500' :
                  agent.status === 'idle' ? 'bg-yellow-500' :
                  'bg-gray-300'
                }`}></div>
                <span className="text-sm font-medium text-gray-700">Status</span>
              </div>
              <p className="text-lg font-bold capitalize">{agent.status}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${
                  agent.healthStatus === 'healthy' ? 'bg-green-400' :
                  agent.healthStatus === 'warning' ? 'bg-yellow-400' :
                  'bg-red-400'
                }`}></div>
                <span className="text-sm font-medium text-gray-700">Health</span>
              </div>
              <p className="text-lg font-bold capitalize">{agent.healthStatus}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <span className="text-sm font-medium text-gray-700 block mb-2">Active Tasks</span>
              <p className="text-lg font-bold">{agent.taskStats.activeTasks}/{agent.taskStats.assignedTasks}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <span className="text-sm font-medium text-gray-700 block mb-2">Success Rate</span>
              <p className="text-lg font-bold">{Math.round(agent.performanceMetrics.successRate * 100)}%</p>
            </div>
          </div>
        </div>

        {/* Current Task */}
        {agent.currentTask && (
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Current Task</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">{agent.currentTask}</p>
              <p className="text-xs text-gray-500 mt-2">
                Last activity: {new Date(agent.lastActivity).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{agent.performanceMetrics.tasksCompleted}</div>
              <div className="text-sm text-gray-600">Tasks Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{Math.round(agent.performanceMetrics.averageTime)}m</div>
              <div className="text-sm text-gray-600">Avg. Task Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{Math.round(agent.performanceMetrics.successRate * 100)}%</div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
          </div>
        </div>

        {/* Capabilities */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Capabilities</h3>
          <div className="flex flex-wrap gap-2">
            {agent.capabilities?.map((capability: string, index: number) => (
              <span key={index} className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full">
                {capability}
              </span>
            ))}
          </div>
        </div>

        {/* Task History */}
        {agent.taskHistory && agent.taskHistory.length > 0 && (
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Task History</h3>
            <div className="space-y-3 max-h-40 overflow-y-auto">
              {agent.taskHistory.slice(0, 5).map((task: any, index: number) => (
                <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{task.taskName}</p>
                    <p className="text-xs text-gray-600">{task.taskType}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      task.status === 'completed' ? 'bg-green-100 text-green-800' :
                      task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{task.completionPercentage}% complete</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex justify-end space-x-3 px-6 py-4 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Close
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            View Full Logs
          </button>
          {agent.status === 'error' && (
            <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
              Restart Agent
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

