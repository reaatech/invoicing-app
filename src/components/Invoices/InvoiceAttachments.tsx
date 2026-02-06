import React, { useState, useEffect } from 'react';
import { Box, Button, IconButton, List, ListItem, ListItemText, Paper, Typography } from '@mui/material';
import { Paperclip, Trash2, Upload } from 'lucide-react';
import { safeElectronAPI } from '../../utils/electron-api';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

interface Attachment {
  id: number;
  invoice_id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  created_at: string;
}

interface InvoiceAttachmentsProps {
  invoiceId: number;
  readOnly?: boolean;
}

const InvoiceAttachments: React.FC<InvoiceAttachmentsProps> = ({ invoiceId, readOnly = false }) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadAttachments();
  }, [invoiceId]);

  const loadAttachments = async () => {
    const response = await api.query('SELECT * FROM invoice_attachments WHERE invoice_id = ? ORDER BY created_at', [invoiceId]);
    if (response.success && response.data) {
      setAttachments(response.data as Attachment[]);
    }
  };

  const handleAddAttachment = () => {
    safeElectronAPI.sendMessage('show-open-dialog', {
      title: 'Select files to attach',
      filters: []
    });

    const handleResponse = (response: any) => {
      if (response.success && !response.canceled && response.filePaths.length > 0) {
        uploadFiles(response.filePaths);
      }
      safeElectronAPI.removeMessage('show-open-dialog-response', handleResponse);
    };

    safeElectronAPI.onMessage('show-open-dialog-response', handleResponse);
  };

  const uploadFiles = async (filePaths: string[]) => {
    setIsUploading(true);
    const uploadPromises = filePaths.map(filePath => uploadFile(filePath));
    
    try {
      await Promise.all(uploadPromises);
      toast.success(`${filePaths.length} file(s) attached successfully`);
      loadAttachments();
    } catch (error) {
      toast.error('Failed to attach some files');
    } finally {
      setIsUploading(false);
    }
  };

  const uploadFile = (filePath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      safeElectronAPI.sendMessage('upload-attachment', invoiceId, filePath);

      const handleResponse = (response: any) => {
        safeElectronAPI.removeMessage('upload-attachment-response', handleResponse);
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error));
        }
      };

      safeElectronAPI.onMessage('upload-attachment-response', handleResponse);
    });
  };

  const handleDeleteAttachment = async (attachmentId: number, filename: string) => {
    if (!window.confirm(`Are you sure you want to remove "${filename}"?`)) {
      return;
    }

    safeElectronAPI.sendMessage('delete-attachment', attachmentId);

    const handleResponse = (response: any) => {
      safeElectronAPI.removeMessage('delete-attachment-response', handleResponse);
      if (response.success) {
        toast.success('Attachment removed');
        loadAttachments();
      } else {
        toast.error('Failed to remove attachment');
      }
    };

    safeElectronAPI.onMessage('delete-attachment-response', handleResponse);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Paper sx={{ p: 2.5 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={600}>
          <Paperclip className="h-5 w-5 inline mr-2" />
          Attachments
        </Typography>
        {!readOnly && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<Upload className="h-4 w-4" />}
            onClick={handleAddAttachment}
            disabled={isUploading}
          >
            Add Files
          </Button>
        )}
      </Box>

      {attachments.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          No attachments
        </Typography>
      ) : (
        <List dense>
          {attachments.map((attachment) => (
            <ListItem
              key={attachment.id}
              secondaryAction={
                !readOnly && (
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => handleDeleteAttachment(attachment.id, attachment.original_filename)}
                    color="error"
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                )
              }
            >
              <ListItemText
                primary={attachment.original_filename}
                secondary={formatFileSize(attachment.file_size)}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default InvoiceAttachments;
