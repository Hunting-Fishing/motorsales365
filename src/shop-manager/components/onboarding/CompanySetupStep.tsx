import { useState } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CompanySetupStepProps {
  onSubmit: (companyName: string) => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
}

export function CompanySetupStep({ onSubmit, onBack, isLoading }: CompanySetupStepProps) {
  const [companyName, setCompanyName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (companyName.trim()) {
      await onSubmit(companyName.trim());
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8 text-primary-foreground" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          Set Up Your Company
        </h2>
        <p className="text-muted-foreground max-w-sm mx-auto">
          Enter your company name to create your workspace
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name</Label>
          <Input
            id="companyName"
            placeholder="Enter your company name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={isLoading}
            autoFocus
            className="h-12"
          />
        </div>
        
        <div className="flex gap-3">
          <Button 
            type="button" 
            variant="outline" 
            className="flex-1 h-12" 
            onClick={onBack}
            disabled={isLoading}
          >
            Back
          </Button>
          <Button 
            type="submit" 
            className="flex-1 h-12" 
            disabled={isLoading || !companyName.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Company'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
