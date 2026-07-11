
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Key, Lock, LogOut, AlertTriangle, Smartphone } from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { userSecurityService, UserSession, User2FA } from "@/services/user/userSecurityService";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";

export function SecurityTab() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [twoFAStatus, setTwoFAStatus] = useState<User2FA | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [securitySettings, setSecuritySettings] = useState<any>(null);
  
  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;
      
      setUser(currentUser);
      
      // Get user's shop ID to load security settings
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('id', currentUser.id)
        .single();
      
      if (profile?.shop_id) {
        // Load security settings for the shop
        const { data: settings } = await supabase
          .from('security_settings')
          .select('*')
          .eq('shop_id', profile.shop_id)
          .single();
        
        setSecuritySettings(settings);
      }
      
      // Load user sessions
      const userSessions = await userSecurityService.getUserSessions(currentUser.id);
      setSessions(userSessions);
      
      // Load 2FA status
      const twoFA = await userSecurityService.get2FAStatus(currentUser.id);
      setTwoFAStatus(twoFA);
      
    } catch (error) {
      console.error('Error loading security data:', error);
      toast({
        title: "Error",
        description: "Failed to load security settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast({
        title: "Error", 
        description: "Password must be at least 8 characters long",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await userSecurityService.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );

      if (result.success) {
        toast({
          title: "Success",
          description: "Password updated successfully"
        });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update password",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update password",
        variant: "destructive"
      });
    }
  };

  const handleToggle2FA = async () => {
    if (!user) return;

    try {
      if (twoFAStatus?.enabled) {
        const success = await userSecurityService.disable2FA(user.id);
        if (success) {
          setTwoFAStatus(prev => prev ? { ...prev, enabled: false } : null);
          toast({
            title: "Success",
            description: "Two-factor authentication disabled"
          });
        }
      } else {
        // For simplicity, we'll generate a secret and enable 2FA
        // In a real app, this would involve QR code generation and verification
        const secret = Math.random().toString(36).substring(2, 15);
        const result = await userSecurityService.enable2FA(user.id, secret);
        if (result) {
          setTwoFAStatus(result);
          toast({
            title: "Success",
            description: "Two-factor authentication enabled"
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update two-factor authentication",
        variant: "destructive"
      });
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      const success = await userSecurityService.terminateSession(sessionId);
      if (success) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        toast({
          title: "Success",
          description: "Session terminated successfully"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to terminate session",
        variant: "destructive"
      });
    }
  };

  const handleTerminateAllOtherSessions = async () => {
    if (!user) return;

    try {
      const currentSession = sessions.find(s => s.is_current);
      const success = await userSecurityService.terminateAllOtherSessions(
        user.id,
        currentSession?.id
      );
      
      if (success) {
        setSessions(prev => prev.filter(s => s.is_current));
        toast({
          title: "Success",
          description: "All other sessions terminated successfully"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to terminate sessions",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const result = await userSecurityService.deleteAccount();
      if (result.success) {
        toast({
          title: "Account Deactivated",
          description: "Your account has been deactivated. You will be signed out."
        });
        navigate('/login');
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete account",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive"
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading security settings...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Password Settings
          </CardTitle>
          <CardDescription>Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input 
                id="current-password" 
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input 
                id="new-password" 
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input 
                id="confirm-password" 
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                required
                minLength={8}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                Update Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>Add an extra layer of security to your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="two-factor">Enable Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Receive a verification code via SMS or authentication app each time you log in
              </p>
            </div>
            <Switch 
              id="two-factor" 
              checked={twoFAStatus?.enabled || false}
              onCheckedChange={handleToggle2FA}
            />
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="mt-0.5">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <Label className="text-sm font-medium">Authentication Method</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center space-x-2">
                    <input type="radio" id="app" name="auth-method" className="text-primary focus:ring-primary" />
                    <label htmlFor="app" className="text-sm">Authentication App</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="radio" id="sms" name="auth-method" className="text-primary focus:ring-primary" />
                    <label htmlFor="sms" className="text-sm">SMS Verification</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Active Sessions
          </CardTitle>
          <CardDescription>Manage your currently active sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No active sessions found
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{session.device_name || 'Unknown Device'}</span>
                          <span className="text-xs text-muted-foreground">
                            {session.browser_name} on {session.operating_system}
                          </span>
                          {session.is_current && (
                            <Badge variant="outline" className="mt-1 w-fit">Current</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{session.location || 'Unknown Location'}</span>
                          <span className="text-xs text-muted-foreground">
                            {session.ip_address?.toString() || 'Unknown IP'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(session.last_active).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {!session.is_current && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleTerminateSession(session.id)}
                          >
                            <LogOut className="mr-1 h-3 w-3" />
                            Sign Out
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex justify-end">
            <Button 
              variant="outline" 
              className="text-destructive hover:text-destructive"
              onClick={handleTerminateAllOtherSessions}
              disabled={sessions.filter(s => !s.is_current).length === 0}
            >
              Sign out of all other sessions
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible and destructive actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4">
            <h4 className="text-sm font-medium text-destructive">Delete Account</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Once you delete your account, there is no going back. This action is permanent.
            </p>
            <div className="mt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={deletingAccount}>
                    {deletingAccount ? 'Deleting...' : 'Delete Account'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently deactivate your account
                      and remove your access to the system. You will be signed out immediately.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, delete my account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
