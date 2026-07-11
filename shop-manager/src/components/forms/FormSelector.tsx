
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, FileText, Loader2 } from 'lucide-react';
import { useFormsByCategory } from '@/hooks/useFormsByCategory';
import { FormBuilderTemplate } from '@/types/formBuilder';

interface FormSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: FormBuilderTemplate) => void;
  category?: string;
  title?: string;
}

export function FormSelector({
  open,
  onClose,
  onSelect,
  category,
  title = 'Select a Form'
}: FormSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { forms, loading } = useFormsByCategory({ category, publishedOnly: true });

  const filteredForms = forms.filter((form) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      form.name.toLowerCase().includes(searchLower) ||
      form.description?.toLowerCase().includes(searchLower) ||
      form.category.toLowerCase().includes(searchLower)
    );
  });

  const handleSelect = (form: FormBuilderTemplate) => {
    onSelect(form);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search forms..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredForms.length > 0 ? (
            <div className="space-y-2">
              {filteredForms.map((form) => (
                <div
                  key={form.id}
                  className="p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors group"
                  onClick={() => handleSelect(form)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm group-hover:text-primary transition-colors">
                        {form.name}
                      </h4>
                      {form.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {form.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {form.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {form.sections?.length || 0} section(s)
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Select
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <FileText className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No forms found</p>
              {searchTerm && (
                <p className="text-xs mt-1">Try a different search term</p>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
