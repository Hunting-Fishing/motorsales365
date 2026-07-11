
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function HeaderBackButton() {
  const navigate = useNavigate();
  
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => navigate("/team")}
      aria-label="Back to team list"
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );
}
