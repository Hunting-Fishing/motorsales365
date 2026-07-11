
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface ProfileFormProps {
  formData: {
    firstName: string;
    middleName: string;
    lastName: string;
    email: string;
    phone: string;
    jobTitle: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
}

export function ProfileForm({ formData, onChange, onSubmit, isSaving }: ProfileFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company-firstName">First Name</Label>
              <Input
                id="company-firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={onChange}
                className="bg-white shadow-md rounded-xl border border-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-middleName">Middle Name <span className="text-muted-foreground text-xs">(Optional)</span></Label>
              <Input
                id="company-middleName"
                placeholder="Middle Name"
                value={formData.middleName}
                onChange={onChange}
                className="bg-white shadow-md rounded-xl border border-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-lastName">Last Name</Label>
              <Input
                id="company-lastName"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={onChange}
                className="bg-white shadow-md rounded-xl border border-gray-100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-email">Email</Label>
            <Input
              id="company-email"
              type="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={onChange}
              className="bg-white shadow-md rounded-xl border border-gray-100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-phone">Phone Number</Label>
            <Input
              id="company-phone"
              placeholder="Phone Number"
              value={formData.phone || ''}
              onChange={onChange}
              className="bg-white shadow-md rounded-xl border border-gray-100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-jobTitle">Job Title</Label>
            <Input
              id="company-jobTitle"
              placeholder="Job Title"
              value={formData.jobTitle || ''}
              onChange={onChange}
              className="bg-white shadow-md rounded-xl border border-gray-100"
            />
          </div>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={isSaving}
              className="bg-esm-blue-600 hover:bg-esm-blue-700 text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
