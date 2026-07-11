import { useParams, useNavigate } from 'react-router-dom';
import { ProjectBudgetDetails } from '@/components/projects/ProjectBudgetDetails';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const handleBack = () => navigate('/projects');

  if (!id) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Project not found</p>
        <Button variant="outline" onClick={handleBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ProjectBudgetDetails projectId={id} onBack={handleBack} />
    </div>
  );
}
