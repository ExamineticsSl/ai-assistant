import React, { useState, useRef, useCallback } from 'react';
import { ApprovalAttachment, FileUploadProgress } from '../types';
import { approvalService } from '../services/approvalService';

interface FileUploadProps {
  approvalId?: number;
  existingAttachments?: ApprovalAttachment[];
  onAttachmentsChange?: (attachments: ApprovalAttachment[]) => void;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  approvalId,
  existingAttachments = [],
  onAttachmentsChange,
  maxFileSize = 50, // 50MB default
  acceptedTypes = ['image/*', 'application/pdf', '.doc', '.docx', '.txt', '.md', '.json'],
  maxFiles = 10,
  disabled = false,
  className = ''
}) => {
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress[]>([]);
  const [attachments, setAttachments] = useState<ApprovalAttachment[]>(existingAttachments);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateAttachments = useCallback((newAttachments: ApprovalAttachment[]) => {
    setAttachments(newAttachments);
    onAttachmentsChange?.(newAttachments);
  }, [onAttachmentsChange]);

  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // Validate file count
    if (attachments.length + fileArray.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate and process files
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of fileArray) {
      // Check file size
      if (file.size > maxFileSize * 1024 * 1024) {
        errors.push(`${file.name}: File size exceeds ${maxFileSize}MB limit`);
        continue;
      }

      // Check file type
      const fileType = file.type || '';
      const fileName = file.name.toLowerCase();
      const isValidType = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return fileName.endsWith(type);
        }
        if (type.includes('*')) {
          const baseType = type.split('/')[0];
          return fileType.startsWith(baseType);
        }
        return fileType === type;
      });

      if (!isValidType) {
        errors.push(`${file.name}: File type not supported`);
        continue;
      }

      validFiles.push(file);
    }

    if (errors.length > 0) {
      alert('File validation errors:\n' + errors.join('\n'));
    }

    if (validFiles.length === 0) return;

    // Initialize upload progress
    const newProgress: FileUploadProgress[] = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading'
    }));

    setUploadProgress(prev => [...prev, ...newProgress]);

    // Upload files
    try {
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const progressIndex = uploadProgress.length + i;

        try {
          const attachment = await approvalService.uploadAttachment(
            approvalId,
            file,
            (progress) => {
              setUploadProgress(prev => prev.map((item, index) => 
                index === progressIndex 
                  ? { ...item, progress: Math.round(progress * 100) }
                  : item
              ));
            }
          );

          // Update progress to completed
          setUploadProgress(prev => prev.map((item, index) => 
            index === progressIndex
              ? { ...item, status: 'completed', attachmentId: attachment.id }
              : item
          ));

          // Add to attachments
          updateAttachments([...attachments, attachment]);

        } catch (error) {
          console.error('Upload failed:', error);
          setUploadProgress(prev => prev.map((item, index) => 
            index === progressIndex
              ? { 
                  ...item, 
                  status: 'failed', 
                  error: error instanceof Error ? error.message : 'Upload failed'
                }
              : item
          ));
        }
      }
    } finally {
      // Clean up completed/failed uploads after delay
      setTimeout(() => {
        setUploadProgress(prev => prev.filter(item => item.status === 'uploading'));
      }, 3000);
    }
  }, [approvalId, attachments, maxFiles, maxFileSize, acceptedTypes, uploadProgress.length, updateAttachments]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [disabled, handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
    // Clear input value to allow re-selecting same files
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileSelect]);

  const removeAttachment = useCallback(async (attachmentId: string) => {
    try {
      if (approvalId) {
        await approvalService.removeAttachment(approvalId, attachmentId);
      }
      const newAttachments = attachments.filter(att => att.id !== attachmentId);
      updateAttachments(newAttachments);
    } catch (error) {
      console.error('Failed to remove attachment:', error);
      alert('Failed to remove attachment');
    }
  }, [approvalId, attachments, updateAttachments]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (attachment: ApprovalAttachment): string => {
    if (attachment.isImage) return '🖼️';
    if (attachment.fileType.includes('pdf')) return '📄';
    if (attachment.fileType.includes('word') || attachment.fileName.includes('.doc')) return '📝';
    if (attachment.fileType.includes('json') || attachment.fileName.includes('.json')) return '📋';
    if (attachment.fileType.includes('text') || attachment.fileName.includes('.txt') || attachment.fileName.includes('.md')) return '📄';
    return '📎';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
          ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <div className="space-y-2">
          <div className="text-2xl">📎</div>
          <div>
            <p className="text-lg font-medium text-gray-900">
              {dragOver ? 'Drop files here' : 'Upload documents and images'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Drag and drop files or click to browse
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Supports: Images, PDF, Word docs, Text files, JSON • Max {maxFileSize}MB per file • Max {maxFiles} files
            </p>
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Uploading...</h4>
          {uploadProgress.map((progress, index) => (
            <div key={index} className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium truncate">{progress.file.name}</span>
                <span className="text-xs text-gray-500">{formatFileSize(progress.file.size)}</span>
              </div>
              
              {progress.status === 'uploading' && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
              )}
              
              {progress.status === 'completed' && (
                <div className="flex items-center text-green-600 text-sm">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Upload completed
                </div>
              )}
              
              {progress.status === 'failed' && (
                <div className="text-red-600 text-sm">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Upload failed
                  </div>
                  {progress.error && <p className="text-xs mt-1">{progress.error}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Existing Attachments */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Attached Files ({attachments.length})</h4>
          <div className="grid gap-3">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center flex-1">
                  <span className="text-2xl mr-3">{getFileIcon(attachment)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {attachment.fileName}
                      </p>
                      <span className="text-xs text-gray-500">
                        {formatFileSize(attachment.fileSize)}
                      </span>
                    </div>
                    {attachment.description && (
                      <p className="text-xs text-gray-600 mt-1">{attachment.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Uploaded {new Date(attachment.uploadedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Preview button for images */}
                  {attachment.isImage && attachment.thumbnailUrl && (
                    <button
                      onClick={() => window.open(attachment.url || attachment.thumbnailUrl, '_blank')}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      title="Preview image"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}

                  {/* Download button */}
                  {attachment.url && (
                    <button
                      onClick={() => window.open(attachment.url, '_blank')}
                      className="p-1 text-green-600 hover:text-green-800"
                      title="Download file"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}

                  {/* Remove button */}
                  <button
                    onClick={() => removeAttachment(attachment.id)}
                    className="p-1 text-red-600 hover:text-red-800"
                    title="Remove attachment"
                    disabled={disabled}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};