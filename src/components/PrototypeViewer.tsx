import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@progress/kendo-react-buttons';
import { Dialog, DialogActionsBar } from '@progress/kendo-react-dialogs';
import { Input, TextArea } from '@progress/kendo-react-inputs';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { Badge } from '@progress/kendo-react-indicators';
import { Notification, NotificationGroup } from '@progress/kendo-react-notification';
import { TabStrip, TabStripTab } from '@progress/kendo-react-layout';
import { prototypeService } from '../services/prototypeService';

interface PrototypeViewerProps {
  prototypeId: number;
  version?: string;
  onClose?: () => void;
}

interface FeedbackPin {
  id: string;
  x: number;
  y: number;
  comment: string;
  type: string;
  temporary?: boolean;
}

const PrototypeViewer: React.FC<PrototypeViewerProps> = ({ 
  prototypeId, 
  version = 'latest', 
  onClose 
}) => {
  const [feedbackMode, setFeedbackMode] = useState(false);
  const [feedbackPins, setFeedbackPins] = useState<FeedbackPin[]>([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [pendingFeedback, setPendingFeedback] = useState<{x: number, y: number} | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const [newFeedback, setNewFeedback] = useState({
    feedbackType: 'comment',
    title: '',
    comment: '',
    priority: 'Medium',
    category: '',
    healthcareImpact: 'none',
    complianceConcern: false,
    accessibilityIssue: false,
    securityConcern: false
  });

  const queryClient = useQueryClient();

  // Fetch prototype details
  const { data: prototype, isLoading: prototypeLoading } = useQuery({
    queryKey: ['prototype', prototypeId],
    queryFn: () => prototypeService.getPrototype(prototypeId),
    enabled: prototypeId > 0,
  });

  // Fetch feedback for current version
  const { data: feedback = [] } = useQuery({
    queryKey: ['prototype-feedback', prototypeId, version],
    queryFn: () => prototypeService.getFeedback(prototypeId, version),
    enabled: prototypeId > 0 && !!version,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Submit feedback mutation
  const submitFeedbackMutation = useMutation({
    mutationFn: ({ prototypeId, version, feedback }: any) => 
      prototypeService.submitFeedback(prototypeId, version, feedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prototype-feedback', prototypeId, version] });
      setShowFeedbackDialog(false);
      setPendingFeedback(null);
      setNewFeedback({
        feedbackType: 'comment',
        title: '',
        comment: '',
        priority: 'Medium',
        category: '',
        healthcareImpact: 'none',
        complianceConcern: false,
        accessibilityIssue: false,
        securityConcern: false
      });
      addNotification('Feedback submitted successfully', 'success');
    },
    onError: (error: any) => {
      console.error('Submit feedback error:', error);
      addNotification('Failed to submit feedback: ' + error.message, 'error');
    }
  });

  useEffect(() => {
    if (feedback) {
      const pins: FeedbackPin[] = feedback
        .filter((f: any) => f.positionX && f.positionY)
        .map((f: any) => ({
          id: f.id.toString(),
          x: f.positionX,
          y: f.positionY,
          comment: f.comment,
          type: f.feedbackType
        }));
      setFeedbackPins(pins);
    }
  }, [feedback]);

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

  const handleIframeClick = (event: React.MouseEvent) => {
    if (!feedbackMode) return;

    // Get click coordinates relative to iframe
    const rect = iframeRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setPendingFeedback({ x, y });
    setShowFeedbackDialog(true);
  };

  const handleSubmitFeedback = () => {
    if (!newFeedback.comment.trim() || !pendingFeedback) {
      addNotification('Comment is required', 'error');
      return;
    }

    const feedbackData = {
      ...newFeedback,
      positionX: pendingFeedback.x,
      positionY: pendingFeedback.y,
      pageUrl: window.location.href
    };

    submitFeedbackMutation.mutate({
      prototypeId,
      version,
      feedback: feedbackData
    });
  };

  const getPrototypeUrl = () => {
    if (!prototype?.prototype) return '';
    
    const proto = prototype.prototype;
    const buildPath = proto.buildPath || `/prototypes/${prototypeId}/v${version}`;
    const entryPoint = proto.entryPoint || 'index.html';
    
    return `${buildPath}/${entryPoint}`;
  };

  const feedbackTypeOptions = [
    { text: 'Comment', value: 'comment' },
    { text: 'Bug Report', value: 'bug' },
    { text: 'Enhancement', value: 'enhancement' },
    { text: 'Question', value: 'question' },
    { text: 'Accessibility Issue', value: 'accessibility' },
    { text: 'Security Concern', value: 'security' },
    { text: 'Compliance Issue', value: 'compliance' }
  ];

  const priorityOptions = [
    { text: 'Low', value: 'Low' },
    { text: 'Medium', value: 'Medium' },
    { text: 'High', value: 'High' },
    { text: 'Critical', value: 'Critical' }
  ];

  const healthcareImpactOptions = [
    { text: 'None', value: 'none' },
    { text: 'Low', value: 'low' },
    { text: 'Medium', value: 'medium' },
    { text: 'High', value: 'high' },
    { text: 'Critical', value: 'critical' }
  ];

  if (prototypeLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p>Loading prototype...</p>
      </div>
    );
  }

  if (!prototype?.prototype) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h3>Prototype Not Found</h3>
        <p>The requested prototype could not be loaded.</p>
        {onClose && <Button onClick={onClose}>Close</Button>}
      </div>
    );
  }

  const proto = prototype.prototype;

  return (
    <div className="prototype-viewer" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="prototype-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 20px',
        borderBottom: '2px solid #e3f2fd',
        backgroundColor: '#f8f9fa'
      }}>
        <div>
          <h3 style={{ margin: 0, color: '#1976d2' }}>
            {proto.name} v{version}
          </h3>
          <p style={{ margin: '2px 0 0 0', color: '#666', fontSize: '14px' }}>
            {proto.framework} • {proto.prototypeType}
            {proto.healthcareCompliance && (
              <Badge themeColor="success" size="small" style={{ marginLeft: '10px' }}>
                HEALTHCARE
              </Badge>
            )}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Button
            themeColor={feedbackMode ? 'warning' : 'secondary'}
            onClick={() => setFeedbackMode(!feedbackMode)}
            fillMode="flat"
          >
            {feedbackMode ? 'Exit Feedback Mode' : 'Feedback Mode'}
          </Button>
          
          {feedback.length > 0 && (
            <Badge themeColor="info" size="medium">
              {feedback.length} Feedback Items
            </Badge>
          )}
          
          {onClose && (
            <Button onClick={onClose} fillMode="flat">
              ✕ Close
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex' }}>
        {/* Main prototype view */}
        <div style={{ flex: 1, position: 'relative' }}>
          {feedbackMode && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 10,
              backgroundColor: 'rgba(255, 193, 7, 0.1)',
              padding: '8px',
              textAlign: 'center',
              borderBottom: '2px solid #ffc107',
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#e65100'
            }}>
              FEEDBACK MODE ACTIVE - Click anywhere on the prototype to add feedback
            </div>
          )}

          <iframe
            ref={iframeRef}
            src={getPrototypeUrl()}
            title={`Prototype ${proto.name} v${version}`}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              marginTop: feedbackMode ? '40px' : '0'
            }}
            onClick={handleIframeClick}
          />

          {/* Feedback Pins Overlay */}
          {feedbackPins.map(pin => (
            <div
              key={pin.id}
              style={{
                position: 'absolute',
                left: `${pin.x}px`,
                top: `${pin.y + (feedbackMode ? 40 : 0)}px`,
                width: '20px',
                height: '20px',
                backgroundColor: pin.type === 'bug' ? '#f44336' : pin.type === 'enhancement' ? '#4caf50' : '#2196f3',
                borderRadius: '50%',
                border: '2px solid white',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '10px',
                fontWeight: 'bold'
              }}
              title={pin.comment}
            >
              {pin.type === 'bug' ? '🐛' : pin.type === 'enhancement' ? '💡' : '💬'}
            </div>
          ))}
        </div>

        {/* Side panel with feedback list */}
        <div style={{ 
          width: '350px', 
          borderLeft: '2px solid #e3f2fd',
          backgroundColor: '#f8f9fa',
          overflow: 'auto'
        }}>
          <TabStrip selected={selectedTab} onSelect={(e: any) => setSelectedTab(e.selected)}>
            <TabStripTab title={`Feedback (${feedback.length})`}>
              <div style={{ padding: '15px' }}>
                {feedback.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#666', marginTop: '20px' }}>
                    <p>No feedback yet</p>
                    <p style={{ fontSize: '12px' }}>
                      Enable feedback mode and click on the prototype to add comments
                    </p>
                  </div>
                ) : (
                  feedback.map((f: any) => (
                    <div
                      key={f.id}
                      style={{
                        backgroundColor: 'white',
                        border: '1px solid #dee2e6',
                        borderRadius: '6px',
                        padding: '12px',
                        marginBottom: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <Badge
                          themeColor={
                            f.feedbackType === 'bug' ? 'error' :
                            f.feedbackType === 'enhancement' ? 'success' :
                            f.feedbackType === 'security' ? 'warning' : 'info'
                          }
                          size="small"
                        >
                          {f.feedbackType.toUpperCase()}
                        </Badge>
                        
                        <Badge themeColor="secondary" size="small">
                          {f.priority}
                        </Badge>
                      </div>

                      {f.title && (
                        <h5 style={{ margin: '0 0 6px 0', fontSize: '14px' }}>{f.title}</h5>
                      )}
                      
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px', lineHeight: '1.4' }}>
                        {f.comment}
                      </p>

                      {(f.complianceConcern || f.accessibilityIssue || f.securityConcern) && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                          {f.complianceConcern && (
                            <Badge themeColor="warning" size="small">COMPLIANCE</Badge>
                          )}
                          {f.accessibilityIssue && (
                            <Badge themeColor="info" size="small">A11Y</Badge>
                          )}
                          {f.securityConcern && (
                            <Badge themeColor="error" size="small">SECURITY</Badge>
                          )}
                        </div>
                      )}

                      <div style={{ fontSize: '11px', color: '#666' }}>
                        {f.userId} • {new Date(f.createdDate).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabStripTab>

            <TabStripTab title="Versions">
              <div style={{ padding: '15px' }}>
                {prototype.versions?.map((v: any) => (
                  <div
                    key={v.id}
                    style={{
                      backgroundColor: 'white',
                      border: v.isActive ? '2px solid #1976d2' : '1px solid #dee2e6',
                      borderRadius: '6px',
                      padding: '12px',
                      marginBottom: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong>v{v.version}</strong>
                      {v.isActive && (
                        <Badge themeColor="primary" size="small">CURRENT</Badge>
                      )}
                    </div>
                    
                    {v.versionNotes && (
                      <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#666' }}>
                        {v.versionNotes}
                      </p>
                    )}

                    <div style={{ fontSize: '11px', color: '#666' }}>
                      {v.createdBy} • {new Date(v.createdDate).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </TabStripTab>
          </TabStrip>
        </div>
      </div>

      {/* Feedback Submission Dialog */}
      {showFeedbackDialog && (
        <Dialog title="Submit Feedback" onClose={() => setShowFeedbackDialog(false)}>
          <div style={{ padding: '20px', minWidth: '500px' }}>
            <div style={{ marginBottom: '15px' }}>
              <label>Type</label>
              <DropDownList
                data={feedbackTypeOptions}
                textField="text"
                dataItemKey="value"
                value={feedbackTypeOptions.find(opt => opt.value === newFeedback.feedbackType)}
                onChange={(e: any) => setNewFeedback({ ...newFeedback, feedbackType: e.target.value.value })}
                style={{ width: '100%', marginTop: '5px' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label>Title (Optional)</label>
              <Input
                value={newFeedback.title}
                onChange={(e: any) => setNewFeedback({ ...newFeedback, title: e.target.value })}
                placeholder="Brief title for this feedback"
                style={{ width: '100%', marginTop: '5px' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label>Comment *</label>
              <TextArea
                value={newFeedback.comment}
                onChange={(e: any) => setNewFeedback({ ...newFeedback, comment: e.target.value })}
                placeholder="Describe your feedback in detail"
                rows={4}
                style={{ width: '100%', marginTop: '5px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
              <div style={{ flex: 1 }}>
                <label>Priority</label>
                <DropDownList
                  data={priorityOptions}
                  textField="text"
                  dataItemKey="value"
                  value={priorityOptions.find(opt => opt.value === newFeedback.priority)}
                  onChange={(e: any) => setNewFeedback({ ...newFeedback, priority: e.target.value.value })}
                  style={{ width: '100%', marginTop: '5px' }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label>Healthcare Impact</label>
                <DropDownList
                  data={healthcareImpactOptions}
                  textField="text"
                  dataItemKey="value"
                  value={healthcareImpactOptions.find(opt => opt.value === newFeedback.healthcareImpact)}
                  onChange={(e: any) => setNewFeedback({ ...newFeedback, healthcareImpact: e.target.value.value })}
                  style={{ width: '100%', marginTop: '5px' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label>Special Concerns</label>
              <div style={{ marginTop: '8px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>
                  <input
                    type="checkbox"
                    checked={newFeedback.complianceConcern}
                    onChange={(e) => setNewFeedback({ ...newFeedback, complianceConcern: e.target.checked })}
                    style={{ marginRight: '8px' }}
                  />
                  Compliance/Regulatory Concern
                </label>
                
                <label style={{ display: 'block', marginBottom: '5px' }}>
                  <input
                    type="checkbox"
                    checked={newFeedback.accessibilityIssue}
                    onChange={(e) => setNewFeedback({ ...newFeedback, accessibilityIssue: e.target.checked })}
                    style={{ marginRight: '8px' }}
                  />
                  Accessibility Issue
                </label>
                
                <label style={{ display: 'block' }}>
                  <input
                    type="checkbox"
                    checked={newFeedback.securityConcern}
                    onChange={(e) => setNewFeedback({ ...newFeedback, securityConcern: e.target.checked })}
                    style={{ marginRight: '8px' }}
                  />
                  Security Concern
                </label>
              </div>
            </div>

            {pendingFeedback && (
              <div style={{ 
                backgroundColor: '#e3f2fd', 
                padding: '10px', 
                borderRadius: '4px',
                fontSize: '12px',
                color: '#1976d2'
              }}>
                Position: {pendingFeedback.x}, {pendingFeedback.y}
              </div>
            )}
          </div>

          <DialogActionsBar>
            <Button onClick={() => setShowFeedbackDialog(false)}>Cancel</Button>
            <Button 
              themeColor="primary" 
              onClick={handleSubmitFeedback}
              disabled={submitFeedbackMutation.isPending}
            >
              {submitFeedbackMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
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

export default PrototypeViewer;