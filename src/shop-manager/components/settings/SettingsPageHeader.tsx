
import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { 
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';

interface SettingsPageHeaderProps {
  title: string;
  description?: string;
  showBackButton?: boolean;
  backPath?: string;
}

export const SettingsPageHeader: React.FC<SettingsPageHeaderProps> = ({
  title,
  description,
  showBackButton = true,
  backPath = '/settings'
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we're on the main settings index page
  const isSettingsIndex = location.pathname === '/settings' || location.pathname === '/settings/';

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          {isSettingsIndex ? (
            <BreadcrumbItem>
              <BreadcrumbPage>Settings</BreadcrumbPage>
            </BreadcrumbItem>
          ) : (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/settings">Settings</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between my-6">
        <div>
          {showBackButton && !isSettingsIndex && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="mb-2 sm:mb-0" 
              onClick={() => navigate(backPath)}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Settings
            </Button>
          )}
          <h1 id="settings-page-title" className="text-2xl font-bold">{title}</h1>
          {description && <p className="text-muted-foreground mt-1">{description}</p>}
        </div>
      </div>
    </>
  );
};
