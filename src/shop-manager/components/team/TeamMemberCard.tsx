
import { Link } from "react-router-dom";
import { Mail, Phone, Eye, Briefcase, Building2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TeamMember } from "@/types/team";

interface TeamMemberCardProps {
  member: TeamMember;
  getInitials: (name: string) => string;
}

export function TeamMemberCard({ member, getInitials }: TeamMemberCardProps) {
  const hasNoRole = member.role === "No Role Assigned";
  const memberInitials = getInitials(member.name);
  
  // Determine badge variant based on status
  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'success' as const;
      case 'inactive':
        return 'secondary' as const;
      case 'on leave':
        return 'warning' as const;
      case 'terminated':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };
  
  return (
    <article className="bg-card rounded-lg border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage 
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`} 
              alt={`Profile photo of ${member.name}`} 
            />
            <AvatarFallback className="bg-primary/10 text-primary" aria-label={`${member.name} initials`}>
              {memberInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-medium text-foreground">{member.name}</h2>
            <p className="text-sm text-muted-foreground">{member.jobTitle || 'No Job Title'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {hasNoRole && (
            <Badge variant="outline" className="border-warning text-warning bg-warning/10">
              No Role
            </Badge>
          )}
          <Badge variant={getStatusVariant(member.status)}>
            {member.status}
          </Badge>
        </div>
      </header>
      <div className="p-4 space-y-3">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-foreground flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="font-medium">Role:</span> 
            <span className="text-muted-foreground">{member.role}</span>
          </p>
          {member.department && (
            <p className="text-sm text-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="font-medium">Department:</span> 
              <span className="text-muted-foreground">{member.department}</span>
            </p>
          )}
          {member.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <a href={`mailto:${member.email}`} className="text-primary hover:underline truncate">
                {member.email}
              </a>
            </div>
          )}
          {member.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <a href={`tel:${member.phone}`} className="text-primary hover:underline">
                {member.phone}
              </a>
            </div>
          )}
        </div>

        {/* Work order stats - show for all technicians/workers */}
        {(member.workOrders.assigned > 0 || member.workOrders.completed > 0) && (
          <div className="flex gap-4 pt-3 border-t border-border">
            <div className="flex-1 text-center">
              <p className="text-xs text-muted-foreground">Assigned</p>
              <p className="text-xl font-semibold text-primary">{member.workOrders.assigned}</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="text-xl font-semibold text-primary">{member.workOrders.completed}</p>
            </div>
          </div>
        )}
      </div>
      <footer className="p-4 border-t border-border bg-muted/50 flex justify-between">
        <Link 
          to={`/team/${member.id}`} 
          className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
          aria-label={`View ${member.name}'s complete profile`}
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
          View Profile
        </Link>

        {!hasNoRole && (
          <Link
            to={`/team/${member.id}?tab=permissions`}
            className="text-sm text-primary hover:text-primary/80"
            aria-label={`Manage ${member.name}'s permissions`}
          >
            Permissions
          </Link>
        )}
      </footer>
    </article>
  );
}
