
import { CheckCircle, XCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PermissionModuleCardProps {
  moduleName: string;
  actions: Record<string, boolean>;
  onTogglePermission: (module: string, action: string, value: boolean) => void;
}

export function PermissionModuleCard({ 
  moduleName, 
  actions, 
  onTogglePermission 
}: PermissionModuleCardProps) {
  return (
    <Card key={moduleName} className="shadow-sm w-full">
      <CardHeader className="pb-3">
        <CardTitle className="capitalize">{moduleName}</CardTitle>
        <CardDescription>
          Configure access to {moduleName.toLowerCase()} module
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {Object.entries(actions).map(([action, value]) => (
            <li key={`${moduleName}-${action}`} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {value ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-slate-300" />
                )}
                <span className="capitalize">{action}</span>
              </div>
              <Switch
                checked={value}
                onCheckedChange={(checked) => 
                  onTogglePermission(moduleName, action, checked)
                }
              />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
