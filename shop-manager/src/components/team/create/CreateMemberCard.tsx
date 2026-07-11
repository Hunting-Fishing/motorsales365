
import { useNavigate } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function CreateMemberCard() {
  const navigate = useNavigate();

  return (
    <Card className="flex flex-col items-center justify-center h-full border-dashed cursor-pointer min-h-[220px]"
      onClick={() => navigate("/team/create")}>
      <CardContent className="flex flex-col items-center justify-center p-6 text-center">
        <PlusCircle className="mb-4 h-14 w-14 text-muted-foreground" />
        <h3 className="text-xl font-medium mb-2">Add Team Member</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Invite a new person to join your team
        </p>
        <Button className="mt-2" onClick={(e) => {
          e.stopPropagation();
          navigate("/team/create");
        }}>
          Add Member
        </Button>
      </CardContent>
    </Card>
  );
}
