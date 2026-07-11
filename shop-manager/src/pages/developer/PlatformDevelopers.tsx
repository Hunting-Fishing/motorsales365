import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { ArrowLeft, Plus, Shield, User, Trash2, Crown, AlertTriangle } from "lucide-react";
import {
  usePlatformDevelopers,
  useAddPlatformDeveloper,
  useUpdatePlatformDeveloper,
  useRemovePlatformDeveloper,
  PlatformDeveloper,
} from '@/hooks/usePlatformDeveloper';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function PlatformDevelopers() {
  const { data: developers, isLoading } = usePlatformDevelopers();
  const addDeveloper = useAddPlatformDeveloper();
  const updateDeveloper = useUpdatePlatformDeveloper();
  const removeDeveloper = useRemovePlatformDeveloper();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const handleAddDeveloper = async () => {
    if (!newEmail.trim()) {
      toast.error('Email is required');
      return;
    }

    try {
      await addDeveloper.mutateAsync({
        email: newEmail.trim(),
        displayName: newDisplayName.trim() || undefined,
        notes: newNotes.trim() || undefined,
      });
      toast.success('Platform developer added successfully');
      setIsAddDialogOpen(false);
      setNewEmail('');
      setNewDisplayName('');
      setNewNotes('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add platform developer');
    }
  };

  const handleToggleActive = async (dev: PlatformDeveloper) => {
    try {
      await updateDeveloper.mutateAsync({
        id: dev.id,
        isActive: !dev.is_active,
      });
      toast.success(dev.is_active ? 'Developer deactivated' : 'Developer activated');
    } catch (error) {
      toast.error('Failed to update developer status');
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeDeveloper.mutateAsync(id);
      toast.success('Platform developer removed');
    } catch (error) {
      toast.error('Failed to remove platform developer');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-8">
        <Button variant="outline" size="sm" className="mb-4" asChild>
          <Link to="/system-admin">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Developer Portal
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Platform Developers</h1>
            <p className="text-muted-foreground">Manage god-mode developer accounts with full platform access</p>
          </div>
        </div>
      </div>

      {/* Warning Card */}
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardContent className="flex items-start gap-4 pt-6">
          <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-600">Security Notice</h3>
            <p className="text-sm text-muted-foreground">
              Platform developers have unrestricted access to all shops, modules, and data across the entire platform. 
              Only add trusted team members who require this level of access for development and debugging purposes.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Add Developer Button */}
      <div className="flex justify-end">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Platform Developer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Platform Developer</DialogTitle>
              <DialogDescription>
                Add a user as a platform developer with god-mode access to all platform features.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">User Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="developer@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  The user must already have an account in the system
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  placeholder="John Developer"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Reason for access, team, etc."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddDeveloper} disabled={addDeveloper.isPending}>
                {addDeveloper.isPending ? 'Adding...' : 'Add Developer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Developers List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Active Platform Developers
          </CardTitle>
          <CardDescription>
            Users with platform-wide developer access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading developers...</div>
          ) : !developers || developers.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-lg">No Platform Developers</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Add your first platform developer to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {developers.map((dev) => (
                <div
                  key={dev.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Crown className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {dev.display_name || dev.email}
                        </span>
                        <Badge variant={dev.is_active ? "default" : "secondary"}>
                          {dev.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {dev.email}
                      </div>
                      {dev.notes && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {dev.notes}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        Added: {format(new Date(dev.created_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`active-${dev.id}`} className="text-sm">
                        Active
                      </Label>
                      <Switch
                        id={`active-${dev.id}`}
                        checked={dev.is_active}
                        onCheckedChange={() => handleToggleActive(dev)}
                      />
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Platform Developer</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove {dev.display_name || dev.email} as a platform developer? 
                            They will lose all god-mode access immediately.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemove(dev.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
