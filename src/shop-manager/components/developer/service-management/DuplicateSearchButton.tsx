import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { ServiceMainCategory } from '@/types/service';
import { DuplicateResolutionDialog } from './DuplicateResolutionDialog';

interface DuplicateSearchButtonProps {
  categories: ServiceMainCategory[];
  onResolve: () => void;
}

export function DuplicateSearchButton({ categories, onResolve }: DuplicateSearchButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Search className="h-4 w-4 mr-2" />
        Find Duplicates
      </Button>

      <DuplicateResolutionDialog
        open={open}
        setOpen={setOpen}
        categories={categories}
        onResolve={onResolve}
      />
    </>
  );
}

