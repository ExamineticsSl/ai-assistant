import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Grid, GridColumn } from '@progress/kendo-react-grid';
import { Button } from '@progress/kendo-react-buttons';
import { Dialog, DialogActionsBar } from '@progress/kendo-react-dialogs';
import { Input, TextArea } from '@progress/kendo-react-inputs';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { Badge } from '@progress/kendo-react-indicators';
import { Notification, NotificationGroup } from '@progress/kendo-react-notification';
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
  const [notifications, setNotifications] = useState<any[]>([]);
  
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
    const notification = {
      id: Date.now(),
      message,
      type,
      closable: true,
    };
    setNotifications(prev => [...prev, notification]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
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

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
      draft: 'info',
      review: 'warning',
      approved: 'success',
      testing: 'primary',
      deployed: 'success',
      deprecated: 'error',
      rejected: 'error'
    };

    return (
      <Badge 
        themeColor={statusColors[status] || 'info'}
        size="small"
      >
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getComplianceBadges = (prototype: Prototype) => {
    const badges = [];
    
    if (prototype.healthcareCompliance) {
      badges.push(
        <Badge key="healthcare" themeColor="success" size="small" style={{ marginRight: '4px' }}>
          HEALTHCARE
        </Badge>
      );
    }
    
    if (prototype.hipaaReviewed) {
      badges.push(
        <Badge key="hipaa" themeColor="primary" size="small" style={{ marginRight: '4px' }}>
          HIPAA
        </Badge>
      );
    }
    
    if (prototype.accessibilityTested) {
      badges.push(
        <Badge key="a11y" themeColor="info" size="small" style={{ marginRight: '4px' }}>
          A11Y
        </Badge>
      );
    }

    return <div style={{ display: 'flex', flexWrap: 'wrap' }}>{badges}</div>;
  };

  const prototypeTypeOptions = [
    { text: 'UI Component', value: 'ui-component' },
    { text: 'Full Application', value: 'full-app' },
    { text: 'Workflow', value: 'workflow' },
    { text: 'Form', value: 'form' },
    { text: 'Dashboard', value: 'dashboard' },
    { text: 'Report', value: 'report' },
    { text: 'Mobile', value: 'mobile' }
  ];

  const frameworkOptions = [
    { text: 'React', value: 'react' },
    { text: 'Vue', value: 'vue' },
    { text: 'Angular', value: 'angular' },
    { text: 'Vanilla JS', value: 'vanilla-js' },
    { text: 'Static HTML', value: 'html-static' }
  ];

  if (error) {
    return (
      <div className="error-container" style={{ padding: '20px', textAlign: 'center' }}>
        <h3>Error Loading Prototypes</h3>
        <p style={{ color: '#d32f2f' }}>
          {error instanceof Error ? error.message : 'Failed to load prototypes'}
        </p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['prototypes', projectId] })}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="prototype-manager">
      <div className="prototype-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        padding: '10px 0',
        borderBottom: '2px solid #e3f2fd'
      }}>
        <div>
          <h3 style={{ margin: 0, color: '#1976d2' }}>Prototype Management</h3>
          <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
            Healthcare AI Prototypes with Compliance Tracking
          </p>
        </div>
        <Button 
          themeColor="primary"
          onClick={() => setShowCreateDialog(true)}
          disabled={projectId <= 0}
        >
          Create Prototype
        </Button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading prototypes...</p>
        </div>
      ) : prototypes.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h4 style={{ color: '#6c757d', marginBottom: '10px' }}>No Prototypes Found</h4>
          <p style={{ color: '#6c757d', marginBottom: '20px' }}>
            Create your first prototype to get started with interactive healthcare UI development.
          </p>
          <Button 
            themeColor="primary"
            onClick={() => setShowCreateDialog(true)}
            disabled={projectId <= 0}
          >
            Create First Prototype
          </Button>
        </div>
      ) : (
        <Grid 
          data={prototypes}
          style={{ height: '500px' }}
          scrollable="virtual"
          sortable
          filterable
          onRowClick={({ dataItem }) => onPrototypeSelect?.(dataItem)}
        >
          <GridColumn 
            field="name" 
            title="Prototype Name" 
            width="200px"
            cell={({ dataItem }) => (
              <td style={{ fontWeight: 'bold', color: '#1976d2' }}>
                {dataItem.name}
                <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                  {dataItem.framework} • v{dataItem.currentVersion}
                </div>
              </td>
            )}
          />
          
          <GridColumn 
            field="prototypeType" 
            title="Type" 
            width="120px"
            cell={({ dataItem }) => (
              <td>
                <Badge themeColor="info" size="small">
                  {dataItem.prototypeType.replace('-', ' ').toUpperCase()}
                </Badge>
              </td>
            )}
          />
          
          <GridColumn 
            field="status" 
            title="Status" 
            width="100px"
            cell={({ dataItem }) => (
              <td>{getStatusBadge(dataItem.status)}</td>
            )}
          />

          <GridColumn 
            field="compliance" 
            title="Compliance" 
            width="180px"
            cell={({ dataItem }) => (
              <td>{getComplianceBadges(dataItem)}</td>
            )}
          />

          <GridColumn 
            field="versionCount" 
            title="Versions" 
            width="80px"
            cell={({ dataItem }) => (
              <td style={{ textAlign: 'center' }}>
                <Badge themeColor="primary" size="small">
                  {dataItem.versionCount || 0}
                </Badge>
              </td>
            )}
          />

          <GridColumn 
            field="openFeedbackCount" 
            title="Feedback" 
            width="80px"
            cell={({ dataItem }) => (
              <td style={{ textAlign: 'center' }}>
                <Badge 
                  themeColor={dataItem.openFeedbackCount > 0 ? 'warning' : 'success'} 
                  size="small"
                >
                  {dataItem.openFeedbackCount || 0}
                </Badge>
              </td>
            )}
          />

          <GridColumn 
            field="createdDate" 
            title="Created" 
            width="140px"
            cell={({ dataItem }) => (
              <td>
                <div>{new Date(dataItem.createdDate).toLocaleDateString()}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  by {dataItem.createdBy}
                </div>
              </td>
            )}
          />
        </Grid>
      )}

      {/* Create Prototype Dialog */}
      {showCreateDialog && (
        <Dialog title="Create New Prototype" onClose={() => setShowCreateDialog(false)}>
          <div style={{ padding: '20px', minWidth: '500px' }}>
            <div style={{ marginBottom: '15px' }}>
              <label>Prototype Name *</label>
              <Input
                value={newPrototype.name}
                onChange={(e) => setNewPrototype({ ...newPrototype, name: e.target.value })}
                placeholder="Enter prototype name"
                style={{ width: '100%', marginTop: '5px' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label>Description</label>
              <TextArea
                value={newPrototype.description}
                onChange={(e) => setNewPrototype({ ...newPrototype, description: e.target.value })}
                placeholder="Describe the prototype's purpose and functionality"
                rows={3}
                style={{ width: '100%', marginTop: '5px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
              <div style={{ flex: 1 }}>
                <label>Type</label>
                <DropDownList
                  data={prototypeTypeOptions}
                  textField="text"
                  dataItemKey="value"
                  value={prototypeTypeOptions.find(opt => opt.value === newPrototype.prototypeType)}
                  onChange={(e) => setNewPrototype({ ...newPrototype, prototypeType: e.target.value.value })}
                  style={{ width: '100%', marginTop: '5px' }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label>Framework</label>
                <DropDownList
                  data={frameworkOptions}
                  textField="text"
                  dataItemKey="value"
                  value={frameworkOptions.find(opt => opt.value === newPrototype.framework)}
                  onChange={(e) => setNewPrototype({ ...newPrototype, framework: e.target.value.value })}
                  style={{ width: '100%', marginTop: '5px' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label>
                <input
                  type="checkbox"
                  checked={newPrototype.healthcareCompliance}
                  onChange={(e) => setNewPrototype({ ...newPrototype, healthcareCompliance: e.target.checked })}
                  style={{ marginRight: '8px' }}
                />
                Healthcare Compliance Required
              </label>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Enables HIPAA tracking and clinical workflow validation
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label>
                <input
                  type="checkbox"
                  checked={newPrototype.requiresApproval}
                  onChange={(e) => setNewPrototype({ ...newPrototype, requiresApproval: e.target.checked })}
                  style={{ marginRight: '8px' }}
                />
                Requires Approval Workflow
              </label>
            </div>
          </div>

          <DialogActionsBar>
            <Button onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button 
              themeColor="primary" 
              onClick={handleCreatePrototype}
              disabled={createPrototypeMutation.isPending}
            >
              {createPrototypeMutation.isPending ? 'Creating...' : 'Create Prototype'}
            </Button>
          </DialogActionsBar>
        </Dialog>
      )}

      {/* Notifications */}
      <NotificationGroup
        style={{
          position: 'fixed',
          right: '20px',
          top: '80px',
          zIndex: 9999,
        }}
      >
        {notifications.map(notification => (
          <Notification
            key={notification.id}
            type={notification.type}
            closable={notification.closable}
            onClose={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
          >
            <span>{notification.message}</span>
          </Notification>
        ))}
      </NotificationGroup>
    </div>
  );
};

export default PrototypeManager;