
export interface CustomerProvidedForm {
  id: string;
  title: string;
  description?: string;
  customerId: string;
  customerName?: string; // For display purposes
  filePath: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadDate: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  tags: string[];
  metadata?: Record<string, any>;
  url?: string; // URL to download/view the file
}

export interface CustomerFormComment {
  id: string;
  formId: string;
  userId: string;
  userName?: string; // For display purposes
  comment: string;
  createdAt: string;
  updatedAt: string;
}
