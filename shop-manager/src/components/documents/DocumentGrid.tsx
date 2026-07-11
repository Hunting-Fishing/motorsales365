
import React from 'react';
import { Document } from '@/types/document';
import { DocumentCard } from './DocumentCard';

interface DocumentGridProps {
  documents: Document[];
  onDocumentClick: (document: Document) => void;
  onEditDocument: (document: Document) => void;
  onDeleteDocument: (id: string) => void;
}

export function DocumentGrid({ documents, onDocumentClick, onEditDocument, onDeleteDocument }: DocumentGridProps) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="p-4 rounded-full bg-muted/30 text-muted-foreground mb-6">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="text-center max-w-md">
          <h3 className="text-lg font-semibold text-foreground mb-2">No documents found</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Upload your first document to get started or adjust your search filters to find existing documents.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-6">
      {documents.map((document) => (
        <DocumentCard
          key={document.id}
          document={document}
          onClick={() => onDocumentClick(document)}
          onEdit={() => onEditDocument(document)}
          onDelete={() => onDeleteDocument(document.id)}
        />
      ))}
    </div>
  );
}
