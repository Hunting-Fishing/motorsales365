import { TeamMember } from "@/types/team";
import { TeamMemberCard } from "./TeamMemberCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TeamMemberGridProps {
  members: TeamMember[];
  getInitials: (name: string) => string;
}

export function TeamMemberGrid({ members, getInitials }: TeamMemberGridProps) {
  const navigate = useNavigate();
  
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button 
          onClick={() => navigate('/team/create')}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Team Member
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((member) => (
          <TeamMemberCard 
            key={member.id} 
            member={member} 
            getInitials={getInitials}
          />
        ))}
        {members.length === 0 && (
          <div className="col-span-3 p-8 text-center text-muted-foreground bg-card rounded-lg border border-border">
            No team members found matching your filters.
          </div>
        )}
      </div>
    </div>
  );
}
