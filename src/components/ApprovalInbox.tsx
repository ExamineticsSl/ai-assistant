import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HumanApprovalRequest, ApprovalAttachment } from '../types';
import { approvalService } from '../services/approvalService';
import { FileUpload } from './FileUpload';

interface ApprovalInboxProps {
  className?: string;
}

export const ApprovalInbox: React.FC<ApprovalInboxProps> = ({ className = '' }) => {
  const [selectedApproval, setSelectedApproval] = useState<HumanApprovalRequest | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'urgent' | 'escalated'>('pending');
  const queryClient = useQueryClient();

  // Fetch pending approvals
  const { data: approvals, isLoading, error } = useQuery({
    queryKey: ['approvals', filter],
    queryFn: () => approvalService.getPendingApprovals(filter),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Mutation for responding to approvals
  const respondMutation = useMutation({
    mutationFn: ({ approvalId, response }: { approvalId: number; response: ApprovalResponse }) =>
      approvalService.respondToApproval(approvalId, response),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      setSelectedApproval(null);
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'escalated': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffHours > 24) {
      return `${Math.floor(diffHours / 24)} days ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hours ago`;
    } else {
      return `${diffMinutes} minutes ago`;
    }
  };

  const isOverdue = (approval: HumanApprovalRequest) => {
    if (!approval.responseRequiredBy) return false;
    return new Date(approval.responseRequiredBy) < new Date();
  };

  if (isLoading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center mt-2 text-gray-600">Loading approvals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error loading approvals: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Approval Inbox</h2>
          <div className="flex space-x-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="urgent">Urgent</option>
              <option value="escalated">Escalated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Approval List */}
      <div className="divide-y divide-gray-200">
        {approvals?.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No approvals found for the selected filter.
          </div>
        ) : (
          approvals?.map((approval) => (
            <div
              key={approval.id}
              className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                selectedApproval?.id === approval.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
              }`}
              onClick={() => setSelectedApproval(approval)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">{approval.approvalTitle}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(approval.urgencyLevel)}`}>
                      {approval.urgencyLevel}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(approval.status)}`}>
                      {approval.status}
                    </span>
                    {isOverdue(approval) && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-500 text-white">
                        OVERDUE
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 mb-2 line-clamp-2">{approval.approvalDescription}</p>
                  <div className="flex items-center text-sm text-gray-500 space-x-4">
                    <span>Requested by: {approval.requestedBy}</span>
                    <span>Project ID: {approval.projectId}</span>
                    <span>{formatTimeAgo(approval.requestedDate)}</span>
                    {approval.responseRequiredBy && (
                      <span className={isOverdue(approval) ? 'text-red-600 font-medium' : ''}>
                        Due: {new Date(approval.responseRequiredBy).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Approval Detail Modal */}
      {selectedApproval && (
        <ApprovalDetailModal
          approval={selectedApproval}
          onClose={() => setSelectedApproval(null)}
          onRespond={(response) => {
            respondMutation.mutate({ approvalId: selectedApproval.id, response });
          }}
          isSubmitting={respondMutation.isPending}
        />
      )}
    </div>
  );
};

interface ApprovalResponse {
  decision: 'approved' | 'rejected' | 'needs_info';
  notes: string;
  conditions?: string;
  responseAttachments?: ApprovalAttachment[];
}

interface ApprovalDetailModalProps {
  approval: HumanApprovalRequest;
  onClose: () => void;
  onRespond: (response: ApprovalResponse) => void;
  isSubmitting: boolean;
}

const ApprovalDetailModal: React.FC<ApprovalDetailModalProps> = ({
  approval,
  onClose,
  onRespond,
  isSubmitting
}) => {
  const [decision, setDecision] = useState<'approved' | 'rejected' | 'needs_info'>('approved');
  const [notes, setNotes] = useState('');
  const [conditions, setConditions] = useState('');
  const [responseAttachments, setResponseAttachments] = useState<ApprovalAttachment[]>([]);

  const handleSubmit = () => {
    onRespond({
      decision,
      notes,
      conditions: decision === 'approved' && conditions ? conditions : undefined,
      responseAttachments
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Approval Request Details</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={isSubmitting}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Approval Info */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">{approval.approvalTitle}</h4>
            <p className="text-gray-600 mb-4">{approval.approvalDescription}</p>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Type:</span> {approval.approvalType}
              </div>
              <div>
                <span className="font-medium">Priority:</span> {approval.urgencyLevel}
              </div>
              <div>
                <span className="font-medium">Requested By:</span> {approval.requestedBy}
              </div>
              <div>
                <span className="font-medium">Project:</span> {approval.projectId}
              </div>
              {approval.taskId && (
                <div>
                  <span className="font-medium">Task:</span> {approval.taskId}
                </div>
              )}
              <div>
                <span className="font-medium">Requested:</span> {new Date(approval.requestedDate).toLocaleString()}
              </div>
            </div>

            {/* Existing Attachments from Request */}
            {approval.attachments && approval.attachments.length > 0 && (
              <div className="mt-4">
                <h5 className="font-medium text-gray-900 mb-2">Supporting Documents from Agent</h5>
                <div className="space-y-2">
                  {approval.attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center flex-1">
                        <span className="text-xl mr-3">
                          {attachment.isImage ? '🖼️' : attachment.fileType.includes('pdf') ? '📄' : '📎'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{attachment.fileName}</p>
                          {attachment.description && (
                            <p className="text-xs text-gray-600">{attachment.description}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            {Math.round(attachment.fileSize / 1024)} KB • 
                            Uploaded {new Date(attachment.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {attachment.url && (
                        <button
                          onClick={() => window.open(attachment.url, '_blank')}
                          className="ml-2 p-1 text-blue-600 hover:text-blue-800"
                          title="View/Download"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {approval.contextData && (
              <div className="mt-4">
                <h5 className="font-medium text-gray-900 mb-2">Context Data</h5>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                  {JSON.stringify(approval.contextData, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Response Form */}
          <div className="border-t border-gray-200 pt-4">
            <h5 className="font-medium text-gray-900 mb-4">Your Response</h5>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Decision</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="approved"
                      checked={decision === 'approved'}
                      onChange={(e) => setDecision(e.target.value as any)}
                      className="mr-2"
                      disabled={isSubmitting}
                    />
                    <span className="text-green-600 font-medium">Approve</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="rejected"
                      checked={decision === 'rejected'}
                      onChange={(e) => setDecision(e.target.value as any)}
                      className="mr-2"
                      disabled={isSubmitting}
                    />
                    <span className="text-red-600 font-medium">Reject</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="needs_info"
                      checked={decision === 'needs_info'}
                      onChange={(e) => setDecision(e.target.value as any)}
                      className="mr-2"
                      disabled={isSubmitting}
                    />
                    <span className="text-yellow-600 font-medium">Needs More Information</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Response Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Explain your decision and any additional context..."
                  disabled={isSubmitting}
                  required
                />
              </div>

              {decision === 'approved' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Conditions (Optional)
                  </label>
                  <textarea
                    value={conditions}
                    onChange={(e) => setConditions(e.target.value)}
                    rows={2}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Any conditions or requirements for this approval..."
                    disabled={isSubmitting}
                  />
                </div>
              )}

              {/* Response Attachments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supporting Documents (Optional)
                </label>
                <p className="text-xs text-gray-600 mb-3">
                  Upload additional documents, images, or files to support your decision. 
                  This could include reference materials, screenshots, or clarifications for the agent.
                </p>
                <FileUpload
                  approvalId={approval.id}
                  existingAttachments={responseAttachments}
                  onAttachmentsChange={setResponseAttachments}
                  maxFileSize={25} // 25MB for response files
                  maxFiles={5}
                  disabled={isSubmitting}
                  className="border border-gray-200 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!notes.trim() || isSubmitting}
            className={`px-4 py-2 rounded-md text-white font-medium ${
              decision === 'approved'
                ? 'bg-green-600 hover:bg-green-700'
                : decision === 'rejected'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-yellow-600 hover:bg-yellow-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSubmitting ? 'Submitting...' : `${decision === 'approved' ? 'Approve' : decision === 'rejected' ? 'Reject' : 'Request Info'}`}
          </button>
        </div>
      </div>
    </div>
  );
};