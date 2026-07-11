import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Calculator, AlertCircle } from 'lucide-react';
import { usePricingFormulas, FormulaChemical } from '@/hooks/power-washing/usePricingFormulas';
import { PricingFormulaCard } from '@/components/power-washing/PricingFormulaCard';
import { PricingFormulaDialog } from '@/components/power-washing/PricingFormulaDialog';
import { FastQuoteCalculator } from '@/components/power-washing/FastQuoteCalculator';
import { FormulaTemplates } from '@/components/power-washing/FormulaTemplates';
import { SURFACE_TYPES, APPLICATIONS } from '@/types/pricing-formula';
import type { PricingFormula } from '@/types/pricing-formula';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function PowerWashingPricingFormulas() {
  const { formulas, isLoading, createFormula, updateFormula, deleteFormula } = usePricingFormulas();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFormula, setSelectedFormula] = useState<PricingFormula | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formulaToDelete, setFormulaToDelete] = useState<string | null>(null);
  const [templateChemicals, setTemplateChemicals] = useState<FormulaChemical[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [surfaceFilter, setSurfaceFilter] = useState<string>('all');
  const [applicationFilter, setApplicationFilter] = useState<string>('all');
  const [showCalculator, setShowCalculator] = useState(false);

  const filteredFormulas = formulas.filter((formula) => {
    const matchesSearch = formula.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSurface = surfaceFilter === 'all' || formula.surface_type === surfaceFilter;
    const matchesApp = applicationFilter === 'all' || formula.application === applicationFilter;
    return matchesSearch && matchesSurface && matchesApp;
  });

  const handleEdit = (formula: PricingFormula) => {
    setSelectedFormula(formula);
    setDialogOpen(true);
  };

  const handleDuplicate = (formula: PricingFormula) => {
    const { id, created_at, updated_at, ...rest } = formula;
    setSelectedFormula({
      ...rest,
      name: `${formula.name} (Copy)`,
    } as PricingFormula);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setFormulaToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (formulaToDelete) {
      deleteFormula.mutate(formulaToDelete);
      setFormulaToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleSave = (data: Partial<PricingFormula>, chemicals: any[]) => {
    if (selectedFormula?.id) {
      updateFormula.mutate({ id: selectedFormula.id, ...data, chemicals });
    } else {
      createFormula.mutate({ formula: data, chemicals });
    }
    setDialogOpen(false);
    setSelectedFormula(null);
  };

  const handleNewFormula = () => {
    setSelectedFormula(null);
    setTemplateChemicals([]);
    setDialogOpen(true);
  };

  const handleSelectTemplate = (formula: Partial<PricingFormula>, chemicals: FormulaChemical[]) => {
    setSelectedFormula(formula as PricingFormula);
    setTemplateChemicals(chemicals);
    setDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">Pricing Formulas</h1>
              <p className="text-muted-foreground">
                Fast quote pricing based on surface type and condition
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <FormulaTemplates onSelectTemplate={handleSelectTemplate} />
              <Button
                variant={showCalculator ? 'default' : 'outline'}
                onClick={() => setShowCalculator(!showCalculator)}
                className="lg:hidden"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Calculator
              </Button>
              <Button onClick={handleNewFormula}>
                <Plus className="h-4 w-4 mr-2" />
                Add Formula
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search formulas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={surfaceFilter} onValueChange={setSurfaceFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Surface Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Surfaces</SelectItem>
                {SURFACE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={applicationFilter} onValueChange={setApplicationFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Application" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Applications</SelectItem>
                {APPLICATIONS.map((app) => (
                  <SelectItem key={app.value} value={app.value}>
                    {app.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mobile Calculator */}
          {showCalculator && (
            <div className="lg:hidden mb-6">
              <FastQuoteCalculator />
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredFormulas.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {formulas.length === 0
                  ? 'No pricing formulas yet. Add your first formula to start using fast quotes.'
                  : 'No formulas match your filters.'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFormulas.map((formula) => (
                <PricingFormulaCard
                  key={formula.id}
                  formula={formula}
                  onEdit={handleEdit}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>

        {/* Desktop Calculator Sidebar */}
        <div className="hidden lg:block w-[400px] sticky top-6">
          <FastQuoteCalculator />
        </div>
      </div>

      {/* Dialogs */}
      <PricingFormulaDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setTemplateChemicals([]);
          }
        }}
        formula={selectedFormula}
        onSave={handleSave}
        isLoading={createFormula.isPending || updateFormula.isPending}
        initialChemicals={templateChemicals}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pricing Formula?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the pricing formula.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
