import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Check, X, AlertCircle } from "lucide-react";
import { rolePermissionDefaults, type AccessLevel } from "@/data/rolePermissionDefaults";

interface RolePermissionsSummaryProps {
  roleId: string;
  showFullDetails?: boolean;
}

const accessLevelColors: Record<AccessLevel, string> = {
  'full': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'standard': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'limited': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  'view-only': 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400',
  'none': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
};

const accessLevelLabels: Record<AccessLevel, string> = {
  'full': 'Full Access',
  'standard': 'Standard Access',
  'limited': 'Limited Access',
  'view-only': 'View Only',
  'none': 'No Access'
};

export function RolePermissionsSummary({ roleId, showFullDetails = true }: RolePermissionsSummaryProps) {
  const roleTemplate = rolePermissionDefaults[roleId];

  if (!roleTemplate) {
    return (
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">No permission information available for this role.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const PermissionAreaCard = ({ 
    title, 
    level,
    icon 
  }: { 
    title: string; 
    level: AccessLevel;
    icon: string;
  }) => (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-medium">{title}</span>
      </div>
      <Badge variant="outline" className={accessLevelColors[level]}>
        {accessLevelLabels[level]}
      </Badge>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>{roleTemplate.displayName}</CardTitle>
          </div>
          <CardDescription>{roleTemplate.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Access Level:</span>
            <Badge className={accessLevelColors[roleTemplate.accessLevel]}>
              {accessLevelLabels[roleTemplate.accessLevel]}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {showFullDetails && (
        <>
          {/* Permission Areas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Permission Areas</CardTitle>
              <CardDescription>
                What this role can access in each area
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <PermissionAreaCard 
                title="Operations" 
                level={roleTemplate.permissions.operations}
                icon="📋"
              />
              <PermissionAreaCard 
                title="Assets & Equipment" 
                level={roleTemplate.permissions.assets}
                icon="🔧"
              />
              <PermissionAreaCard 
                title="Financial" 
                level={roleTemplate.permissions.financial}
                icon="💰"
              />
              <PermissionAreaCard 
                title="Customers" 
                level={roleTemplate.permissions.customers}
                icon="👥"
              />
              <PermissionAreaCard 
                title="Admin & Settings" 
                level={roleTemplate.permissions.admin}
                icon="⚙️"
              />
            </CardContent>
          </Card>

          {/* What They Can Do */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What This Role Can Do</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {roleTemplate.capabilities.map((capability, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{capability}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Restrictions */}
          {roleTemplate.restrictions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Restrictions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {roleTemplate.restrictions.map((restriction, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <X className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span>{restriction}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> These are the default permissions for this role. 
            Custom permissions can be configured in Settings → Roles if needed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
