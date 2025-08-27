import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, AlertTriangle, CheckCircle, Clock, Shield, X } from 'lucide-react';
import { prototypeService } from '../services/prototypeService';

interface Prototype {
  id: number;
  projectId: number;
  name: string;
  description: string;
  prototypeType: string;
  currentVersion: string;
  status: string;
  framework: string;
  healthcareCompliance: boolean;
  hipaaReviewed: boolean;
  accessibilityTested: boolean;
  createdDate: string;
  createdBy: string;
  projectName: string;
  versionCount?: number;
  openFeedbackCount?: number;
}

interface PrototypeManagerProps {
  projectId: number;
  onPrototypeSelect?: (prototype: Prototype) => void;
}

interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

const PrototypeManager: React.FC<PrototypeManagerProps> = ({ 
  projectId, 
  onPrototypeSelect 
}) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPrototype, setNewPrototype] = useState({
    name: '',
    description: '',
    prototypeType: 'ui-component',
    framework: 'react',
    healthcareCompliance: false,
    requiresApproval: true
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const queryClient = useQueryClient();

  // Fetch prototypes for project
  const { data: prototypes = [], isLoading, error } = useQuery({
    queryKey: ['prototypes', projectId],
    queryFn: () => prototypeService.getPrototypesByProject(projectId),
    enabled: projectId > 0,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Create prototype mutation
  const createPrototypeMutation = useMutation({
    mutationFn: prototypeService.createPrototype,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prototypes', projectId] });
      setShowCreateDialog(false);
      setNewPrototype({
        name: '',
        description: '',
        prototypeType: 'ui-component',
        framework: 'react',
        healthcareCompliance: false,
        requiresApproval: true
      });
      addNotification('Prototype created successfully', 'success');
    },
    onError: (error: any) => {
      console.error('Create prototype error:', error);
      addNotification('Failed to create prototype: ' + error.message, 'error');
    }
  });

  const addNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const notification: Notification = {
      id: Date.now(),
      message,
      type,
    };
    setNotifications(prev => [...prev, notification]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleCreatePrototype = () => {
    if (!newPrototype.name.trim()) {
      addNotification('Prototype name is required', 'error');
      return;
    }

    createPrototypeMutation.mutate({
      projectId,
      ...newPrototype
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      review: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      testing: 'bg-blue-100 text-blue-800',
      deployed: 'bg-green-100 text-green-800',
      deprecated: 'bg-red-100 text-red-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getComplianceBadges = (prototype: Prototype) => {
    const badges = [];
    
    if (prototype.healthcareCompliance) {
      badges.push(
        <span key="healthcare" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-1">
          <Shield className="w-3 h-3 mr-1" />
          HEALTHCARE
        </span>
      );
    }
    
    if (prototype.hipaaReviewed) {
      badges.push(
        <span key="hipaa" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-1">
          <CheckCircle className="w-3 h-3 mr-1" />
          HIPAA
        </span>
      );
    }
    
    if (prototype.accessibilityTested) {
      badges.push(
        <span key="a11y" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mr-1">
          <Eye className="w-3 h-3 mr-1" />
          A11Y
        </span>
      );
    }
    
    return badges;
  };

  if (isLoading) {
    return (
      <div data-testid="prototype-manager" className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="prototype-manager" className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
          <p className="text-red-800">Failed to fetch prototypes</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="prototype-manager" className="space-y-6">
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`
                flex items-center justify-between p-4 rounded-lg shadow-lg max-w-sm
                ${notification.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : ''}
                ${notification.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' : ''}
                ${notification.type === 'info' ? 'bg-blue-100 text-blue-800 border border-blue-200' : ''}
              `}
            >
              <span className="text-sm font-medium">{notification.message}</span>
              <button
                onClick={() => removeNotification(notification.id)}
                className="ml-2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Prototypes</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage healthcare AI prototypes and interactive mockups
          </p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Prototype
        </button>
      </div>

      {/* Prototypes Grid */}
      {prototypes.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No prototypes</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new prototype for your project.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {prototypes.map((prototype) => (
            <div
              key={prototype.id}
              className="prototype-card relative rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onPrototypeSelect?.(prototype)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {prototype.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {prototype.prototypeType} • {prototype.framework}
                  </p>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(prototype.status)}`}>
                  {prototype.status.toUpperCase()}
                </span>
              </div>
              
              {prototype.description && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                  {prototype.description}
                </p>
              )}
              
              <div className="mt-4">
                <div className="flex flex-wrap gap-1">
                  {getComplianceBadges(prototype)}
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                <span>v{prototype.currentVersion}</span>
                <div className="flex items-center space-x-2">
                  {prototype.versionCount && (
                    <span>{prototype.versionCount} versions</span>
                  )}
                  {prototype.openFeedbackCount && prototype.openFeedbackCount > 0 && (
                    <span className="text-orange-600 font-medium">
                      {prototype.openFeedbackCount} feedback
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Prototype Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            <div
              data-testid="create-prototype-dialog"
              className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6"
            >
              <div>
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Create New Prototype
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={newPrototype.name}
                      onChange={(e) => setNewPrototype(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter prototype name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={newPrototype.description}
                      onChange={(e) => setNewPrototype(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Describe the prototype purpose and functionality"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        value={newPrototype.prototypeType}
                        onChange={(e) => setNewPrototype(prev => ({ ...prev, prototypeType: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {prototypeService.getPrototypeTypes().map(type => (
                          <option key={type.value} value={type.value}>{type.text}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Framework
                      </label>
                      <select
                        value={newPrototype.framework}
                        onChange={(e) => setNewPrototype(prev => ({ ...prev, framework: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {prototypeService.getFrameworks().map(framework => (
                          <option key={framework.value} value={framework.value}>{framework.text}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newPrototype.healthcareCompliance}
                        onChange={(e) => setNewPrototype(prev => ({ ...prev, healthcareCompliance: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Healthcare compliance required</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newPrototype.requiresApproval}
                        onChange={(e) => setNewPrototype(prev => ({ ...prev, requiresApproval: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Requires approval before deployment</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex space-x-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateDialog(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreatePrototype}
                  disabled={createPrototypeMutation.isPending}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createPrototypeMutation.isPending ? 'Creating...' : 'Create Prototype'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrototypeManager;