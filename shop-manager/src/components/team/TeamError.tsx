
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface TeamErrorProps {
  error: string;
}

export function TeamError({ error }: TeamErrorProps) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error loading team members</AlertTitle>
      <AlertDescription>
        {error}. Please check your connection and try again.
      </AlertDescription>
    </Alert>
  );
}
