import React, { useState } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { taskService, TaskSubmissionRequest } from '../services/taskService';
import { agentService } from '../services/agentService';
import { projectService } from '../services/projectService';

interface TaskSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: number;
  assignToAgent?: string;
}

export const TaskSubmissionModal: React.FC<TaskSubmissionModalProps> = ({
  isOpen,
  onClose,
  projectId,
  assignToAgent
}) => {
  const [formData, setFormData] = useState<TaskSubmissionRequest>({
    taskName: '',
    taskDescription: '',
    taskType: 'development',
    priority: 'normal',
    estimatedHours: 4,
    projectId: projectId,
    assignToAgent: assignToAgent,
    requiresApproval: true,
    approvalTimeoutHours: 24
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Get available agents and projects for dropdowns
  const { data: agentsData } = useQuery({
    queryKey: ['active-agents'],
    queryFn: () => agentService.getActiveAgents(),
    enabled: isOpen
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectService.getProjects(),
    enabled: isOpen
  });

  const agents = agentsData?.data || [];
  const availableAgents = agents.filter(agent => agent.status !== 'offline');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await taskService.submitTask(formData);
      
      setSubmitSuccess(true);
      
      // Refresh relevant queries
      queryClient.invalidateQueries({ queryKey: ['active-agents'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project-progress'] });
      if (formData.requiresApproval) {
        queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      }

      // Reset form after successful submission
      setTimeout(() => {
        setSubmitSuccess(false);
        onClose();
        setFormData({
          taskName: '',
          taskDescription: '',
          taskType: 'development',
          priority: 'normal',
          estimatedHours: 4,
          projectId: projectId,
          assignToAgent: assignToAgent,
          requiresApproval: true,
          approvalTimeoutHours: 24
        });
      }, 2000);

    } catch (error: any) {
      setSubmitError(error.response?.data?.error || 'Failed to submit task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof TaskSubmissionRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  if (submitSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          <div className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Task Submitted Successfully!</h3>
            <p className="text-sm text-gray-600">
              {formData.requiresApproval 
                ? 'Your task has been submitted and is pending approval.' 
                : 'Your task has been assigned to an AI agent and will begin shortly.'
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Submit New AI Task</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
            </div>
          )}

          {/* Task Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task Name *</label>
            <input
              type="text"
              required
              value={formData.taskName}
              onChange={(e) => handleInputChange('taskName', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter a clear, descriptive task name"
            />
          </div>

          {/* Task Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea
              required
              rows={3}
              value={formData.taskDescription}
              onChange={(e) => handleInputChange('taskDescription', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Provide detailed instructions for the AI agent..."
            />
          </div>

          {/* Task Type and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Task Type</label>
              <select
                value={formData.taskType}
                onChange={(e) => handleInputChange('taskType', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="development">Development</option>
                <option value="analysis">Analysis</option>
                <option value="testing">Testing</option>
                <option value="security">Security</option>
                <option value="compliance">Compliance</option>
                <option value="investigation">Investigation</option>
                <option value="implementation">Implementation</option>
                <option value="validation">Validation</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value as any)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Estimated Hours */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
            <input
              type="number"
              min="0.5"
              max="168"
              step="0.5"
              value={formData.estimatedHours || ''}
              onChange={(e) => handleInputChange('estimatedHours', parseFloat(e.target.value) || undefined)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Estimated completion time"
            />
          </div>

          {/* Project and Agent Assignment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
              <select
                value={formData.projectId || ''}
                onChange={(e) => handleInputChange('projectId', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Auto-assign project</option>
                {projects?.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Agent</label>
              <select
                value={formData.assignToAgent || ''}
                onChange={(e) => handleInputChange('assignToAgent', e.target.value || undefined)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Auto-assign agent</option>
                {availableAgents.map(agent => (
                  <option key={agent.agentId} value={agent.agentId}>
                    {agent.roleName.replace('AI-Agent-', '')} ({agent.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Approval Options */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center space-x-3 mb-3">
              <input
                type="checkbox"
                id="requiresApproval"
                checked={formData.requiresApproval}
                onChange={(e) => handleInputChange('requiresApproval', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="requiresApproval" className="text-sm font-medium text-gray-700">
                Requires human approval before execution
              </label>
            </div>

            {formData.requiresApproval && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Approval Timeout (hours)</label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={formData.approvalTimeoutHours || ''}
                  onChange={(e) => handleInputChange('approvalTimeoutHours', parseInt(e.target.value) || undefined)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="24"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Task will expire if not approved within this timeframe
                </p>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </div>
              ) : (
                `Submit Task${formData.requiresApproval ? ' (Pending Approval)' : ''}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};