import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Users, Settings, CheckCircle, Info } from "lucide-react";

export function PermissionsGuide() {
  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">How Permissions Work</CardTitle>
          </div>
          <CardDescription>
            A two-tier system for maximum flexibility and security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <Shield className="h-4 w-4 text-blue-600" />
                <span>1. Role Templates (Default)</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Set default permissions for each role (Deckhand, Captain, Mate, etc.). 
                All employees with that role automatically get these permissions.
              </p>
              <div className="pl-6 space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Saves time - configure once for all users</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Consistent access across the team</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <Users className="h-4 w-4 text-purple-600" />
                <span>2. Individual Overrides (Custom)</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Customize permissions for specific employees beyond their role. 
                Individual settings always take precedence over role defaults.
              </p>
              <div className="pl-6 space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Grant extra access when needed</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Restrict access for specific users</span>
                </div>
              </div>
            </div>
          </div>

          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription>
              <strong>Priority:</strong> Individual employee permissions override role permissions. 
              If an employee has custom permissions for a module, their role's default permissions 
              for that module are ignored.
            </AlertDescription>
          </Alert>

          <div className="border-t pt-4 space-y-3">
            <h4 className="font-semibold text-sm">Security Features:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Organization Isolation:</strong> All data is automatically restricted to your organization. 
                  Employees can never see data from other companies.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Vessel Assignment:</strong> Deckhands and captains only see inventory for vessels 
                  assigned to them (configured in Equipment Assignments).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Accounting Protection:</strong> Sensitive financial data is hidden from vessel crew 
                  by default. Only owners and authorized staff can access accounting.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Audit Trail:</strong> All permission changes are logged with who made the change and when.
                </span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Example Workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="space-y-2">
            <p className="font-semibold">Scenario: New deckhand joins your fishing operation</p>
            <ol className="list-decimal list-inside space-y-2 pl-2 text-muted-foreground">
              <li>Create their user account and assign them the "Deckhand" role</li>
              <li>They automatically get default deckhand permissions (view-only access to work orders, can log equipment hours)</li>
              <li>Assign them to their specific vessel in Equipment Assignments</li>
              <li>They can now only see inventory for their assigned vessel - not company-wide stock</li>
              <li>If they need extra access (e.g., to create work orders), go to Individual Employee Permissions and grant it</li>
              <li>Custom permissions show with a blue "Custom" badge for easy identification</li>
            </ol>
          </div>

          <Alert>
            <AlertDescription>
              <strong>Pro Tip:</strong> Start with role templates for the majority of your team, then use 
              individual permissions for exceptions (senior crew, department heads, etc.).
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
