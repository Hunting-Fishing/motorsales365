import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Globe, Users, FileText, Eye, Settings, Heart, Gift, HandHeart } from "lucide-react";

export function PublicPortalTab() {
  return (
    <div className="space-y-6">
      {/* Portal Overview Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portal Visitors</CardTitle>
            <Eye className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">2,847</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <FileText className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">47</div>
            <p className="text-xs text-muted-foreground">Pending review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Raffles</CardTitle>
            <Gift className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">3</div>
            <p className="text-xs text-muted-foreground">Public raffles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volunteers</CardTitle>
            <Users className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">23</div>
            <p className="text-xs text-muted-foreground">New this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Portal Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Portal Configuration</CardTitle>
          <CardDescription>
            Configure your public-facing portal settings and features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="portal-enabled">Public Portal</Label>
                <p className="text-sm text-muted-foreground">
                  Enable public access to your organization's portal
                </p>
              </div>
              <Switch id="portal-enabled" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="applications-enabled">Application Forms</Label>
                <p className="text-sm text-muted-foreground">
                  Allow public to submit assistance applications
                </p>
              </div>
              <Switch id="applications-enabled" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="raffles-enabled">Raffle Section</Label>
                <p className="text-sm text-muted-foreground">
                  Display current raffles and ticket sales
                </p>
              </div>
              <Switch id="raffles-enabled" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="gallery-enabled">Success Gallery</Label>
                <p className="text-sm text-muted-foreground">
                  Showcase before/after photos and success stories
                </p>
              </div>
              <Switch id="gallery-enabled" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="volunteer-signup">Volunteer Registration</Label>
                <p className="text-sm text-muted-foreground">
                  Enable online volunteer application and signup
                </p>
              </div>
              <Switch id="volunteer-signup" defaultChecked />
            </div>
          </div>

          <div className="flex gap-2">
            <Button>
              <Globe className="h-4 w-4 mr-2" />
              View Public Portal
            </Button>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Advanced Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Application Management */}
      <Card>
        <CardHeader>
          <CardTitle>Public Applications</CardTitle>
          <CardDescription>
            Review and manage applications submitted through your portal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {/* Sample Application Entries */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="font-semibold">Youth Tool Kit Request</h4>
                  <p className="text-sm text-muted-foreground">
                    Marcus Johnson - High school student interested in automotive
                  </p>
                </div>
                <Badge>Pending</Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>Application submitted</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Age: 17</span>
                </div>
                <div className="flex items-center gap-2">
                  <HandHeart className="h-4 w-4 text-muted-foreground" />
                  <span>Need level: High</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Submitted: 2 days ago</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm">Review Application</Button>
                <Button size="sm" variant="outline">Contact Applicant</Button>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="font-semibold">Vehicle Donation Offer</h4>
                  <p className="text-sm text-muted-foreground">
                    Sarah Mitchell - 1998 Honda Civic in fair condition
                  </p>
                </div>
                <Badge variant="secondary">Under Review</Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>Donation offer</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Est. value: $3,500</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Condition: Fair</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Submitted: 5 days ago</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm">Schedule Inspection</Button>
                <Button size="sm" variant="outline">View Details</Button>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="font-semibold">Volunteer Application</h4>
                  <p className="text-sm text-muted-foreground">
                    David Chen - Experienced mechanic looking to help
                  </p>
                </div>
                <Badge variant="default">Approved</Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Volunteer</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Experience: 15 years</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Availability: Weekends</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Background check: ✓</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm">Add to Team</Button>
                <Button size="sm" variant="outline">Send Welcome Kit</Button>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline">View All Applications</Button>
            <Button variant="outline">Application Analytics</Button>
            <Button variant="outline">Export Data</Button>
          </div>
        </CardContent>
      </Card>

      {/* Portal Content Management */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Content Management</CardTitle>
            <CardDescription>
              Manage your portal's public content and messaging
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium mb-1">Organization Info</h4>
                <p className="text-sm text-muted-foreground">Name, tagline, and description</p>
                <Button size="sm" variant="outline" className="mt-2">Edit Info</Button>
              </div>

              <div className="p-3 border rounded-lg">
                <h4 className="font-medium mb-1">Hero Section</h4>
                <p className="text-sm text-muted-foreground">Main banner and call-to-action</p>
                <Button size="sm" variant="outline" className="mt-2">Update Banner</Button>
              </div>

              <div className="p-3 border rounded-lg">
                <h4 className="font-medium mb-1">Success Stories</h4>
                <p className="text-sm text-muted-foreground">Project highlights and testimonials</p>
                <Button size="sm" variant="outline" className="mt-2">Manage Stories</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SEO & Analytics</CardTitle>
            <CardDescription>
              Monitor portal performance and search visibility
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Monthly Visitors</span>
                <span className="font-semibold">2,847</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Page Views</span>
                <span>8,432</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Conversion Rate</span>
                <span className="text-green-600">3.2%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Avg. Session</span>
                <span>4:32 min</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline">View Analytics</Button>
              <Button size="sm" variant="outline">SEO Settings</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}