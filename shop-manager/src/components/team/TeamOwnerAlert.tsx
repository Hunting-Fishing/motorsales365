
import { useState } from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useRoleAssignment } from "@/hooks/team/useRoleAssignment";

interface TeamOwnerAlertProps {
  userId: string;
  hasNoRole: boolean;
}

export function TeamOwnerAlert({ userId, hasNoRole }: TeamOwnerAlertProps) {
  const [isAssigningRole, setIsAssigningRole] = useState(false);
  const { toast } = useToast();
  const { assignRole } = useRoleAssignment({
    currentUserName: "System",
    currentUserId: userId || ""
  });
  
  if (!hasNoRole) return null;
  
  const handleSelfAssignOwnerRole = async () => {
    if (!userId) {
      toast({
        title: "Not authenticated",
        description: "You need to be logged in to assign yourself a role.",
        variant: "destructive",
      });
      return;
    }
    
    setIsAssigningRole(true);
    try {
      console.log("Assigning Owner role to self...");
      
      // Use the role assignment hook utility function
      const result = await assignRole(userId, "Owner");
      
      if (result.success) {
        toast({
          title: "Role assigned",
          description: "You are now an Owner. The page will refresh in 3 seconds.",
          variant: "success",
        });
        setTimeout(() => window.location.reload(), 3000);
      } else {
        toast({
          title: "Error",
          description: result.error ? String(result.error) : "Failed to assign role. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error assigning role:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAssigningRole(false);
    }
  };
  
  return (
    <Alert className="bg-yellow-50 border border-yellow-200">
      <AlertCircle className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-800">You don't have a role assigned</AlertTitle>
      <AlertDescription className="text-yellow-700">
        As the first user of the system, you should assign yourself as the Owner.
        <div className="mt-4">
          <Button 
            onClick={handleSelfAssignOwnerRole}
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
            disabled={isAssigningRole}
          >
            {isAssigningRole ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : "Make Me an Owner"}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
