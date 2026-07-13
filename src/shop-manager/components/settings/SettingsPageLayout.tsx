
import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SettingsPageHeader } from "./SettingsPageHeader";
import { SettingsLoadingState } from "./SettingsLoadingState";

interface SettingsPageLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultTab?: string;
  isLoading?: boolean;
  loadingMessage?: string;
  showBackButton?: boolean;
  backPath?: string;
}

export const SettingsPageLayout: React.FC<SettingsPageLayoutProps> = ({ 
  title, 
  description, 
  children,
  defaultTab,
  isLoading = false,
  loadingMessage,
  showBackButton = true,
  backPath = "/settings"
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If there's a tab parameter in the URL, and we have a defaultTab, append it to the URL
    if (defaultTab && !location.search.includes('tab=')) {
      const searchParams = new URLSearchParams(location.search);
      searchParams.set('tab', defaultTab);
      navigate(`${location.pathname}?${searchParams.toString()}`, { replace: true });
    }
  }, [location, navigate, defaultTab]);

  return (
    <main className="w-full px-4 py-8" aria-labelledby="settings-page-title">
      <SettingsPageHeader
        title={title}
        description={description}
        showBackButton={showBackButton}
        backPath={backPath}
      />

      <section className="mt-6" aria-busy={isLoading ? true : undefined}>
        {isLoading ? (
          <SettingsLoadingState message={loadingMessage} />
        ) : (
          children
        )}
      </section>
    </main>
  );
};
