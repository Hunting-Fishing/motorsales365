import React from 'react';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useCompanyInfo } from '@/hooks/useCompanyInfo';
import { useCompany } from '@/contexts/CompanyContext';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { teamDataService } from '@/services/team/teamDataService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, Phone, Mail, Clock, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function CompanyProfilePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthUser();
  const { companyInfo, loading } = useCompanyInfo();
  const { businessHours } = useCompany();
  const { teamMembers, isLoading: teamLoading } = useTeamMembers();
  const [departmentCount, setDepartmentCount] = useState(0);

  useEffect(() => {
    const fetchDepartmentCount = async () => {
      try {
        const departments = await teamDataService.getDepartments();
        setDepartmentCount(departments.length);
      } catch (error) {
        console.error('Failed to fetch departments:', error);
      }
    };
    fetchDepartmentCount();
  }, []);

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  const getDayName = (dayIndex: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayIndex];
  };

  const activeMembers = teamMembers.filter(member => member.status === 'Active').length;

  if (authLoading || loading || teamLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Company Profile</h1>
        <Link to="/settings?tab=company">
          <Button>Edit Profile</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Company Name</label>
              <p className="text-lg">{companyInfo?.name || 'Not set'}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Business Type</label>
              <p>{companyInfo?.business_type || 'Not specified'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Industry</label>
              <p>{companyInfo?.industry || 'Not specified'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Tax ID</label>
              <p>{companyInfo?.tax_id || 'Not set'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{companyInfo?.phone || 'Not set'}</span>
            </div>

            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{companyInfo?.email || 'Not set'}</span>
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p>{companyInfo?.address || 'Not set'}</p>
                {companyInfo?.city && companyInfo?.state && (
                  <p>{companyInfo.city}, {companyInfo.state}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Business Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {businessHours && businessHours.length > 0 ? (
                businessHours
                  .sort((a: any, b: any) => a.day_of_week - b.day_of_week)
                  .map((dayHours: any) => (
                    <div key={dayHours.day_of_week} className="flex justify-between items-center">
                      <span className="font-medium">{getDayName(dayHours.day_of_week)}</span>
                      <span className="text-muted-foreground">
                        {dayHours.is_closed ? (
                          'Closed'
                        ) : (
                          `${formatTime(dayHours.open_time)} - ${formatTime(dayHours.close_time)}`
                        )}
                      </span>
                    </div>
                  ))
              ) : (
                <p className="text-muted-foreground">Business hours not configured</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Total Team Members</span>
              <span className="font-semibold">{teamMembers.length}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span>Active Members</span>
              <span className="font-semibold text-green-600">{activeMembers}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span>Departments</span>
              <span className="font-semibold">{departmentCount}</span>
            </div>

            <Link to="/team">
              <Button variant="outline" className="w-full">
                Manage Team
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/settings?tab=company">
              <Button variant="outline" className="w-full">
                Basic Information
              </Button>
            </Link>
            
            <Link to="/settings?tab=branding">
              <Button variant="outline" className="w-full">
                Branding & Appearance
              </Button>
            </Link>
            
            <Link to="/settings?tab=team">
              <Button variant="outline" className="w-full">
                Team Management
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}